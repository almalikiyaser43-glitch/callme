# CallMe X

**Advanced Decentralized P2P Communication Platform**

CallMe X is a next-generation decentralized communication system that operates without centralized infrastructure. It supports multi-transport communication, automatic mesh networking, AI-powered routing, and end-to-end encryption.

## Features

### 🌐 Decentralized Architecture
- No central server required
- Peer-to-peer mesh networking
- Self-organizing network topology
- Automatic network healing

### 🔐 Security First
- End-to-end encryption (NaCl/libsodium)
- Forward secrecy for all messages
- Cryptographic identity verification
- Message signature verification

### 🚀 Multi-Transport Support
- Bluetooth Low Energy (BLE)
- Bluetooth Classic
- WiFi Direct
- Local Area Network (LAN)
- WebRTC
- Relay server fallback

### 🧠 AI-Powered Routing
- Intelligent path selection
- Dynamic route optimization
- Machine learning from network performance
- Automatic failover and recovery

### 📱 Offline-First
- Works completely offline via local networks
- Automatic message queuing
- Delivers messages when peers reconnect
- Mesh routing across multiple hops

### 📊 Network Monitoring
- Real-time network visualization
- Connection quality metrics
- Topology analysis
- Performance statistics

## Installation

```bash
npm install callme-x
```

## Quick Start

```typescript
import { CallMeX } from 'callme-x';

// Create instance
const callme = new CallMeX({
  network: {
    enableBluetooth: true,
    enableLAN: true,
    enableWebRTC: true,
    maxConnections: 50,
    maxHops: 10,
  },
  security: {
    encryptAll: true,
    forwardSecrecy: true,
  },
});

// Initialize
await callme.initialize();

// Start networking
await callme.start();

// Listen for events
callme.on('peer-discovered', (peer) => {
  console.log('Discovered peer:', peer.id);
});

callme.on('message-received', (message) => {
  console.log('Message from', message.from, ':', message.content);
});

// Generate QR code for contact exchange
const qrCode = await callme.generateContactQR('John Doe');
console.log('Share this QR code:', qrCode);

// Add contact by scanning QR
const contact = await callme.addContactFromQR(qrCodeData);

// Send message
await callme.sendMessage(contact.userId, 'Hello from CallMe X!');

// Get network health
const health = callme.getNetworkHealth();
console.log('Network status:', health);
```

## Architecture

CallMe X consists of multiple layers:

```
┌─────────────────────────────────────────┐
│      Application Layer (CallMeX)       │
├─────────────────────────────────────────┤
│        Identity & Security Layer        │
├─────────────────────────────────────────┤
│      Mesh Network & Routing Layer       │
├─────────────────────────────────────────┤
│        Connection Manager Layer         │
├─────────────────────────────────────────┤
│   Multi-Transport Layer (BT/WiFi/LAN)  │
├─────────────────────────────────────────┤
│       Distributed Storage Layer         │
└─────────────────────────────────────────┘
```

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## Core Concepts

### Identity System
Each user has a cryptographically-secured identity with:
- Unique user ID
- Ed25519 public/private key pair for signing
- X25519 key pair for encryption
- Device fingerprint
- Network capabilities

### Peer Discovery
Automatically discovers nearby peers using:
- BLE advertising and scanning
- Bluetooth discovery
- LAN multicast
- WebRTC signaling

### Mesh Networking
Forms a self-healing mesh network where:
- Each device is a node
- Nodes route messages for each other
- Network automatically adapts to topology changes
- Failed nodes are detected and routed around

### AI-Powered Routing
Intelligent routing engine that:
- Calculates optimal paths using multiple metrics
- Learns from historical performance
- Adapts to changing network conditions
- Balances latency, reliability, and battery usage

### Message Transport
Messages are delivered through:
- Direct peer-to-peer connections
- Multi-hop mesh routing
- Automatic retry and failover
- Offline message queuing

## API Documentation

### CallMeX Class

Main application class that orchestrates all components.

#### Constructor
```typescript
new CallMeX(config?: Partial<CallMeConfig>)
```

#### Methods

**initialize(): Promise<void>**
Initialize the platform and load/create identity.

**start(): Promise<void>**
Start the network services.

**stop(): Promise<void>**
Stop all network services.

**sendMessage(recipientId: string, content: string): Promise<string>**
Send a message to a contact.

**addContactFromQR(qrData: string): Promise<Contact>**
Add a contact by scanning their QR code.

**generateContactQR(displayName?: string): Promise<string>**
Generate a QR code for contact exchange.

**getContacts(): Promise<Contact[]>**
Get all stored contacts.

**getMessages(contactId: string): Promise<Message[]>**
Get conversation messages with a contact.

**getNetworkHealth(): NetworkHealth**
Get current network health metrics.

**getMetrics(): NetworkMetrics**
Get detailed network metrics.

**getPeers(): Peer[]**
Get all discovered peers.

**getRouteToPeer(peerId: string): Route | null**
Get the route to a specific peer.

#### Events

```typescript
callme.on('initialized', ({ identity }) => {});
callme.on('started', () => {});
callme.on('stopped', () => {});
callme.on('peer-discovered', (peer) => {});
callme.on('peer-removed', (peer) => {});
callme.on('message-received', (message) => {});
callme.on('message-delivered', (messageId) => {});
callme.on('message-failed', (messageId) => {});
callme.on('connection-established', (connection) => {});
callme.on('connection-closed', (connection) => {});
callme.on('topology-updated', (topology) => {});
callme.on('error', ({ type, error }) => {});
```

### Network Monitor

Real-time network monitoring and visualization.

```typescript
import { networkMonitor } from 'callme-x';

// Visualize network topology
const graph = networkMonitor.visualizeTopology();

// Get active connections
const connections = networkMonitor.showActiveConnections();

// Display routes to destination
const routes = networkMonitor.displayRoutes(destinationId);

// Monitor network health
const health = networkMonitor.monitorHealth();

// Generate network report
const report = networkMonitor.generateReport();
console.log(report);

// Export topology as JSON
const json = networkMonitor.exportTopologyJSON();

// Export topology as DOT format (Graphviz)
const dot = networkMonitor.exportTopologyDOT();
```

## Examples

See the `examples/` directory for complete examples:

- `basic-usage.ts` - Basic messaging
- `qr-exchange.ts` - Contact exchange via QR codes
- `mesh-routing.ts` - Multi-hop message routing
- `network-monitor.ts` - Network monitoring dashboard
- `offline-messaging.ts` - Offline message queuing

## Development

```bash
# Install dependencies
npm install

# Build
npm run build

# Run tests
npm test

# Lint
npm run lint

# Format code
npm run format
```

## Security

CallMe X uses industry-standard cryptographic primitives:

- **Signing**: Ed25519
- **Encryption**: X25519 + XSalsa20-Poly1305 (NaCl box)
- **Hashing**: SHA-256, BLAKE2b
- **Key Derivation**: HKDF
- **Random**: CSPRNG

All messages are end-to-end encrypted with forward secrecy.

## Roadmap

- [ ] Native Bluetooth/BLE support
- [ ] WiFi Direct implementation
- [ ] Satellite network integration
- [ ] LoRa long-range support
- [ ] Voice and video calls
- [ ] Group messaging
- [ ] File transfer protocol
- [ ] Mobile apps (iOS/Android)
- [ ] Desktop apps (Electron)
- [ ] Blockchain-based reputation system

## Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Acknowledgments

Built with:
- [TweetNaCl](https://github.com/dchest/tweetnacl-js) - Cryptography
- [QRCode](https://github.com/soldair/node-qrcode) - QR code generation
- [TypeScript](https://www.typescriptlang.org/) - Type safety

## Support

- 📧 Email: support@callmex.dev
- 💬 Discord: https://discord.gg/callmex
- 🐛 Issues: https://github.com/callmex/callmex/issues

---

**CallMe X** - Decentralized communication for the next generation.
