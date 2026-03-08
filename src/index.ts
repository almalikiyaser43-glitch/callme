/**
 * CallMe X - Decentralized Communication Platform
 * Main entry point
 */

// Core
export { CallMeX } from './core/CallMeX';
export { QRExchange, qrExchange } from './core/QRExchange';

// Security
export { CryptoService, cryptoService } from './security/crypto/CryptoService';
export { IdentityManager, identityManager } from './security/identity/IdentityManager';

// Network
export { PeerDiscovery, peerDiscovery } from './network/discovery/PeerDiscovery';
export { RoutingEngine, routingEngine } from './network/routing/RoutingEngine';
export { MeshNetwork, meshNetwork } from './network/mesh/MeshNetwork';
export { ConnectionManager, connectionManager } from './network/ConnectionManager';
export { MessageTransport, messageTransport } from './network/transport/MessageTransport';

// Storage
export { DistributedStorage } from './storage/DistributedStorage';

// UI
export { NetworkMonitor, networkMonitor } from './ui/dashboard/NetworkMonitor';

// Types
export * from './types';

// Version
export const VERSION = '1.0.0';

// Default export
export default CallMeX;
