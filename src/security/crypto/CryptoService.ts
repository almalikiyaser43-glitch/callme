/**
 * Cryptographic Security Layer
 * Implements end-to-end encryption, signing, and key management
 */

import * as nacl from 'tweetnacl';
import {
  decodeUTF8,
  encodeUTF8,
  encodeBase64,
  decodeBase64
} from 'tweetnacl-util';
import {
  KeyPair,
  EncryptedPayload,
  SharedSecret,
  CryptoKeys,
  SecurityError
} from '../types';

export class CryptoService {
  /**
   * Generate a new Ed25519 key pair for signing
   */
  generateSigningKeyPair(): KeyPair {
    const keyPair = nacl.sign.keyPair();
    return {
      publicKey: keyPair.publicKey,
      secretKey: keyPair.secretKey,
    };
  }

  /**
   * Generate a new X25519 key pair for encryption
   */
  generateEncryptionKeyPair(): KeyPair {
    const keyPair = nacl.box.keyPair();
    return {
      publicKey: keyPair.publicKey,
      secretKey: keyPair.secretKey,
    };
  }

  /**
   * Generate both signing and encryption key pairs
   */
  generateIdentityKeys(): CryptoKeys {
    return {
      identityKeys: this.generateSigningKeyPair(),
      encryptionKeys: this.generateEncryptionKeyPair(),
    };
  }

  /**
   * Sign a message with Ed25519
   */
  sign(message: string, secretKey: Uint8Array): string {
    const messageBytes = decodeUTF8(message);
    const signature = nacl.sign.detached(messageBytes, secretKey);
    return encodeBase64(signature);
  }

  /**
   * Verify a signature
   */
  verify(message: string, signature: string, publicKey: Uint8Array): boolean {
    try {
      const messageBytes = decodeUTF8(message);
      const signatureBytes = decodeBase64(signature);
      return nacl.sign.detached.verify(messageBytes, signatureBytes, publicKey);
    } catch (error) {
      return false;
    }
  }

  /**
   * Encrypt a message with forward secrecy (using ephemeral key pair)
   */
  encrypt(
    message: string,
    recipientPublicKey: Uint8Array
  ): EncryptedPayload {
    // Generate ephemeral key pair for forward secrecy
    const ephemeralKeyPair = nacl.box.keyPair();
    const nonce = nacl.randomBytes(nacl.box.nonceLength);
    const messageBytes = decodeUTF8(message);

    const ciphertext = nacl.box(
      messageBytes,
      nonce,
      recipientPublicKey,
      ephemeralKeyPair.secretKey
    );

    if (!ciphertext) {
      throw new SecurityError(
        'Encryption failed',
        'ENCRYPTION_FAILED'
      );
    }

    return {
      ciphertext: encodeBase64(ciphertext),
      nonce: encodeBase64(nonce),
      ephemeralPublicKey: encodeBase64(ephemeralKeyPair.publicKey),
    };
  }

  /**
   * Decrypt a message
   */
  decrypt(
    payload: EncryptedPayload,
    recipientSecretKey: Uint8Array
  ): string {
    try {
      const ciphertext = decodeBase64(payload.ciphertext);
      const nonce = decodeBase64(payload.nonce);
      const ephemeralPublicKey = decodeBase64(payload.ephemeralPublicKey);

      const decrypted = nacl.box.open(
        ciphertext,
        nonce,
        ephemeralPublicKey,
        recipientSecretKey
      );

      if (!decrypted) {
        throw new SecurityError(
          'Decryption failed',
          'DECRYPTION_FAILED'
        );
      }

      return encodeUTF8(decrypted);
    } catch (error) {
      throw new SecurityError(
        'Failed to decrypt message',
        'DECRYPTION_ERROR',
        error
      );
    }
  }

  /**
   * Encrypt and sign a message
   */
  encryptAndSign(
    message: string,
    recipientPublicKey: Uint8Array,
    senderSecretKey: Uint8Array
  ): { payload: EncryptedPayload; signature: string } {
    const payload = this.encrypt(message, recipientPublicKey);

    // Sign the encrypted payload for authenticity
    const payloadString = JSON.stringify(payload);
    const signature = this.sign(payloadString, senderSecretKey);

    return { payload, signature };
  }

  /**
   * Verify signature and decrypt message
   */
  verifyAndDecrypt(
    payload: EncryptedPayload,
    signature: string,
    senderPublicKey: Uint8Array,
    recipientSecretKey: Uint8Array
  ): string {
    // Verify signature first
    const payloadString = JSON.stringify(payload);
    const isValid = this.verify(payloadString, signature, senderPublicKey);

    if (!isValid) {
      throw new SecurityError(
        'Invalid signature',
        'INVALID_SIGNATURE'
      );
    }

    // Decrypt after verification
    return this.decrypt(payload, recipientSecretKey);
  }

  /**
   * Perform Diffie-Hellman key exchange
   */
  keyExchange(
    mySecretKey: Uint8Array,
    theirPublicKey: Uint8Array
  ): SharedSecret {
    const secret = nacl.box.before(theirPublicKey, mySecretKey);
    return {
      secret,
      timestamp: Date.now(),
    };
  }

  /**
   * Encrypt with shared secret (session key)
   */
  encryptWithSharedSecret(
    message: string,
    sharedSecret: Uint8Array
  ): EncryptedPayload {
    const nonce = nacl.randomBytes(nacl.secretbox.nonceLength);
    const messageBytes = decodeUTF8(message);

    const ciphertext = nacl.secretbox(messageBytes, nonce, sharedSecret);

    if (!ciphertext) {
      throw new SecurityError(
        'Encryption with shared secret failed',
        'SHARED_SECRET_ENCRYPTION_FAILED'
      );
    }

    return {
      ciphertext: encodeBase64(ciphertext),
      nonce: encodeBase64(nonce),
      ephemeralPublicKey: '', // Not used in shared secret encryption
    };
  }

  /**
   * Decrypt with shared secret (session key)
   */
  decryptWithSharedSecret(
    payload: EncryptedPayload,
    sharedSecret: Uint8Array
  ): string {
    try {
      const ciphertext = decodeBase64(payload.ciphertext);
      const nonce = decodeBase64(payload.nonce);

      const decrypted = nacl.secretbox.open(ciphertext, nonce, sharedSecret);

      if (!decrypted) {
        throw new SecurityError(
          'Decryption with shared secret failed',
          'SHARED_SECRET_DECRYPTION_FAILED'
        );
      }

      return encodeUTF8(decrypted);
    } catch (error) {
      throw new SecurityError(
        'Failed to decrypt with shared secret',
        'SHARED_SECRET_DECRYPTION_ERROR',
        error
      );
    }
  }

  /**
   * Generate a cryptographic hash (SHA-256 equivalent using NaCl)
   */
  hash(data: string): string {
    const dataBytes = decodeUTF8(data);
    const hash = nacl.hash(dataBytes);
    return encodeBase64(hash);
  }

  /**
   * Generate device fingerprint from device properties
   */
  generateDeviceFingerprint(deviceInfo: Record<string, any>): string {
    const infoString = JSON.stringify(deviceInfo);
    return this.hash(infoString).substring(0, 32);
  }

  /**
   * Verify message integrity
   */
  verifyIntegrity(message: string, hash: string): boolean {
    const computedHash = this.hash(message);
    return computedHash === hash;
  }

  /**
   * Generate random bytes for nonces, IDs, etc.
   */
  randomBytes(length: number): Uint8Array {
    return nacl.randomBytes(length);
  }

  /**
   * Generate a random ID
   */
  generateId(): string {
    const bytes = this.randomBytes(16);
    return encodeBase64(bytes);
  }

  /**
   * Convert public key to base64 string
   */
  publicKeyToString(publicKey: Uint8Array): string {
    return encodeBase64(publicKey);
  }

  /**
   * Convert base64 string to public key
   */
  stringToPublicKey(str: string): Uint8Array {
    return decodeBase64(str);
  }

  /**
   * Convert secret key to base64 string
   */
  secretKeyToString(secretKey: Uint8Array): string {
    return encodeBase64(secretKey);
  }

  /**
   * Convert base64 string to secret key
   */
  stringToSecretKey(str: string): Uint8Array {
    return decodeBase64(str);
  }
}

// Singleton instance
export const cryptoService = new CryptoService();
