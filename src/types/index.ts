/**
 * Core type definitions for CallMe X
 */

// ============= Identity Types =============

export interface Identity {
  userId: string;
  publicKey: string;
  privateKey: string; // Never transmitted, local only
  deviceFingerprint: string;
  networkCapabilities: NetworkCapability[];
  reputation: number;
  createdAt: number;
  lastSeen: number;
}

export interface PublicIdentity {
  userId: string;
  publicKey: string;
  deviceFingerprint: string;
  networkCapabilities: NetworkCapability[];
  reputation: number;
  lastSeen: number;
}

export interface NetworkCapability {
  type: TransportType;
  available: boolean;
  strength: number; // 0-100
  metadata?: Record<string, any>;
}

// ============= Transport Types =============

export type TransportType =
  | 'bluetooth-le'
  | 'bluetooth-classic'
  | 'wifi-direct'
  | 'lan'
  | 'webrtc'
  | 'relay';

export interface Connection {
  id: string;
  peerId: string;
  transport: TransportType;
  status: 'connecting' | 'connected' | 'disconnected' | 'failed';
  quality: ConnectionQuality;
  createdAt: number;
  lastActivity: number;
}

export interface ConnectionQuality {
  signalStrength: number; // 0-100
  latency: number; // ms
  bandwidth: number; // bytes/s
  reliability: number; // 0-1
  batteryImpact: number; // 0-100
}

// ============= Peer Types =============

export interface Peer {
  id: string;
  identity: PublicIdentity;
  connections: Connection[];
  isRelay: boolean;
  distance: number; // hop count
  lastSeen: number;
  metadata?: Record<string, any>;
}

export interface MeshNode extends Peer {
  routes: Route[];
  neighbors: string[]; // peer IDs
  capabilities: NetworkCapability[];
  reputation: number;
}

// ============= Routing Types =============

export interface Route {
  destination: string;
  hops: string[]; // peer IDs in path
  estimatedLatency: number;
  reliability: number;
  cost: number;
  lastUsed: number;
  successCount: number;
  failureCount: number;
}

export interface RouteScore {
  signalStrength: number;
  latency: number;
  hopCount: number;
  reliability: number;
  batteryImpact: number;
  congestion: number;
  totalScore: number;
}

export interface RoutingTable {
  routes: Map<string, Route[]>;
  lastUpdated: number;
}

// ============= Message Types =============

export interface Message {
  id: string;
  type: MessageType;
  from: string;
  to: string;
  content: EncryptedPayload;
  signature: string;
  timestamp: number;
  ttl: number; // seconds
  hops: number;
  maxHops: number;
  route: string[]; // peer IDs in actual path
  metadata?: Record<string, any>;
}

export type MessageType =
  | 'text'
  | 'file'
  | 'control'
  | 'discovery'
  | 'routing'
  | 'ack';

export interface EncryptedPayload {
  ciphertext: string; // base64
  nonce: string; // base64
  ephemeralPublicKey: string; // base64
}

export interface MessageEnvelope {
  version: string;
  type: MessageType;
  messageId: string;
  from: string;
  to: string;
  timestamp: number;
  ttl: number;
  hops: number;
  maxHops: number;
  route: string[];
  payload: EncryptedPayload;
  signature: string;
}

// ============= Security Types =============

export interface KeyPair {
  publicKey: Uint8Array;
  secretKey: Uint8Array;
}

export interface SharedSecret {
  secret: Uint8Array;
  timestamp: number;
}

export interface CryptoKeys {
  identityKeys: KeyPair; // Ed25519 signing keys
  encryptionKeys: KeyPair; // X25519 encryption keys
}

// ============= Network Types =============

export interface NetworkTopology {
  nodes: Map<string, MeshNode>;
  edges: NetworkEdge[];
  partitions: string[][]; // groups of connected node IDs
  lastUpdated: number;
}

export interface NetworkEdge {
  from: string;
  to: string;
  weight: number;
  transport: TransportType;
  quality: ConnectionQuality;
}

export interface NetworkGraph {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

export interface GraphNode {
  id: string;
  label: string;
  type: 'self' | 'peer' | 'relay';
  online: boolean;
  reputation: number;
}

export interface GraphEdge {
  from: string;
  to: string;
  transport: TransportType;
  quality: number;
  latency: number;
}

export interface NetworkHealth {
  nodeCount: number;
  activeConnections: number;
  averageLatency: number;
  messageDeliveryRate: number;
  networkPartitions: number;
  timestamp: number;
}

export interface NetworkMetrics {
  totalMessages: number;
  messagesDelivered: number;
  messagesFailed: number;
  averageHops: number;
  averageLatency: number;
  peakThroughput: number;
  activePeers: number;
  uptime: number;
}

// ============= Discovery Types =============

export interface DiscoveryMessage {
  type: 'announce' | 'query' | 'response';
  messageId: string;
  nodeInfo: PublicIdentity;
  timestamp: number;
  signature: string;
}

export interface RoutingUpdate {
  type: 'update' | 'query' | 'response';
  messageId: string;
  routes: Route[];
  timestamp: number;
  signature: string;
}

// ============= Contact Types =============

export interface Contact {
  userId: string;
  publicKey: string;
  deviceFingerprint: string;
  networkCapabilities: NetworkCapability[];
  displayName?: string;
  avatar?: string;
  addedAt: number;
  lastSeen: number;
  verified: boolean;
}

export interface ContactInfo {
  userId: string;
  publicKey: string;
  deviceFingerprint: string;
  networkCapabilities: NetworkCapability[];
  displayName?: string;
  signature: string;
}

// ============= Storage Types =============

export interface StorageConfig {
  path: string;
  encrypted: boolean;
  maxSize: number;
  replicationFactor: number;
}

export interface MessageQueue {
  pending: Message[];
  failed: Message[];
  delivered: string[]; // message IDs
}

// ============= Configuration Types =============

export interface CallMeConfig {
  identity: Identity;
  network: NetworkConfig;
  security: SecurityConfig;
  storage: StorageConfig;
  ui: UIConfig;
}

export interface NetworkConfig {
  enableBluetooth: boolean;
  enableBluetoothLE: boolean;
  enableWiFiDirect: boolean;
  enableLAN: boolean;
  enableWebRTC: boolean;
  enableRelay: boolean;
  relayServers: string[];
  maxConnections: number;
  maxHops: number;
  discoveryInterval: number; // ms
  routingUpdateInterval: number; // ms
}

export interface SecurityConfig {
  encryptAll: boolean;
  forwardSecrecy: boolean;
  requireSignatures: boolean;
  trustOnFirstUse: boolean;
  minReputation: number;
}

export interface UIConfig {
  theme: 'light' | 'dark';
  language: string;
  notifications: boolean;
  showNetworkGraph: boolean;
}

// ============= Event Types =============

export type NetworkEvent =
  | { type: 'peer-discovered'; peer: Peer }
  | { type: 'peer-connected'; peerId: string }
  | { type: 'peer-disconnected'; peerId: string }
  | { type: 'message-received'; message: Message }
  | { type: 'message-sent'; messageId: string }
  | { type: 'message-delivered'; messageId: string }
  | { type: 'message-failed'; messageId: string; error: string }
  | { type: 'topology-updated'; topology: NetworkTopology }
  | { type: 'route-updated'; destination: string; route: Route };

// ============= Error Types =============

export class NetworkError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'NetworkError';
  }
}

export class SecurityError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'SecurityError';
  }
}

export class RoutingError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'RoutingError';
  }
}
