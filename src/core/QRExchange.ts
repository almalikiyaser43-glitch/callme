/**
 * QR Code Contact Exchange System
 * Secure contact exchange via QR codes
 */

import * as QRCode from 'qrcode';
import {
  ContactInfo,
  Contact,
  PublicIdentity,
  NetworkCapability,
  SecurityError
} from '../../types';
import { identityManager } from '../../security/identity/IdentityManager';
import { cryptoService } from '../../security/crypto/CryptoService';

export class QRExchange {
  /**
   * Generate QR code for identity
   */
  async generateQR(
    identity?: PublicIdentity,
    displayName?: string
  ): Promise<string> {
    try {
      // Use current identity if not provided
      const id = identity || identityManager.getPublicIdentity();

      // Create contact info
      const contactInfo: ContactInfo = {
        userId: id.userId,
        publicKey: id.publicKey,
        deviceFingerprint: id.deviceFingerprint,
        networkCapabilities: id.networkCapabilities,
        displayName: displayName || '',
        signature: identityManager.createIdentitySignature(),
      };

      // Convert to JSON
      const data = JSON.stringify(contactInfo);

      // Generate QR code as data URL
      const qrCodeDataURL = await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        width: 512,
        margin: 2,
      });

      return qrCodeDataURL;
    } catch (error) {
      throw new SecurityError(
        'Failed to generate QR code',
        'QR_GENERATION_ERROR',
        error
      );
    }
  }

  /**
   * Generate QR code as SVG
   */
  async generateQRSVG(
    identity?: PublicIdentity,
    displayName?: string
  ): Promise<string> {
    try {
      // Use current identity if not provided
      const id = identity || identityManager.getPublicIdentity();

      // Create contact info
      const contactInfo: ContactInfo = {
        userId: id.userId,
        publicKey: id.publicKey,
        deviceFingerprint: id.deviceFingerprint,
        networkCapabilities: id.networkCapabilities,
        displayName: displayName || '',
        signature: identityManager.createIdentitySignature(),
      };

      // Convert to JSON
      const data = JSON.stringify(contactInfo);

      // Generate QR code as SVG
      const qrCodeSVG = await QRCode.toString(data, {
        errorCorrectionLevel: 'H',
        type: 'svg',
        width: 512,
        margin: 2,
      });

      return qrCodeSVG;
    } catch (error) {
      throw new SecurityError(
        'Failed to generate QR code SVG',
        'QR_SVG_GENERATION_ERROR',
        error
      );
    }
  }

  /**
   * Scan and parse QR code data
   */
  scanQR(qrData: string): ContactInfo {
    try {
      const contactInfo = JSON.parse(qrData) as ContactInfo;

      // Validate required fields
      if (
        !contactInfo.userId ||
        !contactInfo.publicKey ||
        !contactInfo.deviceFingerprint ||
        !contactInfo.signature
      ) {
        throw new SecurityError(
          'Invalid QR code data',
          'INVALID_QR_DATA'
        );
      }

      return contactInfo;
    } catch (error) {
      throw new SecurityError(
        'Failed to parse QR code',
        'QR_PARSE_ERROR',
        error
      );
    }
  }

  /**
   * Verify contact authenticity
   */
  verifyContact(contact: ContactInfo): boolean {
    try {
      // Create data for verification
      const data = JSON.stringify({
        userId: contact.userId,
        publicKey: contact.publicKey,
        deviceFingerprint: contact.deviceFingerprint,
      });

      // Verify signature
      return identityManager.verify(
        data,
        contact.signature,
        contact.publicKey
      );
    } catch (error) {
      return false;
    }
  }

  /**
   * Convert ContactInfo to Contact
   */
  contactInfoToContact(contactInfo: ContactInfo): Contact {
    return {
      userId: contactInfo.userId,
      publicKey: contactInfo.publicKey,
      deviceFingerprint: contactInfo.deviceFingerprint,
      networkCapabilities: contactInfo.networkCapabilities,
      displayName: contactInfo.displayName,
      addedAt: Date.now(),
      lastSeen: Date.now(),
      verified: this.verifyContact(contactInfo),
    };
  }

  /**
   * Export contact info with custom display name
   */
  exportContactInfo(displayName: string): ContactInfo {
    const identity = identityManager.getPublicIdentity();

    return {
      userId: identity.userId,
      publicKey: identity.publicKey,
      deviceFingerprint: identity.deviceFingerprint,
      networkCapabilities: identity.networkCapabilities,
      displayName,
      signature: identityManager.createIdentitySignature(),
    };
  }

  /**
   * Create shareable contact link
   */
  createContactLink(baseUrl: string, contactInfo?: ContactInfo): string {
    const info = contactInfo || this.exportContactInfo('');
    const data = JSON.stringify(info);
    const encoded = Buffer.from(data).toString('base64');
    return `${baseUrl}/add-contact?data=${encodeURIComponent(encoded)}`;
  }

  /**
   * Parse contact link
   */
  parseContactLink(url: string): ContactInfo | null {
    try {
      const urlObj = new URL(url);
      const dataParam = urlObj.searchParams.get('data');

      if (!dataParam) {
        return null;
      }

      const decoded = Buffer.from(decodeURIComponent(dataParam), 'base64').toString();
      return this.scanQR(decoded);
    } catch (error) {
      return null;
    }
  }

  /**
   * Validate network capabilities compatibility
   */
  checkCompatibility(
    localCapabilities: NetworkCapability[],
    remoteCapabilities: NetworkCapability[]
  ): boolean {
    // Check if there's at least one compatible transport
    for (const local of localCapabilities) {
      if (!local.available) continue;

      for (const remote of remoteCapabilities) {
        if (remote.available && local.type === remote.type) {
          return true;
        }
      }
    }

    return false;
  }

  /**
   * Get compatible transports between capabilities
   */
  getCompatibleTransports(
    localCapabilities: NetworkCapability[],
    remoteCapabilities: NetworkCapability[]
  ): NetworkCapability[] {
    const compatible: NetworkCapability[] = [];

    for (const local of localCapabilities) {
      if (!local.available) continue;

      for (const remote of remoteCapabilities) {
        if (remote.available && local.type === remote.type) {
          // Use the lower strength value
          compatible.push({
            type: local.type,
            available: true,
            strength: Math.min(local.strength, remote.strength),
          });
          break;
        }
      }
    }

    return compatible;
  }

  /**
   * Generate QR code for business card format
   */
  async generateBusinessCard(
    identity: PublicIdentity,
    additionalInfo: {
      displayName: string;
      avatar?: string;
      bio?: string;
      socialLinks?: Record<string, string>;
    }
  ): Promise<string> {
    try {
      const contactInfo: ContactInfo & typeof additionalInfo = {
        userId: identity.userId,
        publicKey: identity.publicKey,
        deviceFingerprint: identity.deviceFingerprint,
        networkCapabilities: identity.networkCapabilities,
        signature: identityManager.createIdentitySignature(),
        ...additionalInfo,
      };

      const data = JSON.stringify(contactInfo);

      return await QRCode.toDataURL(data, {
        errorCorrectionLevel: 'M', // Medium for more data
        type: 'image/png',
        width: 512,
        margin: 2,
      });
    } catch (error) {
      throw new SecurityError(
        'Failed to generate business card QR',
        'BUSINESS_CARD_ERROR',
        error
      );
    }
  }
}

// Singleton instance
export const qrExchange = new QRExchange();
