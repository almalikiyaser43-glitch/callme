/**
 * Basic Usage Example
 * Demonstrates core functionality of CallMe X
 */

import { CallMeX } from '../src';

async function main() {
  console.log('=== CallMe X Basic Usage Example ===\n');

  // Create CallMe X instance
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
      requireSignatures: true,
    },
  });

  // Listen for events
  callme.on('initialized', ({ identity }) => {
    console.log('✓ Initialized with identity:', identity.userId);
  });

  callme.on('started', () => {
    console.log('✓ Network services started');
  });

  callme.on('peer-discovered', (peer) => {
    console.log('✓ Discovered peer:', peer.id.substring(0, 8));
  });

  callme.on('connection-established', (connection) => {
    console.log(`✓ Connected to peer via ${connection.transport}`);
  });

  callme.on('message-received', (message) => {
    console.log(`📨 Message from ${message.from}: ${message.content}`);
  });

  callme.on('message-delivered', (messageId) => {
    console.log('✓ Message delivered:', messageId.substring(0, 8));
  });

  callme.on('error', ({ type, error }) => {
    console.error(`❌ Error (${type}):`, error.message);
  });

  // Initialize the platform
  console.log('Initializing CallMe X...');
  await callme.initialize();

  // Start networking
  console.log('Starting network services...');
  await callme.start();

  // Get network health
  const health = callme.getNetworkHealth();
  console.log('\nNetwork Health:');
  console.log(`  Nodes: ${health.nodeCount}`);
  console.log(`  Connections: ${health.activeConnections}`);
  console.log(`  Avg Latency: ${health.averageLatency.toFixed(2)}ms`);
  console.log(`  Delivery Rate: ${(health.messageDeliveryRate * 100).toFixed(2)}%`);

  // Get peers
  const peers = callme.getPeers();
  console.log(`\nDiscovered ${peers.length} peers`);

  // Get contacts
  const contacts = await callme.getContacts();
  console.log(`\nYou have ${contacts.length} contacts`);

  // Example: Send a message (if you have contacts)
  if (contacts.length > 0) {
    const contact = contacts[0];
    console.log(`\nSending message to ${contact.displayName || contact.userId}...`);
    const messageId = await callme.sendMessage(
      contact.userId,
      'Hello from CallMe X!'
    );
    console.log('Message sent:', messageId.substring(0, 8));
  }

  // Keep running for a while to discover peers
  console.log('\nDiscovering peers for 30 seconds...');
  await new Promise((resolve) => setTimeout(resolve, 30000));

  // Get final metrics
  const metrics = callme.getMetrics();
  console.log('\nFinal Metrics:');
  console.log(`  Total Messages: ${metrics.totalMessages}`);
  console.log(`  Delivered: ${metrics.messagesDelivered}`);
  console.log(`  Failed: ${metrics.messagesFailed}`);
  console.log(`  Active Peers: ${metrics.activePeers}`);
  console.log(`  Uptime: ${(metrics.uptime / 1000).toFixed(0)}s`);

  // Stop
  console.log('\nStopping CallMe X...');
  await callme.stop();
  console.log('✓ Stopped');
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
