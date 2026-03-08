/**
 * Identity Management System
 * Handles user identity creation, storage, and verification
 */

import { v4 as uuidv4 } from 'uuid';
import { cryptoService } from '../crypto/CryptoService';
import {
  Identity,
  PublicIdentity,
  NetworkCapability,
  CryptoKeys,
  SecurityError
} from '../../types';

export class IdentityManager {
  private currentIdentity: Identity | null = null;

  /**
   * Create a new identity
   */
  createIdentity(
    deviceInfo: Record<string, any>,
    capabilities: NetworkCapability[]
  ): Identity {
    const userId = uuidv4();
    const keys = cryptoService.generateIdentityKeys();
    const deviceFingerprint = cryptoService.generateDeviceFingerprint(deviceInfo);

    const identity: Identity = {
      userId,
      publicKey: cryptoService.publicKeyToString(keys.identityKeys.publicKey),
      privateKey: cryptoService.secretKeyToString(keys.identityKeys.secretKey),
      deviceFingerprint,
      networkCapabilities: capabilities,
      reputation: 100, // Start with perfect reputation
      createdAt: Date.now(),
      lastSeen: Date.now(),
    };

    this.currentIdentity = identity;
    return identity;
  }

  /**
   * Load existing identity
   */
  loadIdentity(identity: Identity): void {
    this.currentIdentity = identity;
  }

  /**
   * Get current identity
   */
  getIdentity(): Identity {
    if (!this.currentIdentity) {
      throw new SecurityError(
        'No identity loaded',
        'NO_IDENTITY'
      );
    }
    return this.currentIdentity;
  }

  /**
   * Get public identity (safe to share)
   */
  getPublicIdentity(): PublicIdentity {
    const identity = this.getIdentity();
    return {
      userId: identity.userId,
      publicKey: identity.publicKey,
      deviceFingerprint: identity.deviceFingerprint,
      networkCapabilities: identity.networkCapabilities,
      reputation: identity.reputation,
      lastSeen: identity.lastSeen,
    };
  }

  /**
   * Update network capabilities
   */
  updateCapabilities(capabilities: NetworkCapability[]): void {
    if (!this.currentIdentity) {
      throw new SecurityError(
        'No identity loaded',
        'NO_IDENTITY'
      );
    }
    this.currentIdentity.networkCapabilities = capabilities;
    this.currentIdentity.lastSeen = Date.now();
  }

  /**
   * Update reputation
   */
  updateReputation(reputation: number): void {
    if (!this.currentIdentity) {
      throw new SecurityError(
        'No identity loaded',
        'NO_IDENTITY'
      );
    }
    this.currentIdentity.reputation = Math.max(0, Math.min(100, reputation));
  }

  /**
   * Sign data with identity's private key
   */
  sign(data: string): string {
    const identity = this.getIdentity();
    const secretKey = cryptoService.stringToSecretKey(identity.privateKey);
    return cryptoService.sign(data, secretKey);
  }

  /**
   * Verify a signature from another identity
   */
  verify(data: string, signature: string, publicKey: string): boolean {
    try {
      const publicKeyBytes = cryptoService.stringToPublicKey(publicKey);
      return cryptoService.verify(data, signature, publicKeyBytes);
    } catch (error) {
      return false;
    }
  }

  /**
   * Verify identity authenticity
   */
  verifyIdentity(publicIdentity: PublicIdentity, signature: string): boolean {
    const data = JSON.stringify({
      userId: publicIdentity.userId,
      publicKey: publicIdentity.publicKey,
      deviceFingerprint: publicIdentity.deviceFingerprint,
    });

    return this.verify(data, signature, publicIdentity.publicKey);
  }

  /**
   * Create identity signature for verification
   */
  createIdentitySignature(): string {
    const identity = this.getIdentity();
    const data = JSON.stringify({
      userId: identity.userId,
      publicKey: identity.publicKey,
      deviceFingerprint: identity.deviceFingerprint,
    });

    return this.sign(data);
  }

  /**
   * Export public identity with signature
   */
  exportPublicIdentity(): { identity: PublicIdentity; signature: string } {
    const identity = this.getPublicIdentity();
    const signature = this.createIdentitySignature();
    return { identity, signature };
  }

  /**
   * Validate device fingerprint
   */
  validateDeviceFingerprint(
    deviceInfo: Record<string, any>,
    fingerprint: string
  ): boolean {
    const computedFingerprint = cryptoService.generateDeviceFingerprint(deviceInfo);
    return computedFingerprint === fingerprint;
  }

  /**
   * Update last seen timestamp
   */
  updateLastSeen(): void {
    if (!this.currentIdentity) {
      throw new SecurityError(
        'No identity loaded',
        'NO_IDENTITY'
      );
    }
    this.currentIdentity.lastSeen = Date.now();
  }

  /**
   * Check if identity has capability
   */
  hasCapability(capability: string): boolean {
    if (!this.currentIdentity) {
      return false;
    }
    return this.currentIdentity.networkCapabilities.some(
      (cap) => cap.type === capability && cap.available
    );
  }

  /**
   * Get capability strength
   */
  getCapabilityStrength(capability: string): number {
    if (!this.currentIdentity) {
      return 0;
    }
    const cap = this.currentIdentity.networkCapabilities.find(
      (c) => c.type === capability
    );
    return cap?.strength || 0;
  }

  /**
   * Serialize identity for storage
   */
  serializeIdentity(): string {
    const identity = this.getIdentity();
    return JSON.stringify(identity);
  }

  /**
   * Deserialize identity from storage
   */
  static deserializeIdentity(data: string): Identity {
    try {
      return JSON.parse(data) as Identity;
    } catch (error) {
      throw new SecurityError(
        'Failed to deserialize identity',
        'DESERIALIZE_ERROR',
        error
      );
    }
  }

  /**
   * Clear current identity (logout)
   */
  clearIdentity(): void {
    this.currentIdentity = null;
  }
}

// Singleton instance
export const identityManager = new IdentityManager();
