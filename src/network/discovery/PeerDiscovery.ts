/**
 * Peer Discovery Layer
 * Discovers peers using multiple transport methods
 */

import { EventEmitter } from 'events';
import {
  Peer,
  PublicIdentity,
  DiscoveryMessage,
  TransportType,
  NetworkError
} from '../../types';
import { identityManager } from '../../security/identity/IdentityManager';
import { cryptoService } from '../../security/crypto/CryptoService';

export class PeerDiscovery extends EventEmitter {
  private discoveredPeers: Map<string, Peer> = new Map();
  private discoveryInterval: NodeJS.Timeout | null = null;
  private discoveryIntervalMs: number = 5000; // 5 seconds

  constructor() {
    super();
  }

  /**
   * Start continuous peer discovery
   */
  start(): void {
    if (this.discoveryInterval) {
      return; // Already running
    }

    // Initial discovery
    this.discoverAll();

    // Periodic discovery
    this.discoveryInterval = setInterval(() => {
      this.discoverAll();
    }, this.discoveryIntervalMs);
  }

  /**
   * Stop peer discovery
   */
  stop(): void {
    if (this.discoveryInterval) {
      clearInterval(this.discoveryInterval);
      this.discoveryInterval = null;
    }
  }

  /**
   * Set discovery interval
   */
  setDiscoveryInterval(ms: number): void {
    this.discoveryIntervalMs = ms;
    if (this.discoveryInterval) {
      this.stop();
      this.start();
    }
  }

  /**
   * Discover all peers using all available methods
   */
  async discoverAll(): Promise<Peer[]> {
    const peers: Peer[] = [];

    try {
      // Run all discovery methods in parallel
      const results = await Promise.allSettled([
        this.discoverBLE(),
        this.discoverBluetooth(),
        this.discoverLAN(),
        this.discoverWebRTC(),
      ]);

      // Collect successful results
      results.forEach((result) => {
        if (result.status === 'fulfilled') {
          peers.push(...result.value);
        }
      });

      // Update discovered peers map
      peers.forEach((peer) => {
        this.addOrUpdatePeer(peer);
      });

      // Emit discovery event
      if (peers.length > 0) {
        this.emit('peers-discovered', peers);
      }

      return Array.from(this.discoveredPeers.values());
    } catch (error) {
      throw new NetworkError(
        'Discovery failed',
        'DISCOVERY_ERROR',
        error
      );
    }
  }

  /**
   * Discover peers via Bluetooth Low Energy
   */
  async discoverBLE(): Promise<Peer[]> {
    // TODO: Implement BLE discovery
    // This would use platform-specific BLE APIs
    // For now, return empty array
    return [];
  }

  /**
   * Discover peers via Bluetooth Classic
   */
  async discoverBluetooth(): Promise<Peer[]> {
    // TODO: Implement Bluetooth Classic discovery
    // This would use platform-specific Bluetooth APIs
    // For now, return empty array
    return [];
  }

  /**
   * Discover peers via LAN multicast
   */
  async discoverLAN(): Promise<Peer[]> {
    // TODO: Implement LAN multicast discovery
    // This would use UDP multicast
    // For now, return empty array
    return [];
  }

  /**
   * Discover peers via WebRTC signaling
   */
  async discoverWebRTC(): Promise<Peer[]> {
    // TODO: Implement WebRTC discovery
    // This would use a signaling server or DHT
    // For now, return empty array
    return [];
  }

  /**
   * Announce presence to network
   */
  announcePresence(): void {
    const identity = identityManager.getPublicIdentity();
    const message = this.createDiscoveryMessage('announce', identity);

    // Broadcast on all available transports
    this.broadcastDiscoveryMessage(message);

    this.emit('presence-announced', message);
  }

  /**
   * Query for specific peer
   */
  async queryPeer(peerId: string): Promise<Peer | null> {
    const identity = identityManager.getPublicIdentity();
    const message = this.createDiscoveryMessage('query', identity);

    // Broadcast query
    this.broadcastDiscoveryMessage(message);

    // Wait for response (with timeout)
    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve(null);
      }, 5000);

      const handler = (peer: Peer) => {
        if (peer.id === peerId) {
          clearTimeout(timeout);
          this.removeListener('peer-discovered', handler);
          resolve(peer);
        }
      };

      this.on('peer-discovered', handler);
    });
  }

  /**
   * Create discovery message
   */
  private createDiscoveryMessage(
    type: 'announce' | 'query' | 'response',
    nodeInfo: PublicIdentity
  ): DiscoveryMessage {
    const message: Omit<DiscoveryMessage, 'signature'> = {
      type,
      messageId: cryptoService.generateId(),
      nodeInfo,
      timestamp: Date.now(),
    };

    const signature = identityManager.sign(JSON.stringify(message));

    return {
      ...message,
      signature,
    };
  }

  /**
   * Broadcast discovery message on all transports
   */
  private broadcastDiscoveryMessage(message: DiscoveryMessage): void {
    // TODO: Implement actual broadcasting on each transport
    // For now, just emit an event
    this.emit('discovery-message-sent', message);
  }

  /**
   * Handle received discovery message
   */
  handleDiscoveryMessage(message: DiscoveryMessage): void {
    // Verify signature
    const messageWithoutSig = { ...message };
    delete (messageWithoutSig as any).signature;

    const isValid = identityManager.verify(
      JSON.stringify(messageWithoutSig),
      message.signature,
      message.nodeInfo.publicKey
    );

    if (!isValid) {
      return; // Invalid signature, ignore
    }

    // Create peer object
    const peer: Peer = {
      id: message.nodeInfo.userId,
      identity: message.nodeInfo,
      connections: [],
      isRelay: false,
      distance: 1, // Direct discovery = 1 hop
      lastSeen: Date.now(),
    };

    // Add or update peer
    this.addOrUpdatePeer(peer);

    // Emit event
    this.emit('peer-discovered', peer);

    // Respond to queries
    if (message.type === 'query') {
      this.respondToQuery(message);
    }
  }

  /**
   * Respond to peer query
   */
  private respondToQuery(query: DiscoveryMessage): void {
    const identity = identityManager.getPublicIdentity();
    const response = this.createDiscoveryMessage('response', identity);
    this.broadcastDiscoveryMessage(response);
  }

  /**
   * Add or update peer in discovered peers map
   */
  private addOrUpdatePeer(peer: Peer): void {
    const existing = this.discoveredPeers.get(peer.id);

    if (existing) {
      // Update existing peer
      existing.identity = peer.identity;
      existing.lastSeen = Date.now();
      existing.connections = peer.connections;
    } else {
      // Add new peer
      this.discoveredPeers.set(peer.id, peer);
      this.emit('new-peer', peer);
    }
  }

  /**
   * Get discovered peer by ID
   */
  getPeer(peerId: string): Peer | null {
    return this.discoveredPeers.get(peerId) || null;
  }

  /**
   * Get all discovered peers
   */
  getAllPeers(): Peer[] {
    return Array.from(this.discoveredPeers.values());
  }

  /**
   * Remove peer
   */
  removePeer(peerId: string): void {
    const peer = this.discoveredPeers.get(peerId);
    if (peer) {
      this.discoveredPeers.delete(peerId);
      this.emit('peer-removed', peer);
    }
  }

  /**
   * Clean up stale peers
   */
  cleanupStalePeers(maxAgeMs: number = 60000): void {
    const now = Date.now();
    const stalePeers: string[] = [];

    this.discoveredPeers.forEach((peer, peerId) => {
      if (now - peer.lastSeen > maxAgeMs) {
        stalePeers.push(peerId);
      }
    });

    stalePeers.forEach((peerId) => {
      this.removePeer(peerId);
    });
  }

  /**
   * Get peers by transport capability
   */
  getPeersByTransport(transport: TransportType): Peer[] {
    return this.getAllPeers().filter((peer) =>
      peer.identity.networkCapabilities.some(
        (cap) => cap.type === transport && cap.available
      )
    );
  }

  /**
   * Get peer count
   */
  getPeerCount(): number {
    return this.discoveredPeers.size;
  }

  /**
   * Clear all discovered peers
   */
  clearPeers(): void {
    this.discoveredPeers.clear();
    this.emit('peers-cleared');
  }
}

// Singleton instance
export const peerDiscovery = new PeerDiscovery();
