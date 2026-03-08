/**
 * Network Monitor Dashboard
 * Real-time network visualization and monitoring
 */

import {
  NetworkGraph,
  NetworkHealth,
  NetworkMetrics,
  MeshNode,
  NetworkTopology,
  GraphNode,
  GraphEdge,
  Route
} from '../../types';
import { meshNetwork } from '../../network/mesh/MeshNetwork';
import { connectionManager } from '../../network/ConnectionManager';
import { routingEngine } from '../../network/routing/RoutingEngine';

export class NetworkMonitor {
  /**
   * Visualize network topology as graph
   */
  visualizeTopology(): NetworkGraph {
    const topology = meshNetwork.getTopology();
    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];

    // Convert mesh nodes to graph nodes
    topology.nodes.forEach((meshNode, nodeId) => {
      const node: GraphNode = {
        id: nodeId,
        label: this.getNodeLabel(meshNode),
        type: meshNode.isRelay ? 'relay' : 'peer',
        online: Date.now() - meshNode.lastSeen < 60000,
        reputation: meshNode.reputation,
      };
      nodes.push(node);
    });

    // Convert topology edges to graph edges
    topology.edges.forEach((edge) => {
      const graphEdge: GraphEdge = {
        from: edge.from,
        to: edge.to,
        transport: edge.transport,
        quality: edge.quality.signalStrength,
        latency: edge.quality.latency,
      };
      edges.push(graphEdge);
    });

    return { nodes, edges };
  }

  /**
   * Get active connections
   */
  showActiveConnections(): any[] {
    const connections = connectionManager.getAllConnections();

    return connections.map((conn) => ({
      id: conn.id,
      peerId: conn.peerId,
      transport: conn.transport,
      status: conn.status,
      quality: {
        signalStrength: conn.quality.signalStrength,
        latency: conn.quality.latency,
        reliability: conn.quality.reliability,
      },
      uptime: Date.now() - conn.createdAt,
      lastActivity: Date.now() - conn.lastActivity,
    }));
  }

  /**
   * Display routes to destination
   */
  displayRoutes(destination: string): any[] {
    const routes = routingEngine.getRoutes(destination);

    return routes.map((route) => ({
      destination: route.destination,
      hops: route.hops,
      hopCount: route.hops.length,
      estimatedLatency: route.estimatedLatency,
      reliability: route.reliability,
      successRate: this.calculateSuccessRate(route),
      lastUsed: route.lastUsed,
    }));
  }

  /**
   * Monitor network health
   */
  monitorHealth(): NetworkHealth {
    const topology = meshNetwork.getTopology();
    const connections = connectionManager.getAllConnections();

    const averageLatency = this.calculateAverageLatency(connections);
    const deliveryRate = this.estimateDeliveryRate(topology);

    return {
      nodeCount: topology.nodes.size,
      activeConnections: connections.length,
      averageLatency,
      messageDeliveryRate: deliveryRate,
      networkPartitions: topology.partitions.length,
      timestamp: Date.now(),
    };
  }

  /**
   * Export network metrics
   */
  exportMetrics(): NetworkMetrics {
    const health = this.monitorHealth();
    const connections = connectionManager.getAllConnections();

    return {
      totalMessages: 0, // Would be tracked elsewhere
      messagesDelivered: 0,
      messagesFailed: 0,
      averageHops: this.calculateAverageHops(),
      averageLatency: health.averageLatency,
      peakThroughput: this.calculatePeakThroughput(connections),
      activePeers: health.nodeCount,
      uptime: 0, // Would be tracked elsewhere
    };
  }

  /**
   * Get network statistics
   */
  getStatistics(): any {
    const topology = meshNetwork.getTopology();
    const connections = connectionManager.getAllConnections();
    const health = this.monitorHealth();

    return {
      totalNodes: topology.nodes.size,
      totalEdges: topology.edges.length,
      activeConnections: connections.length,
      networkDiameter: meshNetwork.getNetworkDiameter(),
      partitions: topology.partitions.length,
      averageLatency: health.averageLatency,
      deliveryRate: health.messageDeliveryRate,
      timestamp: Date.now(),
    };
  }

  /**
   * Get node details
   */
  getNodeDetails(nodeId: string): any {
    const node = meshNetwork.getNode(nodeId);
    if (!node) {
      return null;
    }

    const connections = connectionManager.getConnectionsToPeer(nodeId);

    return {
      id: node.id,
      identity: {
        userId: node.identity.userId,
        publicKey: node.identity.publicKey,
        deviceFingerprint: node.identity.deviceFingerprint,
      },
      reputation: node.reputation,
      isRelay: node.isRelay,
      capabilities: node.capabilities,
      neighbors: node.neighbors,
      connections: connections.map((c) => ({
        transport: c.transport,
        quality: c.quality,
      })),
      routes: node.routes.length,
      lastSeen: node.lastSeen,
      online: Date.now() - node.lastSeen < 60000,
    };
  }

  /**
   * Get network topology summary
   */
  getTopologySummary(): any {
    const topology = meshNetwork.getTopology();

    return {
      totalNodes: topology.nodes.size,
      totalEdges: topology.edges.length,
      partitions: topology.partitions.length,
      relayNodes: meshNetwork.findRelayNodes().length,
      lastUpdated: topology.lastUpdated,
      isPartitioned: meshNetwork.isPartitioned(),
    };
  }

  /**
   * Get transport statistics
   */
  getTransportStatistics(): any {
    const connections = connectionManager.getAllConnections();
    const stats: any = {};

    connections.forEach((conn) => {
      const transport = conn.transport;
      if (!stats[transport]) {
        stats[transport] = {
          count: 0,
          avgLatency: 0,
          avgSignalStrength: 0,
          totalLatency: 0,
          totalSignalStrength: 0,
        };
      }

      stats[transport].count++;
      stats[transport].totalLatency += conn.quality.latency;
      stats[transport].totalSignalStrength += conn.quality.signalStrength;
    });

    // Calculate averages
    Object.keys(stats).forEach((transport) => {
      const s = stats[transport];
      s.avgLatency = s.totalLatency / s.count;
      s.avgSignalStrength = s.totalSignalStrength / s.count;
      delete s.totalLatency;
      delete s.totalSignalStrength;
    });

    return stats;
  }

  /**
   * Generate network report
   */
  generateReport(): string {
    const health = this.monitorHealth();
    const stats = this.getStatistics();
    const transportStats = this.getTransportStatistics();

    const report = `
=== CallMe X Network Report ===
Generated: ${new Date().toISOString()}

Network Health:
- Nodes: ${health.nodeCount}
- Active Connections: ${health.activeConnections}
- Network Partitions: ${health.networkPartitions}
- Average Latency: ${health.averageLatency.toFixed(2)}ms
- Message Delivery Rate: ${(health.messageDeliveryRate * 100).toFixed(2)}%

Topology:
- Total Edges: ${stats.totalEdges}
- Network Diameter: ${stats.networkDiameter}

Transport Statistics:
${Object.entries(transportStats)
  .map(
    ([transport, data]: [string, any]) => `
- ${transport}:
  Connections: ${data.count}
  Avg Latency: ${data.avgLatency.toFixed(2)}ms
  Avg Signal: ${data.avgSignalStrength.toFixed(2)}%`
  )
  .join('\n')}

===============================
    `.trim();

    return report;
  }

  /**
   * Export topology as JSON
   */
  exportTopologyJSON(): string {
    const graph = this.visualizeTopology();
    return JSON.stringify(graph, null, 2);
  }

  /**
   * Export topology as DOT format (Graphviz)
   */
  exportTopologyDOT(): string {
    const graph = this.visualizeTopology();

    let dot = 'digraph CallMeX {\n';
    dot += '  rankdir=LR;\n';
    dot += '  node [shape=circle];\n\n';

    // Add nodes
    graph.nodes.forEach((node) => {
      const color = node.online ? 'green' : 'red';
      const shape = node.type === 'relay' ? 'doublecircle' : 'circle';
      dot += `  "${node.id}" [label="${node.label}", color="${color}", shape="${shape}"];\n`;
    });

    dot += '\n';

    // Add edges
    graph.edges.forEach((edge) => {
      const label = `${edge.transport}\\n${edge.latency}ms`;
      const color = edge.quality > 70 ? 'green' : edge.quality > 40 ? 'orange' : 'red';
      dot += `  "${edge.from}" -> "${edge.to}" [label="${label}", color="${color}"];\n`;
    });

    dot += '}\n';

    return dot;
  }

  /**
   * Helper: Get node label
   */
  private getNodeLabel(node: MeshNode): string {
    return node.id.substring(0, 8);
  }

  /**
   * Helper: Calculate success rate
   */
  private calculateSuccessRate(route: Route): number {
    const total = route.successCount + route.failureCount;
    if (total === 0) return 0;
    return route.successCount / total;
  }

  /**
   * Helper: Calculate average latency
   */
  private calculateAverageLatency(connections: any[]): number {
    if (connections.length === 0) return 0;
    const total = connections.reduce((sum, conn) => sum + conn.quality.latency, 0);
    return total / connections.length;
  }

  /**
   * Helper: Estimate delivery rate
   */
  private estimateDeliveryRate(topology: NetworkTopology): number {
    // Simple estimation based on network connectivity
    const connectivity = topology.edges.length / Math.max(topology.nodes.size, 1);
    return Math.min(connectivity / 3, 1.0);
  }

  /**
   * Helper: Calculate average hops
   */
  private calculateAverageHops(): number {
    const routes = routingEngine.getRoutingTable();
    let totalHops = 0;
    let count = 0;

    routes.routes.forEach((routeList) => {
      routeList.forEach((route) => {
        totalHops += route.hops.length;
        count++;
      });
    });

    return count > 0 ? totalHops / count : 0;
  }

  /**
   * Helper: Calculate peak throughput
   */
  private calculatePeakThroughput(connections: any[]): number {
    if (connections.length === 0) return 0;
    return Math.max(...connections.map((c) => c.quality.bandwidth || 0));
  }
}

// Singleton instance
export const networkMonitor = new NetworkMonitor();
