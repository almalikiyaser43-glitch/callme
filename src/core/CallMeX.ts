/**
 * CallMe X - Main Application Class
 * Orchestrates all components of the decentralized communication platform
 */

import { EventEmitter } from 'events';
import * as os from 'os';
import * as path from 'path';
import {
  CallMeConfig,
  Identity,
  Contact,
  Message,
  NetworkCapability,
  NetworkHealth,
  NetworkMetrics,
  Peer,
  Route
} from '../types';
import { identityManager } from '../security/identity/IdentityManager';
import { cryptoService } from '../security/crypto/CryptoService';
import { peerDiscovery } from '../network/discovery/PeerDiscovery';
import { meshNetwork } from '../network/mesh/MeshNetwork';
import { routingEngine } from '../network/routing/RoutingEngine';
import { connectionManager } from '../network/ConnectionManager';
import { messageTransport } from '../network/transport/MessageTransport';
import { qrExchange } from '../core/QRExchange';
import { DistributedStorage } from '../storage/DistributedStorage';

export class CallMeX extends EventEmitter {
  private storage: DistributedStorage;
  private config: CallMeConfig;
  private isRunning: boolean = false;
  private startTime: number = 0;
  private metrics: NetworkMetrics;

  constructor(config?: Partial<CallMeConfig>) {
    super();

    // Default configuration
    const defaultConfig: CallMeConfig = {
      identity: {} as Identity,
      network: {
        enableBluetooth: true,
        enableBluetoothLE: true,
        enableWiFiDirect: true,
        enableLAN: true,
        enableWebRTC: true,
        enableRelay: true,
        relayServers: [],
        maxConnections: 50,
        maxHops: 10,
        discoveryInterval: 5000,
        routingUpdateInterval: 10000,
      },
      security: {
        encryptAll: true,
        forwardSecrecy: true,
        requireSignatures: true,
        trustOnFirstUse: true,
        minReputation: 50,
      },
      storage: {
        path: path.join(os.homedir(), '.callmex'),
        encrypted: true,
        maxSize: 1024 * 1024 * 1024,
        replicationFactor: 3,
      },
      ui: {
        theme: 'dark',
        language: 'en',
        notifications: true,
        showNetworkGraph: true,
      },
    };

    this.config = { ...defaultConfig, ...config } as CallMeConfig;
    this.storage = new DistributedStorage(this.config.storage.path, this.config.storage);

    // Initialize metrics
    this.metrics = {
      totalMessages: 0,
      messagesDelivered: 0,
      messagesFailed: 0,
      averageHops: 0,
      averageLatency: 0,
      peakThroughput: 0,
      activePeers: 0,
      uptime: 0,
    };

    this.setupEventHandlers();
  }

  /**
   * Initialize the platform
   */
  async initialize(): Promise<void> {
    try {
      // Load or create identity
      let identity = await this.storage.retrieveIdentity();

      if (!identity) {
        // Create new identity
        const deviceInfo = this.getDeviceInfo();
        const capabilities = this.detectCapabilities();
        identity = identityManager.createIdentity(deviceInfo, capabilities);
        await this.storage.storeIdentity(identity);
      } else {
        // Load existing identity
        identityManager.loadIdentity(identity);
      }

      this.config.identity = identity;

      this.emit('initialized', { identity });
    } catch (error) {
      this.emit('error', { type: 'initialization', error });
      throw error;
    }
  }

  /**
   * Start the platform
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    try {
      this.isRunning = true;
      this.startTime = Date.now();

      // Start components
      peerDiscovery.start();
      meshNetwork.start();
      connectionManager.start();

      // Announce presence
      peerDiscovery.announcePresence();

      this.emit('started');
    } catch (error) {
      this.isRunning = false;
      this.emit('error', { type: 'start', error });
      throw error;
    }
  }

  /**
   * Stop the platform
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    try {
      this.isRunning = false;

      // Stop components
      peerDiscovery.stop();
      meshNetwork.stop();
      connectionManager.stop();

      this.emit('stopped');
    } catch (error) {
      this.emit('error', { type: 'stop', error });
      throw error;
    }
  }

  /**
   * Send message to contact
   */
  async sendMessage(recipientId: string, content: string): Promise<string> {
    try {
      // Get recipient contact
      const contact = await this.storage.retrieveContact(recipientId);
      if (!contact) {
        throw new Error('Contact not found');
      }

      // Send message
      const messageId = await messageTransport.sendDirect(
        content,
        recipientId,
        contact.publicKey
      );

      // Update metrics
      this.metrics.totalMessages++;

      return messageId;
    } catch (error) {
      this.metrics.messagesFailed++;
      this.emit('error', { type: 'send-message', error });
      throw error;
    }
  }

  /**
   * Add contact via QR code
   */
  async addContactFromQR(qrData: string): Promise<Contact> {
    try {
      // Parse QR data
      const contactInfo = qrExchange.scanQR(qrData);

      // Verify contact
      const isValid = qrExchange.verifyContact(contactInfo);
      if (!isValid) {
        throw new Error('Invalid contact signature');
      }

      // Convert to contact
      const contact = qrExchange.contactInfoToContact(contactInfo);

      // Store contact
      await this.storage.storeContact(contact);

      this.emit('contact-added', contact);
      return contact;
    } catch (error) {
      this.emit('error', { type: 'add-contact', error });
      throw error;
    }
  }

  /**
   * Generate QR code for sharing
   */
  async generateContactQR(displayName?: string): Promise<string> {
    try {
      const identity = identityManager.getPublicIdentity();
      return await qrExchange.generateQR(identity, displayName);
    } catch (error) {
      this.emit('error', { type: 'generate-qr', error });
      throw error;
    }
  }

  /**
   * Get all contacts
   */
  async getContacts(): Promise<Contact[]> {
    return await this.storage.retrieveContacts();
  }

  /**
   * Get conversation messages
   */
  async getMessages(contactId: string): Promise<Message[]> {
    const identity = identityManager.getIdentity();
    const conversationKey = [identity.userId, contactId].sort().join(':');
    return await this.storage.retrieveMessages(conversationKey);
  }

  /**
   * Get network health
   */
  getNetworkHealth(): NetworkHealth {
    const peers = peerDiscovery.getAllPeers();
    const connections = connectionManager.getAllConnections();

    return {
      nodeCount: peers.length,
      activeConnections: connections.length,
      averageLatency: this.calculateAverageLatency(connections),
      messageDeliveryRate: this.calculateDeliveryRate(),
      networkPartitions: meshNetwork.getPartitions().length,
      timestamp: Date.now(),
    };
  }

  /**
   * Get network metrics
   */
  getMetrics(): NetworkMetrics {
    this.metrics.uptime = Date.now() - this.startTime;
    this.metrics.activePeers = peerDiscovery.getPeerCount();
    return { ...this.metrics };
  }

  /**
   * Get discovered peers
   */
  getPeers(): Peer[] {
    return peerDiscovery.getAllPeers();
  }

  /**
   * Get route to peer
   */
  getRouteToPeer(peerId: string): Route | null {
    const topology = meshNetwork.getTopology();
    return routingEngine.findRoute(peerId, topology);
  }

  /**
   * Setup event handlers
   */
  private setupEventHandlers(): void {
    // Peer discovery events
    peerDiscovery.on('peer-discovered', (peer: Peer) => {
      meshNetwork.addNode(peer);
      this.emit('peer-discovered', peer);
    });

    peerDiscovery.on('peer-removed', (peer: Peer) => {
      meshNetwork.removeNode(peer.id);
      this.emit('peer-removed', peer);
    });

    // Message transport events
    messageTransport.on('message-received', async (message: any) => {
      await this.storage.storeMessage(message);
      this.emit('message-received', message);
    });

    messageTransport.on('message-delivered', (messageId: string) => {
      this.metrics.messagesDelivered++;
      this.emit('message-delivered', messageId);
    });

    messageTransport.on('message-failed', (messageId: string) => {
      this.metrics.messagesFailed++;
      this.emit('message-failed', messageId);
    });

    // Connection events
    connectionManager.on('connection-established', (connection) => {
      this.emit('connection-established', connection);
    });

    connectionManager.on('connection-closed', (connection) => {
      this.emit('connection-closed', connection);
    });

    // Mesh network events
    meshNetwork.on('topology-updated', (topology) => {
      this.emit('topology-updated', topology);
    });
  }

  /**
   * Get device info
   */
  private getDeviceInfo(): Record<string, any> {
    return {
      platform: os.platform(),
      arch: os.arch(),
      hostname: os.hostname(),
      cpus: os.cpus().length,
      totalmem: os.totalmem(),
    };
  }

  /**
   * Detect available network capabilities
   */
  private detectCapabilities(): NetworkCapability[] {
    const capabilities: NetworkCapability[] = [];

    // LAN is always available
    capabilities.push({
      type: 'lan',
      available: true,
      strength: 95,
    });

    // WebRTC is available in most environments
    capabilities.push({
      type: 'webrtc',
      available: true,
      strength: 80,
    });

    // Platform-specific capabilities
    if (this.config.network.enableBluetooth) {
      capabilities.push({
        type: 'bluetooth-classic',
        available: false, // Requires platform support
        strength: 0,
      });
    }

    if (this.config.network.enableBluetoothLE) {
      capabilities.push({
        type: 'bluetooth-le',
        available: false, // Requires platform support
        strength: 0,
      });
    }

    if (this.config.network.enableWiFiDirect) {
      capabilities.push({
        type: 'wifi-direct',
        available: false, // Requires platform support
        strength: 0,
      });
    }

    return capabilities;
  }

  /**
   * Calculate average latency
   */
  private calculateAverageLatency(connections: any[]): number {
    if (connections.length === 0) return 0;
    const total = connections.reduce((sum, conn) => sum + conn.quality.latency, 0);
    return total / connections.length;
  }

  /**
   * Calculate message delivery rate
   */
  private calculateDeliveryRate(): number {
    const total = this.metrics.messagesDelivered + this.metrics.messagesFailed;
    if (total === 0) return 1.0;
    return this.metrics.messagesDelivered / total;
  }

  /**
   * Export configuration
   */
  exportConfig(): CallMeConfig {
    return { ...this.config };
  }

  /**
   * Get storage instance
   */
  getStorage(): DistributedStorage {
    return this.storage;
  }

  /**
   * Check if running
   */
  isActive(): boolean {
    return this.isRunning;
  }
}
