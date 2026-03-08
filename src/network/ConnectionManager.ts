/**
 * Connection Manager
 * Manages connections across multiple transport types
 */

import { EventEmitter } from 'events';
import {
  Connection,
  Peer,
  TransportType,
  ConnectionQuality,
  NetworkCapability,
  NetworkError
} from '../../types';
import { meshNetwork } from '../mesh/MeshNetwork';

export class ConnectionManager extends EventEmitter {
  private connections: Map<string, Connection> = new Map();
  private transportPriority: TransportType[] = [
    'bluetooth-le',
    'bluetooth-classic',
    'wifi-direct',
    'lan',
    'webrtc',
    'relay',
  ];
  private maxConnections: number = 50;
  private connectionHealthInterval: NodeJS.Timeout | null = null;

  constructor() {
    super();
  }

  /**
   * Start connection manager
   */
  start(): void {
    // Start monitoring connection health
    this.connectionHealthInterval = setInterval(() => {
      this.monitorConnectionHealth();
    }, 10000); // 10 seconds
  }

  /**
   * Stop connection manager
   */
  stop(): void {
    if (this.connectionHealthInterval) {
      clearInterval(this.connectionHealthInterval);
      this.connectionHealthInterval = null;
    }

    // Disconnect all
    this.connections.forEach((connection) => {
      this.disconnect(connection.peerId);
    });
  }

  /**
   * Connect to peer
   */
  async connect(peer: Peer): Promise<Connection> {
    try {
      // Check if already connected
      const existing = this.getConnectionToPeer(peer.id);
      if (existing && existing.status === 'connected') {
        return existing;
      }

      // Check max connections
      if (this.connections.size >= this.maxConnections) {
        throw new NetworkError(
          'Maximum connections reached',
          'MAX_CONNECTIONS'
        );
      }

      // Select best transport
      const transport = this.selectBestTransport(peer);
      if (!transport) {
        throw new NetworkError(
          'No compatible transport available',
          'NO_TRANSPORT'
        );
      }

      // Create connection
      const connection: Connection = {
        id: `${peer.id}-${transport}-${Date.now()}`,
        peerId: peer.id,
        transport,
        status: 'connecting',
        quality: {
          signalStrength: 0,
          latency: 0,
          bandwidth: 0,
          reliability: 0,
          batteryImpact: 0,
        },
        createdAt: Date.now(),
        lastActivity: Date.now(),
      };

      this.connections.set(connection.id, connection);

      // Establish connection
      await this.establishConnection(connection, peer);

      // Update status
      connection.status = 'connected';
      connection.lastActivity = Date.now();

      // Add to mesh network
      const selfId = Array.from(meshNetwork.getAllNodes())[0]?.id;
      if (selfId) {
        meshNetwork.addConnection(selfId, peer.id, connection);
      }

      this.emit('connection-established', connection);
      return connection;
    } catch (error) {
      throw new NetworkError(
        'Failed to connect to peer',
        'CONNECT_ERROR',
        error
      );
    }
  }

  /**
   * Disconnect from peer
   */
  disconnect(peerId: string): void {
    const connections = this.getConnectionsToPeer(peerId);

    connections.forEach((connection) => {
      connection.status = 'disconnected';
      this.connections.delete(connection.id);

      // Remove from mesh
      const selfId = Array.from(meshNetwork.getAllNodes())[0]?.id;
      if (selfId) {
        meshNetwork.removeConnection(selfId, peerId);
      }

      this.emit('connection-closed', connection);
    });
  }

  /**
   * Select best transport for peer
   */
  selectBestTransport(peer: Peer): TransportType | null {
    // Get available capabilities from peer
    const peerCapabilities = peer.identity.networkCapabilities;

    // Find first compatible transport in priority order
    for (const transport of this.transportPriority) {
      const capability = peerCapabilities.find((cap) => cap.type === transport);
      if (capability && capability.available) {
        return transport;
      }
    }

    return null;
  }

  /**
   * Establish connection via transport
   */
  private async establishConnection(
    connection: Connection,
    peer: Peer
  ): Promise<void> {
    // TODO: Implement actual transport-specific connection logic
    // For now, simulate connection
    await this.simulateConnection(connection, peer);
  }

  /**
   * Simulate connection establishment
   */
  private async simulateConnection(
    connection: Connection,
    peer: Peer
  ): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => {
        // Simulate connection quality measurement
        connection.quality = this.measureConnectionQuality(connection, peer);
        resolve();
      }, 100);
    });
  }

  /**
   * Measure connection quality
   */
  private measureConnectionQuality(
    connection: Connection,
    peer: Peer
  ): ConnectionQuality {
    // Get peer's capability for this transport
    const capability = peer.identity.networkCapabilities.find(
      (cap) => cap.type === connection.transport
    );

    const strength = capability?.strength || 50;

    // Estimate quality based on transport type and signal strength
    return {
      signalStrength: strength,
      latency: this.estimateLatency(connection.transport, strength),
      bandwidth: this.estimateBandwidth(connection.transport, strength),
      reliability: strength / 100,
      batteryImpact: this.estimateBatteryImpact(connection.transport),
    };
  }

  /**
   * Estimate latency based on transport
   */
  private estimateLatency(transport: TransportType, strength: number): number {
    const baseLatency: Record<TransportType, number> = {
      'bluetooth-le': 50,
      'bluetooth-classic': 40,
      'wifi-direct': 20,
      lan: 10,
      webrtc: 100,
      relay: 200,
    };

    const base = baseLatency[transport] || 100;
    const factor = (100 - strength) / 100;
    return base + base * factor;
  }

  /**
   * Estimate bandwidth based on transport
   */
  private estimateBandwidth(transport: TransportType, strength: number): number {
    const baseBandwidth: Record<TransportType, number> = {
      'bluetooth-le': 100000, // 100 KB/s
      'bluetooth-classic': 300000, // 300 KB/s
      'wifi-direct': 5000000, // 5 MB/s
      lan: 10000000, // 10 MB/s
      webrtc: 1000000, // 1 MB/s
      relay: 500000, // 500 KB/s
    };

    const base = baseBandwidth[transport] || 100000;
    return base * (strength / 100);
  }

  /**
   * Estimate battery impact
   */
  private estimateBatteryImpact(transport: TransportType): number {
    const impact: Record<TransportType, number> = {
      'bluetooth-le': 20,
      'bluetooth-classic': 40,
      'wifi-direct': 60,
      lan: 30,
      webrtc: 50,
      relay: 45,
    };

    return impact[transport] || 50;
  }

  /**
   * Monitor connection health
   */
  monitorConnectionHealth(): void {
    const now = Date.now();
    const timeout = 30000; // 30 seconds

    const staleConnections: string[] = [];

    this.connections.forEach((connection, connectionId) => {
      if (now - connection.lastActivity > timeout) {
        staleConnections.push(connectionId);
      }
    });

    // Remove stale connections
    staleConnections.forEach((connectionId) => {
      const connection = this.connections.get(connectionId);
      if (connection) {
        this.disconnect(connection.peerId);
      }
    });

    this.emit('health-check', {
      active: this.connections.size,
      removed: staleConnections.length,
    });
  }

  /**
   * Update connection activity
   */
  updateActivity(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.lastActivity = Date.now();
    }
  }

  /**
   * Get connection by ID
   */
  getConnection(connectionId: string): Connection | null {
    return this.connections.get(connectionId) || null;
  }

  /**
   * Get all connections to a peer
   */
  getConnectionsToPeer(peerId: string): Connection[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.peerId === peerId
    );
  }

  /**
   * Get primary connection to peer
   */
  getConnectionToPeer(peerId: string): Connection | null {
    const connections = this.getConnectionsToPeer(peerId);
    return connections.length > 0 ? connections[0] : null;
  }

  /**
   * Get all connections
   */
  getAllConnections(): Connection[] {
    return Array.from(this.connections.values());
  }

  /**
   * Get active connection count
   */
  getConnectionCount(): number {
    return this.connections.size;
  }

  /**
   * Check if connected to peer
   */
  isConnected(peerId: string): boolean {
    const connection = this.getConnectionToPeer(peerId);
    return connection !== null && connection.status === 'connected';
  }

  /**
   * Set transport priority
   */
  setTransportPriority(priority: TransportType[]): void {
    this.transportPriority = priority;
  }

  /**
   * Get transport priority
   */
  getTransportPriority(): TransportType[] {
    return [...this.transportPriority];
  }

  /**
   * Get connections by transport type
   */
  getConnectionsByTransport(transport: TransportType): Connection[] {
    return Array.from(this.connections.values()).filter(
      (conn) => conn.transport === transport
    );
  }

  /**
   * Clear all connections
   */
  clearAll(): void {
    this.connections.forEach((connection) => {
      this.disconnect(connection.peerId);
    });
    this.connections.clear();
  }
}

// Singleton instance
export const connectionManager = new ConnectionManager();
