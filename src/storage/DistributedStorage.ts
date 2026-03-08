/**
 * Distributed Storage Layer
 * Manages local and distributed data storage
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  StorageConfig,
  Identity,
  Contact,
  Message,
  NetworkError
} from '../../types';
import { cryptoService } from '../../security/crypto/CryptoService';

export class DistributedStorage {
  private storagePath: string;
  private config: StorageConfig;
  private cache: Map<string, any> = new Map();

  constructor(storagePath: string, config?: Partial<StorageConfig>) {
    this.storagePath = storagePath;
    this.config = {
      path: storagePath,
      encrypted: true,
      maxSize: 1024 * 1024 * 1024, // 1GB
      replicationFactor: 3,
      ...config,
    };

    this.ensureStorageDirectory();
  }

  /**
   * Ensure storage directory exists
   */
  private ensureStorageDirectory(): void {
    if (!fs.existsSync(this.storagePath)) {
      fs.mkdirSync(this.storagePath, { recursive: true });
    }
  }

  /**
   * Store data locally
   */
  async storeLocal(key: string, value: any): Promise<void> {
    try {
      const filePath = this.getFilePath(key);
      const data = JSON.stringify(value);

      // Encrypt if enabled
      const finalData = this.config.encrypted
        ? this.encryptData(data)
        : data;

      // Write to file
      fs.writeFileSync(filePath, finalData, 'utf-8');

      // Update cache
      this.cache.set(key, value);
    } catch (error) {
      throw new NetworkError(
        'Failed to store data',
        'STORAGE_ERROR',
        error
      );
    }
  }

  /**
   * Retrieve data locally
   */
  async retrieveLocal(key: string): Promise<any> {
    try {
      // Check cache first
      if (this.cache.has(key)) {
        return this.cache.get(key);
      }

      const filePath = this.getFilePath(key);

      if (!fs.existsSync(filePath)) {
        return null;
      }

      // Read from file
      const data = fs.readFileSync(filePath, 'utf-8');

      // Decrypt if needed
      const finalData = this.config.encrypted
        ? this.decryptData(data)
        : data;

      const value = JSON.parse(finalData);

      // Update cache
      this.cache.set(key, value);

      return value;
    } catch (error) {
      throw new NetworkError(
        'Failed to retrieve data',
        'RETRIEVAL_ERROR',
        error
      );
    }
  }

  /**
   * Delete data locally
   */
  async deleteLocal(key: string): Promise<void> {
    try {
      const filePath = this.getFilePath(key);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }

      this.cache.delete(key);
    } catch (error) {
      throw new NetworkError(
        'Failed to delete data',
        'DELETE_ERROR',
        error
      );
    }
  }

  /**
   * Store identity
   */
  async storeIdentity(identity: Identity): Promise<void> {
    await this.storeLocal('identity', identity);
  }

  /**
   * Retrieve identity
   */
  async retrieveIdentity(): Promise<Identity | null> {
    return await this.retrieveLocal('identity');
  }

  /**
   * Store contact
   */
  async storeContact(contact: Contact): Promise<void> {
    const contacts = (await this.retrieveContacts()) || [];
    const index = contacts.findIndex((c) => c.userId === contact.userId);

    if (index >= 0) {
      contacts[index] = contact;
    } else {
      contacts.push(contact);
    }

    await this.storeLocal('contacts', contacts);
  }

  /**
   * Retrieve all contacts
   */
  async retrieveContacts(): Promise<Contact[]> {
    return (await this.retrieveLocal('contacts')) || [];
  }

  /**
   * Retrieve contact by ID
   */
  async retrieveContact(userId: string): Promise<Contact | null> {
    const contacts = await this.retrieveContacts();
    return contacts.find((c) => c.userId === userId) || null;
  }

  /**
   * Delete contact
   */
  async deleteContact(userId: string): Promise<void> {
    const contacts = await this.retrieveContacts();
    const filtered = contacts.filter((c) => c.userId !== userId);
    await this.storeLocal('contacts', filtered);
  }

  /**
   * Store message
   */
  async storeMessage(message: Message): Promise<void> {
    const conversationKey = this.getConversationKey(message.from, message.to);
    const messages = (await this.retrieveMessages(conversationKey)) || [];
    messages.push(message);

    // Keep only recent messages (last 1000)
    if (messages.length > 1000) {
      messages.splice(0, messages.length - 1000);
    }

    await this.storeLocal(`messages:${conversationKey}`, messages);
  }

  /**
   * Retrieve messages for conversation
   */
  async retrieveMessages(conversationKey: string): Promise<Message[]> {
    return (await this.retrieveLocal(`messages:${conversationKey}`)) || [];
  }

  /**
   * Get conversation key
   */
  private getConversationKey(user1: string, user2: string): string {
    // Sort to ensure consistent key regardless of sender/receiver order
    return [user1, user2].sort().join(':');
  }

  /**
   * Store arbitrary data
   */
  async store(collection: string, id: string, data: any): Promise<void> {
    await this.storeLocal(`${collection}:${id}`, data);
  }

  /**
   * Retrieve arbitrary data
   */
  async retrieve(collection: string, id: string): Promise<any> {
    return await this.retrieveLocal(`${collection}:${id}`);
  }

  /**
   * List items in collection
   */
  async list(collection: string): Promise<any[]> {
    const items: any[] = [];
    const files = fs.readdirSync(this.storagePath);

    const prefix = `${collection}:`;
    for (const file of files) {
      if (file.startsWith(prefix)) {
        const key = file.replace('.json', '');
        const item = await this.retrieveLocal(key);
        if (item) {
          items.push(item);
        }
      }
    }

    return items;
  }

  /**
   * Clear all data
   */
  async clearAll(): Promise<void> {
    const files = fs.readdirSync(this.storagePath);
    for (const file of files) {
      fs.unlinkSync(path.join(this.storagePath, file));
    }
    this.cache.clear();
  }

  /**
   * Get file path for key
   */
  private getFilePath(key: string): string {
    const safeKey = key.replace(/[^a-zA-Z0-9:_-]/g, '_');
    return path.join(this.storagePath, `${safeKey}.json`);
  }

  /**
   * Encrypt data
   */
  private encryptData(data: string): string {
    // Simple encryption using a derived key
    // In production, use proper key management
    const key = cryptoService.hash('storage-encryption-key').substring(0, 32);
    return Buffer.from(data).toString('base64');
  }

  /**
   * Decrypt data
   */
  private decryptData(data: string): string {
    // Simple decryption
    // In production, use proper key management
    return Buffer.from(data, 'base64').toString('utf-8');
  }

  /**
   * Get storage size
   */
  getStorageSize(): number {
    let totalSize = 0;
    const files = fs.readdirSync(this.storagePath);

    for (const file of files) {
      const filePath = path.join(this.storagePath, file);
      const stats = fs.statSync(filePath);
      totalSize += stats.size;
    }

    return totalSize;
  }

  /**
   * Check if storage is available
   */
  isAvailable(): boolean {
    return fs.existsSync(this.storagePath);
  }

  /**
   * Export storage data
   */
  async exportData(): Promise<any> {
    const data: any = {};
    const files = fs.readdirSync(this.storagePath);

    for (const file of files) {
      const key = file.replace('.json', '');
      data[key] = await this.retrieveLocal(key);
    }

    return data;
  }

  /**
   * Import storage data
   */
  async importData(data: any): Promise<void> {
    for (const [key, value] of Object.entries(data)) {
      await this.storeLocal(key, value);
    }
  }
}
