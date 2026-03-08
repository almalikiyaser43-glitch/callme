/**
 * Mesh Network Layer
 * Self-organizing, self-healing mesh network management
 */

import { EventEmitter } from 'events';
import {
  MeshNode,
  NetworkTopology,
  NetworkEdge,
  Peer,
  Connection,
  NetworkError,
  TransportType,
  ConnectionQuality
} from '../../types';
import { routingEngine } from '../routing/RoutingEngine';

export class MeshNetwork extends EventEmitter {
  private nodes: Map<string, MeshNode> = new Map();
  private topology: NetworkTopology;
  private healingInterval: NodeJS.Timeout | null = null;
  private topologyUpdateInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.topology = {
      nodes: new Map(),
      edges: [],
      partitions: [],
      lastUpdated: Date.now(),
    };
  }

  /**
   * Start mesh network management
   */
  start(): void {
    // Start periodic topology updates
    this.topologyUpdateInterval = setInterval(() => {
      this.updateTopology();
    }, 10000); // 10 seconds

    // Start self-healing
    this.healingInterval = setInterval(() => {
      this.healNetwork();
    }, 30000); // 30 seconds
  }

  /**
   * Stop mesh network management
   */
  stop(): void {
    if (this.topologyUpdateInterval) {
      clearInterval(this.topologyUpdateInterval);
      this.topologyUpdateInterval = null;
    }
    if (this.healingInterval) {
      clearInterval(this.healingInterval);
      this.healingInterval = null;
    }
  }

  /**
   * Add node to mesh
   */
  addNode(peer: Peer): void {
    const meshNode: MeshNode = {
      ...peer,
      routes: [],
      neighbors: [],
      capabilities: peer.identity.networkCapabilities,
      reputation: peer.identity.reputation,
    };

    this.nodes.set(meshNode.id, meshNode);
    this.topology.nodes.set(meshNode.id, meshNode);

    this.updateTopology();
    this.emit('node-added', meshNode);
  }

  /**
   * Remove node from mesh
   */
  removeNode(nodeId: string): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    this.nodes.delete(nodeId);
    this.topology.nodes.delete(nodeId);

    // Remove edges connected to this node
    this.topology.edges = this.topology.edges.filter(
      (edge) => edge.from !== nodeId && edge.to !== nodeId
    );

    this.updateTopology();
    this.emit('node-removed', nodeId);
  }

  /**
   * Update node in mesh
   */
  updateNode(nodeId: string, updates: Partial<MeshNode>): void {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    Object.assign(node, updates);
    this.topology.nodes.set(nodeId, node);

    this.emit('node-updated', node);
  }

  /**
   * Add connection between nodes
   */
  addConnection(
    fromId: string,
    toId: string,
    connection: Connection
  ): void {
    const fromNode = this.nodes.get(fromId);
    const toNode = this.nodes.get(toId);

    if (!fromNode || !toNode) return;

    // Add to neighbors
    if (!fromNode.neighbors.includes(toId)) {
      fromNode.neighbors.push(toId);
    }
    if (!toNode.neighbors.includes(fromId)) {
      toNode.neighbors.push(fromId);
    }

    // Add edge to topology
    const existingEdge = this.topology.edges.find(
      (e) =>
        (e.from === fromId && e.to === toId) ||
        (e.from === toId && e.to === fromId)
    );

    if (!existingEdge) {
      const edge: NetworkEdge = {
        from: fromId,
        to: toId,
        weight: this.calculateEdgeWeight(connection.quality),
        transport: connection.transport,
        quality: connection.quality,
      };
      this.topology.edges.push(edge);
    }

    this.updateTopology();
    this.emit('connection-added', { from: fromId, to: toId, connection });
  }

  /**
   * Remove connection between nodes
   */
  removeConnection(fromId: string, toId: string): void {
    const fromNode = this.nodes.get(fromId);
    const toNode = this.nodes.get(toId);

    if (fromNode) {
      fromNode.neighbors = fromNode.neighbors.filter((id) => id !== toId);
    }
    if (toNode) {
      toNode.neighbors = toNode.neighbors.filter((id) => id !== fromId);
    }

    // Remove edge
    this.topology.edges = this.topology.edges.filter(
      (edge) =>
        !((edge.from === fromId && edge.to === toId) ||
          (edge.from === toId && edge.to === fromId))
    );

    this.updateTopology();
    this.emit('connection-removed', { from: fromId, to: toId });
  }

  /**
   * Update network topology
   */
  updateTopology(): void {
    // Detect network partitions
    this.detectPartitions();

    // Update timestamp
    this.topology.lastUpdated = Date.now();

    // Recalculate routes
    this.recalculateRoutes();

    this.emit('topology-updated', this.topology);
  }

  /**
   * Detect network partitions
   */
  private detectPartitions(): void {
    const visited = new Set<string>();
    const partitions: string[][] = [];

    this.nodes.forEach((node, nodeId) => {
      if (!visited.has(nodeId)) {
        const partition = this.explorePartition(nodeId, visited);
        partitions.push(partition);
      }
    });

    this.topology.partitions = partitions;
  }

  /**
   * Explore network partition using DFS
   */
  private explorePartition(startId: string, visited: Set<string>): string[] {
    const partition: string[] = [];
    const stack: string[] = [startId];

    while (stack.length > 0) {
      const nodeId = stack.pop()!;

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      partition.push(nodeId);

      const node = this.nodes.get(nodeId);
      if (node) {
        node.neighbors.forEach((neighborId) => {
          if (!visited.has(neighborId)) {
            stack.push(neighborId);
          }
        });
      }
    }

    return partition;
  }

  /**
   * Recalculate routes for all destinations
   */
  private recalculateRoutes(): void {
    this.nodes.forEach((node) => {
      const route = routingEngine.findRoute(node.id, this.topology);
      if (route) {
        node.routes = [route];
      }
    });
  }

  /**
   * Heal network - detect and fix issues
   */
  healNetwork(): void {
    const now = Date.now();
    const maxAge = 60000; // 60 seconds

    // Remove stale nodes
    const staleNodes: string[] = [];
    this.nodes.forEach((node, nodeId) => {
      if (now - node.lastSeen > maxAge) {
        staleNodes.push(nodeId);
      }
    });

    staleNodes.forEach((nodeId) => {
      this.removeNode(nodeId);
    });

    // Check for isolated nodes
    this.nodes.forEach((node) => {
      if (node.neighbors.length === 0 && !node.isRelay) {
        this.emit('node-isolated', node);
      }
    });

    // Update routes for affected nodes
    if (staleNodes.length > 0) {
      this.updateTopology();
    }

    this.emit('network-healed', {
      removedNodes: staleNodes.length,
      timestamp: now,
    });
  }

  /**
   * Calculate edge weight based on connection quality
   */
  private calculateEdgeWeight(quality: ConnectionQuality): number {
    // Lower weight = better connection
    const latencyScore = Math.min(quality.latency / 100, 10);
    const reliabilityScore = (1 - quality.reliability) * 10;
    const signalScore = (100 - quality.signalStrength) / 10;

    return latencyScore + reliabilityScore + signalScore;
  }

  /**
   * Get node by ID
   */
  getNode(nodeId: string): MeshNode | null {
    return this.nodes.get(nodeId) || null;
  }

  /**
   * Get all nodes
   */
  getAllNodes(): MeshNode[] {
    return Array.from(this.nodes.values());
  }

  /**
   * Get topology
   */
  getTopology(): NetworkTopology {
    return this.topology;
  }

  /**
   * Get network partitions
   */
  getPartitions(): string[][] {
    return this.topology.partitions;
  }

  /**
   * Check if network is partitioned
   */
  isPartitioned(): boolean {
    return this.topology.partitions.length > 1;
  }

  /**
   * Get node count
   */
  getNodeCount(): number {
    return this.nodes.size;
  }

  /**
   * Get edge count
   */
  getEdgeCount(): number {
    return this.topology.edges.length;
  }

  /**
   * Get network diameter (maximum distance between any two nodes)
   */
  getNetworkDiameter(): number {
    let maxDistance = 0;

    this.nodes.forEach((node1) => {
      this.nodes.forEach((node2) => {
        if (node1.id !== node2.id) {
          const distance = this.calculateDistance(node1.id, node2.id);
          maxDistance = Math.max(maxDistance, distance);
        }
      });
    });

    return maxDistance;
  }

  /**
   * Calculate distance between two nodes
   */
  private calculateDistance(from: string, to: string): number {
    const visited = new Set<string>();
    const queue: { nodeId: string; distance: number }[] = [
      { nodeId: from, distance: 0 },
    ];

    while (queue.length > 0) {
      const { nodeId, distance } = queue.shift()!;

      if (nodeId === to) {
        return distance;
      }

      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = this.nodes.get(nodeId);
      if (node) {
        node.neighbors.forEach((neighborId) => {
          if (!visited.has(neighborId)) {
            queue.push({ nodeId: neighborId, distance: distance + 1 });
          }
        });
      }
    }

    return Infinity; // Not reachable
  }

  /**
   * Find relay nodes (highly connected nodes)
   */
  findRelayNodes(minConnections: number = 3): MeshNode[] {
    return this.getAllNodes().filter(
      (node) => node.neighbors.length >= minConnections
    );
  }

  /**
   * Clear mesh network
   */
  clear(): void {
    this.nodes.clear();
    this.topology = {
      nodes: new Map(),
      edges: [],
      partitions: [],
      lastUpdated: Date.now(),
    };
    this.emit('network-cleared');
  }
}

// Singleton instance
export const meshNetwork = new MeshNetwork();
