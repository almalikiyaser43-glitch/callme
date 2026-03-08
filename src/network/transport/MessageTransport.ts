/**
 * Message Transport Engine
 * Handles message delivery across the mesh network
 */

import { EventEmitter } from 'events';
import {
  Message,
  MessageEnvelope,
  Route,
  Peer,
  EncryptedPayload,
  NetworkError,
  MessageType
} from '../../types';
import { cryptoService } from '../../security/crypto/CryptoService';
import { identityManager } from '../../security/identity/IdentityManager';
import { routingEngine } from '../routing/RoutingEngine';
import { meshNetwork } from '../mesh/MeshNetwork';

export class MessageTransport extends EventEmitter {
  private messageQueue: Map<string, Message[]> = new Map();
  private pendingMessages: Map<string, Message> = new Map();
  private deliveredMessages: Set<string> = new Set();
  private maxRetries: number = 3;
  private retryDelay: number = 5000; // 5 seconds

  constructor() {
    super();
  }

  /**
   * Send message directly to peer
   */
  async sendDirect(
    content: string,
    recipientId: string,
    recipientPublicKey: string
  ): Promise<string> {
    try {
      // Encrypt message
      const identity = identityManager.getIdentity();
      const publicKey = cryptoService.stringToPublicKey(recipientPublicKey);
      const { payload, signature } = cryptoService.encryptAndSign(
        content,
        publicKey,
        cryptoService.stringToSecretKey(identity.privateKey)
      );

      // Create message
      const message: Message = {
        id: cryptoService.generateId(),
        type: 'text',
        from: identity.userId,
        to: recipientId,
        content: payload,
        signature,
        timestamp: Date.now(),
        ttl: 3600, // 1 hour
        hops: 0,
        maxHops: 10,
        route: [identity.userId],
      };

      // Check if peer is directly connected
      const peer = meshNetwork.getNode(recipientId);
      if (peer && peer.connections.length > 0) {
        // Send directly
        await this.transmitMessage(message, recipientId);
        this.emit('message-sent', message);
        return message.id;
      } else {
        // Use mesh routing
        return this.sendMultiHop(message);
      }
    } catch (error) {
      throw new NetworkError(
        'Failed to send message',
        'SEND_ERROR',
        error
      );
    }
  }

  /**
   * Send message through mesh network (multi-hop)
   */
  async sendMultiHop(message: Message): Promise<string> {
    try {
      // Find route to destination
      const topology = meshNetwork.getTopology();
      const route = routingEngine.findRoute(message.to, topology);

      if (!route) {
        // No route available, queue for later
        this.queueOffline(message);
        throw new NetworkError(
          'No route to destination',
          'NO_ROUTE'
        );
      }

      // Update message route
      message.route = [...message.route, ...route.hops.slice(1)];

      // Send to first hop
      const nextHop = route.hops[1]; // First hop after self
      if (nextHop) {
        await this.transmitMessage(message, nextHop);
        this.pendingMessages.set(message.id, message);

        // Track for acknowledgment
        this.trackMessageDelivery(message, route);
      }

      this.emit('message-sent', message);
      return message.id;
    } catch (error) {
      this.queueOffline(message);
      throw new NetworkError(
        'Failed to send multi-hop message',
        'MULTIHOP_ERROR',
        error
      );
    }
  }

  /**
   * Transmit message to next hop
   */
  private async transmitMessage(message: Message, nextHopId: string): Promise<void> {
    // Create message envelope
    const envelope: MessageEnvelope = {
      version: '1.0',
      type: message.type,
      messageId: message.id,
      from: message.from,
      to: message.to,
      timestamp: message.timestamp,
      ttl: message.ttl,
      hops: message.hops + 1,
      maxHops: message.maxHops,
      route: message.route,
      payload: message.content,
      signature: message.signature,
    };

    // TODO: Actually send via transport layer
    // For now, just emit event
    this.emit('message-transmitted', { envelope, nextHop: nextHopId });
  }

  /**
   * Handle received message
   */
  async handleReceivedMessage(envelope: MessageEnvelope): Promise<void> {
    try {
      // Check if message is for us
      const identity = identityManager.getIdentity();

      if (envelope.to === identity.userId) {
        // Message is for us, decrypt and deliver
        await this.deliverMessage(envelope);
      } else {
        // Message needs to be forwarded
        await this.forwardMessage(envelope);
      }
    } catch (error) {
      this.emit('message-error', { envelope, error });
    }
  }

  /**
   * Deliver message to local user
   */
  private async deliverMessage(envelope: MessageEnvelope): Promise<void> {
    try {
      // Check if already delivered
      if (this.deliveredMessages.has(envelope.messageId)) {
        return;
      }

      // Verify signature
      const senderPublicKey = cryptoService.stringToPublicKey(
        envelope.payload.ephemeralPublicKey
      );

      // Decrypt message
      const identity = identityManager.getIdentity();
      const secretKey = cryptoService.stringToSecretKey(identity.privateKey);

      // Get sender's public key for verification
      const senderNode = meshNetwork.getNode(envelope.from);
      if (!senderNode) {
        throw new NetworkError(
          'Unknown sender',
          'UNKNOWN_SENDER'
        );
      }

      const senderPubKey = cryptoService.stringToPublicKey(
        senderNode.identity.publicKey
      );

      const decryptedContent = cryptoService.verifyAndDecrypt(
        envelope.payload,
        envelope.signature,
        senderPubKey,
        secretKey
      );

      // Mark as delivered
      this.deliveredMessages.add(envelope.messageId);

      // Emit event
      this.emit('message-received', {
        id: envelope.messageId,
        from: envelope.from,
        to: envelope.to,
        content: decryptedContent,
        timestamp: envelope.timestamp,
        hops: envelope.hops,
      });

      // Send acknowledgment
      this.sendAcknowledgment(envelope);
    } catch (error) {
      throw new NetworkError(
        'Failed to deliver message',
        'DELIVERY_ERROR',
        error
      );
    }
  }

  /**
   * Forward message to next hop
   */
  private async forwardMessage(envelope: MessageEnvelope): Promise<void> {
    // Check TTL
    const age = Date.now() - envelope.timestamp;
    if (age > envelope.ttl * 1000) {
      return; // Message expired
    }

    // Check hop count
    if (envelope.hops >= envelope.maxHops) {
      return; // Max hops reached
    }

    // Find next hop from route
    const identity = identityManager.getIdentity();
    const currentIndex = envelope.route.indexOf(identity.userId);

    if (currentIndex >= 0 && currentIndex < envelope.route.length - 1) {
      const nextHop = envelope.route[currentIndex + 1];

      // Update hops
      envelope.hops++;

      // Forward
      const message: Message = {
        id: envelope.messageId,
        type: envelope.type,
        from: envelope.from,
        to: envelope.to,
        content: envelope.payload,
        signature: envelope.signature,
        timestamp: envelope.timestamp,
        ttl: envelope.ttl,
        hops: envelope.hops,
        maxHops: envelope.maxHops,
        route: envelope.route,
      };

      await this.transmitMessage(message, nextHop);
      this.emit('message-forwarded', { message, nextHop });
    }
  }

  /**
   * Send acknowledgment
   */
  private sendAcknowledgment(envelope: MessageEnvelope): void {
    // Create ACK message
    const ackMessage: Message = {
      id: cryptoService.generateId(),
      type: 'ack',
      from: envelope.to,
      to: envelope.from,
      content: {
        ciphertext: Buffer.from(
          JSON.stringify({ messageId: envelope.messageId })
        ).toString('base64'),
        nonce: '',
        ephemeralPublicKey: '',
      },
      signature: '',
      timestamp: Date.now(),
      ttl: 300, // 5 minutes
      hops: 0,
      maxHops: 10,
      route: [],
    };

    this.sendMultiHop(ackMessage).catch((error) => {
      // ACK failed, log but don't throw
      console.error('Failed to send ACK:', error);
    });
  }

  /**
   * Queue message for offline delivery
   */
  queueOffline(message: Message): void {
    const queue = this.messageQueue.get(message.to) || [];
    queue.push(message);
    this.messageQueue.set(message.to, queue);
    this.emit('message-queued', message);
  }

  /**
   * Deliver queued messages when peer comes online
   */
  async deliverQueued(peerId: string): Promise<void> {
    const queue = this.messageQueue.get(peerId);
    if (!queue || queue.length === 0) {
      return;
    }

    // Try to deliver each queued message
    const delivered: string[] = [];

    for (const message of queue) {
      try {
        await this.sendMultiHop(message);
        delivered.push(message.id);
      } catch (error) {
        // Keep in queue
      }
    }

    // Remove delivered messages from queue
    const remaining = queue.filter((msg) => !delivered.includes(msg.id));
    if (remaining.length > 0) {
      this.messageQueue.set(peerId, remaining);
    } else {
      this.messageQueue.delete(peerId);
    }

    this.emit('queued-messages-delivered', {
      peerId,
      deliveredCount: delivered.length,
      remainingCount: remaining.length,
    });
  }

  /**
   * Track message delivery for timeout/retry
   */
  private trackMessageDelivery(message: Message, route: Route): void {
    const startTime = Date.now();

    const checkDelivery = () => {
      if (this.deliveredMessages.has(message.id)) {
        // Message delivered successfully
        const latency = Date.now() - startTime;
        routingEngine.learnFromHistory(route, latency, true);
        this.pendingMessages.delete(message.id);
        this.emit('message-delivered', message.id);
      } else {
        // Check timeout
        const elapsed = Date.now() - startTime;
        if (elapsed > this.retryDelay) {
          // Retry or fail
          routingEngine.learnFromHistory(route, elapsed, false);
          this.pendingMessages.delete(message.id);
          this.emit('message-failed', message.id);
        } else {
          // Check again later
          setTimeout(checkDelivery, 1000);
        }
      }
    };

    setTimeout(checkDelivery, 1000);
  }

  /**
   * Get queued message count for peer
   */
  getQueuedCount(peerId: string): number {
    const queue = this.messageQueue.get(peerId);
    return queue ? queue.length : 0;
  }

  /**
   * Clear message queue for peer
   */
  clearQueue(peerId: string): void {
    this.messageQueue.delete(peerId);
  }

  /**
   * Get all pending messages
   */
  getPendingMessages(): Message[] {
    return Array.from(this.pendingMessages.values());
  }

  /**
   * Clear delivered messages history
   */
  clearDeliveredHistory(): void {
    this.deliveredMessages.clear();
  }
}

// Singleton instance
export const messageTransport = new MessageTransport();
