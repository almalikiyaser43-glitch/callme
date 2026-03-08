# CallMe X - Decentralized Communication Platform Architecture

## Overview

CallMe X is an advanced decentralized, peer-to-peer communication platform that operates without centralized infrastructure. It supports multi-transport communication, automatic mesh networking, and intelligent routing.

## System Architecture

### High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT INTERFACE LAYER                        │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │
│  │   Mobile UI  │  │  Desktop UI  │  │  Network Admin Panel   │  │
│  └──────────────┘  └──────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                         APPLICATION LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │
│  │  Contact Mgr │  │  Message Mgr │  │     QR Exchange        │  │
│  └──────────────┘  └──────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                       DISTRIBUTED IDENTITY LAYER                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │  Identity Manager │ Key Management │ Device Fingerprinting   │  │
│  └──────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                          SECURITY LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │
│  │ E2E Encrypt  │  │  Signature   │  │   Forward Secrecy      │  │
│  └──────────────┘  └──────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                      MESH NETWORKING LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │
│  │ Peer Disc.   │  │  AI Routing  │  │   Network Topology     │  │
│  └──────────────┘  └──────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    CONNECTION MANAGER LAYER                          │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌─────────────────┐  │
│  │  BLE   │ │  BT    │ │  WiFi  │ │  LAN   │ │  WebRTC/Relay  │  │
│  └────────┘ └────────┘ └────────┘ └────────┘ └─────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                    DISTRIBUTED STORAGE LAYER                         │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────────┐  │
│  │  Local DB    │  │ Message Queue│  │  Distributed Cache     │  │
│  └──────────────┘  └──────────────┘  └─────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────┘
                                ↓
┌─────────────────────────────────────────────────────────────────────┐
│                        TRANSPORT LAYER                               │
│              Physical Network Interfaces & Protocols                 │
└─────────────────────────────────────────────────────────────────────┘
```

## Core Components

### 1. Distributed Identity System

Each device/user has a cryptographically-secured identity:

```typescript
interface Identity {
  userId: string;              // Unique identifier
  publicKey: string;           // Ed25519 public key
  privateKey: string;          // Ed25519 private key (local only)
  deviceFingerprint: string;   // Unique device hash
  networkCapabilities: NetworkCapability[];
  reputation: number;          // Peer reputation score
  createdAt: number;
  lastSeen: number;
}

interface NetworkCapability {
  type: 'bluetooth' | 'bluetooth-le' | 'wifi-direct' | 'lan' | 'webrtc' | 'relay';
  available: boolean;
  strength: number;
}
```

### 2. Peer Discovery Layer

Automatically discovers nearby peers using multiple methods:

```typescript
interface PeerDiscovery {
  // BLE advertising
  bleAdvertise(): void;
  bleScan(): Promise<Peer[]>;

  // Bluetooth classic discovery
  bluetoothDiscover(): Promise<Peer[]>;

  // WiFi Direct/LAN multicast
  lanMulticast(): void;
  lanDiscover(): Promise<Peer[]>;

  // WebRTC signaling
  webrtcSignal(): void;
  webrtcDiscover(): Promise<Peer[]>;

  // Unified discovery
  discoverAll(): Promise<Peer[]>;
}
```

### 3. Connection Manager

Manages all transport types with automatic failover:

```typescript
interface ConnectionManager {
  priority: TransportType[];
  activeConnections: Map<string, Connection>;

  connect(peer: Peer): Promise<Connection>;
  disconnect(peerId: string): void;
  selectBestTransport(peer: Peer): TransportType;
  monitorConnectionHealth(): void;
}

type TransportType =
  | 'bluetooth-le'
  | 'bluetooth-classic'
  | 'wifi-direct'
  | 'lan'
  | 'webrtc'
  | 'relay';
```

### 4. AI-Powered Routing Engine

Intelligent message routing with path optimization:

```typescript
interface RoutingEngine {
  routingTable: Map<string, Route[]>;
  networkGraph: NetworkGraph;

  findRoute(destination: string): Route;
  optimizeRoute(route: Route): Route;
  learnFromHistory(message: Message, latency: number): void;
  calculateScore(route: Route): number;
}

interface Route {
  destination: string;
  hops: Peer[];
  estimatedLatency: number;
  reliability: number;
  cost: number;
  lastUsed: number;
}

interface RouteScore {
  signalStrength: number;    // 0-100
  latency: number;           // ms
  hopCount: number;
  reliability: number;       // 0-1
  batteryImpact: number;     // 0-100
  congestion: number;        // 0-100
}
```

### 5. Mesh Networking

Self-organizing, self-healing mesh network:

```typescript
interface MeshNetwork {
  nodes: Map<string, MeshNode>;
  topology: NetworkTopology;

  addNode(node: MeshNode): void;
  removeNode(nodeId: string): void;
  updateTopology(): void;
  healNetwork(): void;
  routeMessage(message: Message): void;
}

interface MeshNode {
  id: string;
  identity: Identity;
  connections: Connection[];
  isRelay: boolean;
  capabilities: NetworkCapability[];
  reputation: number;
  lastSeen: number;
}
```

### 6. Message Transport Engine

Handles message delivery across the mesh:

```typescript
interface MessageTransport {
  sendDirect(message: Message, peer: Peer): Promise<void>;
  sendMultiHop(message: Message, route: Route): Promise<void>;
  queueOffline(message: Message): void;
  deliverQueued(peerId: string): Promise<void>;
}

interface Message {
  id: string;
  from: string;
  to: string;
  content: EncryptedPayload;
  signature: string;
  timestamp: number;
  ttl: number;
  hops: number;
  maxHops: number;
  route: string[];
}
```

### 7. Security Layer

End-to-end encryption with forward secrecy:

```typescript
interface SecurityLayer {
  generateKeyPair(): KeyPair;
  encryptMessage(message: string, recipientPublicKey: string): EncryptedPayload;
  decryptMessage(payload: EncryptedPayload, senderPublicKey: string): string;
  signMessage(message: string): string;
  verifySignature(message: string, signature: string, publicKey: string): boolean;
  performKeyExchange(peer: Peer): SharedSecret;
}

interface EncryptedPayload {
  ciphertext: string;
  nonce: string;
  ephemeralPublicKey: string;
}
```

### 8. Distributed Storage

Distributed data storage across nodes:

```typescript
interface DistributedStorage {
  localStore: LocalDatabase;
  distributedCache: DistributedCache;
  messageQueue: MessageQueue;

  storeLocal(key: string, value: any): Promise<void>;
  retrieveLocal(key: string): Promise<any>;
  replicateToNetwork(key: string, value: any): Promise<void>;
  syncWithPeers(): Promise<void>;
}
```

### 9. QR Contact Exchange

Secure contact exchange via QR codes:

```typescript
interface QRExchange {
  generateQR(identity: Identity): string;
  scanQR(qrData: string): ContactInfo;
  verifyContact(contact: ContactInfo): boolean;
  addContact(contact: ContactInfo): Promise<void>;
}

interface ContactInfo {
  userId: string;
  publicKey: string;
  deviceFingerprint: string;
  networkCapabilities: NetworkCapability[];
  signature: string;
}
```

### 10. Network Monitor Dashboard

Real-time network visualization:

```typescript
interface NetworkMonitor {
  visualizeTopology(): NetworkGraph;
  showActiveConnections(): Connection[];
  displayRoutes(destination: string): Route[];
  monitorHealth(): NetworkHealth;
  exportMetrics(): NetworkMetrics;
}

interface NetworkHealth {
  nodeCount: number;
  activeConnections: number;
  averageLatency: number;
  messageDeliveryRate: number;
  networkPartitions: number;
}
```

## Communication Workflows

### Workflow 1: Device Discovery & Connection

```
1. Device A starts discovery
   ├─> BLE scan
   ├─> Bluetooth discovery
   ├─> LAN multicast
   └─> WebRTC signaling

2. Device B responds with capability advertisement
   └─> Sends: Identity, NetworkCapabilities, PublicKey

3. Device A selects best transport
   └─> Evaluates: signal strength, latency, battery, bandwidth

4. Establish connection
   ├─> Perform cryptographic handshake
   ├─> Exchange session keys
   └─> Add to routing table

5. Maintain connection
   ├─> Send keepalive packets
   ├─> Monitor connection health
   └─> Auto-failover if needed
```

### Workflow 2: Direct Message Send

```
1. User A composes message
   └─> Message content entered

2. Encrypt message
   ├─> Retrieve recipient public key
   ├─> Generate ephemeral key pair
   ├─> Encrypt with recipient public key
   └─> Sign with sender private key

3. Check direct connectivity
   └─> If connected: send directly
       └─> Device B receives and decrypts
   └─> If not connected: use mesh routing
```

### Workflow 3: Multi-Hop Mesh Routing

```
1. Device A wants to send to Device F
   └─> No direct connection available

2. AI Routing Engine calculates best path
   ├─> Query network topology
   ├─> Calculate all possible routes
   ├─> Score each route based on:
   │   ├─> Hop count
   │   ├─> Latency
   │   ├─> Reliability
   │   └─> Node reputation
   └─> Select optimal route: A → C → F

3. Send message through mesh
   ├─> A encrypts and sends to C
   ├─> C verifies signature
   ├─> C forwards to F
   └─> F decrypts and delivers

4. Send acknowledgment back
   └─> F → C → A (ACK)

5. Update routing intelligence
   ├─> Record actual latency
   ├─> Update route scores
   └─> Learn for future optimization
```

### Workflow 4: QR Contact Exchange

```
1. User A opens "Add Contact"
   └─> Generates QR code with:
       ├─> userId
       ├─> publicKey
       ├─> deviceFingerprint
       ├─> networkCapabilities
       └─> signature

2. User B scans QR code
   ├─> Parse QR data
   ├─> Verify cryptographic signature
   └─> Validate identity

3. Perform key exchange
   ├─> Exchange public keys
   ├─> Establish shared secret
   └─> Store contact securely

4. Add to contact list
   └─> Contact now available for messaging
```

### Workflow 5: Offline Message Queue

```
1. Device A sends message to offline Device F
   └─> F is not reachable

2. Store in local queue
   ├─> Encrypt message
   ├─> Store locally
   └─> Set TTL (time to live)

3. Periodically check for F
   └─> Run discovery every N seconds

4. When F comes online
   ├─> Detect F's presence
   ├─> Establish connection
   └─> Deliver queued messages

5. Receive acknowledgment
   └─> Remove from queue
```

### Workflow 6: Network Self-Healing

```
1. Detect node failure
   └─> Device C stops responding

2. Remove from topology
   ├─> Mark C as unavailable
   └─> Remove C from routing table

3. Recalculate affected routes
   ├─> Find alternative paths
   └─> Update routing table

4. Notify affected peers
   └─> Broadcast topology update

5. Reroute pending messages
   └─> Use new optimal routes
```

## Network Protocols

### Protocol Stack

```
┌────────────────────────────────────────┐
│      Application Protocol (JSON)       │
├────────────────────────────────────────┤
│    Encryption Layer (NaCl/libsodium)   │
├────────────────────────────────────────┤
│     Mesh Routing Protocol (Custom)     │
├────────────────────────────────────────┤
│  Transport Layer (BT/WiFi/WebRTC/LAN)  │
└────────────────────────────────────────┘
```

### Message Format

```json
{
  "version": "1.0",
  "type": "message|ack|discovery|routing|control",
  "messageId": "uuid",
  "from": "userId",
  "to": "userId",
  "timestamp": 1234567890,
  "ttl": 3600,
  "hops": 0,
  "maxHops": 10,
  "route": ["nodeId1", "nodeId2"],
  "payload": {
    "encrypted": "base64-encrypted-data",
    "nonce": "base64-nonce",
    "ephemeralPublicKey": "base64-key"
  },
  "signature": "base64-signature"
}
```

### Discovery Protocol

```json
{
  "type": "discovery",
  "messageId": "uuid",
  "discoveryType": "announce|query|response",
  "nodeInfo": {
    "userId": "unique-id",
    "publicKey": "base64-public-key",
    "deviceFingerprint": "hash",
    "capabilities": [
      {"type": "bluetooth-le", "available": true, "strength": 85},
      {"type": "lan", "available": true, "strength": 95}
    ],
    "timestamp": 1234567890,
    "signature": "base64-signature"
  }
}
```

### Routing Protocol

```json
{
  "type": "routing",
  "messageId": "uuid",
  "routingType": "update|query|response",
  "routes": [
    {
      "destination": "userId",
      "nextHop": "nodeId",
      "hopCount": 2,
      "latency": 150,
      "reliability": 0.95,
      "timestamp": 1234567890
    }
  ],
  "signature": "base64-signature"
}
```

## Security Architecture

### Cryptographic Primitives

- **Identity Keys**: Ed25519 (signing)
- **Encryption**: X25519 + XSalsa20-Poly1305 (NaCl box)
- **Hashing**: SHA-256, BLAKE2b
- **Key Derivation**: HKDF
- **Random**: CSPRNG (crypto.randomBytes)

### Threat Model

**Protected Against:**
- Man-in-the-middle attacks
- Message tampering
- Impersonation
- Replay attacks
- Traffic analysis (limited)
- Unauthorized message reading

**Not Protected Against:**
- Compromised devices
- Physical access attacks
- Timing attacks (partial mitigation)
- Denial of service (mesh provides resilience)

### Key Management

```
Identity Keys (long-term)
├─> Generated on first launch
├─> Stored encrypted locally
└─> Never transmitted

Session Keys (ephemeral)
├─> Generated per message (forward secrecy)
├─> Derived from ECDH key exchange
└─> Discarded after use

Device Fingerprint
├─> Hash of device properties
├─> Used for device verification
└─> Publicly shareable
```

## Implementation Strategy

### Phase 1: Core Infrastructure (Week 1-2)
1. Project structure setup
2. Data models and types
3. Identity system
4. Security layer (crypto)
5. Local storage

### Phase 2: Transport Layer (Week 3-4)
1. Connection manager skeleton
2. LAN/UDP transport (easiest first)
3. WebRTC transport
4. Bluetooth abstraction layer

### Phase 3: Mesh Networking (Week 5-6)
1. Peer discovery
2. Basic routing
3. Multi-hop messaging
4. Network topology management

### Phase 4: Intelligence & Optimization (Week 7-8)
1. AI routing engine
2. Adaptive path selection
3. Network self-healing
4. Performance optimization

### Phase 5: User Features (Week 9-10)
1. QR contact exchange
2. Message queue
3. Offline support
4. Contact management

### Phase 6: Monitoring & Polish (Week 11-12)
1. Network dashboard
2. Debugging tools
3. Performance metrics
4. Documentation

## Technology Stack

### Core Technologies
- **Runtime**: Node.js / React Native / Electron
- **Language**: TypeScript
- **Cryptography**: libsodium / tweetnacl
- **Storage**: SQLite / LevelDB / IndexedDB
- **WebRTC**: simple-peer / peerjs
- **Bluetooth**: noble / noble-mac / react-native-ble-plx
- **WiFi Direct**: Native modules (platform-specific)

### Development Tools
- **Build**: Webpack / esbuild
- **Testing**: Jest / Mocha
- **Linting**: ESLint
- **Formatting**: Prettier

## Performance Targets

- **Message Latency**: < 100ms (direct), < 500ms (3 hops)
- **Discovery Time**: < 2 seconds
- **Connection Setup**: < 1 second
- **Throughput**: 1MB/s (local), 100KB/s (mesh)
- **Battery Efficiency**: < 5% drain per hour (idle)
- **Scale**: Support 1000+ nodes in network graph
- **Reliability**: 99.9% message delivery

## Deployment Models

### Mobile App (React Native)
- iOS and Android support
- Native Bluetooth/WiFi integration
- Background operation support

### Desktop App (Electron)
- Windows, macOS, Linux
- Full network monitoring
- Admin dashboard

### Web App (Browser)
- WebRTC only
- Limited functionality
- Relay-dependent

## Future Extensions

1. **Satellite Integration**: Connect to satellite networks for truly global coverage
2. **LoRa Support**: Long-range radio for remote areas
3. **Mesh Bridging**: Bridge multiple isolated mesh networks
4. **Group Messaging**: Efficient multicast protocols
5. **File Sharing**: Distributed file transfer protocol
6. **Voice/Video**: Real-time audio/video calls over mesh
7. **Blockchain Integration**: Decentralized reputation system
8. **AI Enhancement**: ML-based network optimization
