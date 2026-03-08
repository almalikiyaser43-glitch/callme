/**
 * Network Monitor Example
 * Demonstrates network monitoring and visualization
 */

import { CallMeX, networkMonitor } from '../src';
import * as fs from 'fs';

async function main() {
  console.log('=== CallMe X Network Monitor Example ===\n');

  // Create CallMe X instance
  const callme = new CallMeX();

  // Initialize and start
  await callme.initialize();
  await callme.start();

  console.log('Network services started. Monitoring for 30 seconds...\n');

  // Monitor network in intervals
  const monitorInterval = setInterval(() => {
    console.clear();
    console.log('=== CallMe X Network Monitor ===\n');

    // Network health
    const health = networkMonitor.monitorHealth();
    console.log('Network Health:');
    console.log(`  📊 Nodes: ${health.nodeCount}`);
    console.log(`  🔗 Active Connections: ${health.activeConnections}`);
    console.log(`  ⚡ Avg Latency: ${health.averageLatency.toFixed(2)}ms`);
    console.log(`  ✉️  Delivery Rate: ${(health.messageDeliveryRate * 100).toFixed(2)}%`);
    console.log(`  🗂️  Network Partitions: ${health.networkPartitions}`);

    // Network statistics
    console.log('\nNetwork Statistics:');
    const stats = networkMonitor.getStatistics();
    console.log(`  Total Edges: ${stats.totalEdges}`);
    console.log(`  Network Diameter: ${stats.networkDiameter}`);

    // Active connections
    console.log('\nActive Connections:');
    const connections = networkMonitor.showActiveConnections();
    if (connections.length > 0) {
      connections.slice(0, 5).forEach((conn, i) => {
        console.log(`  ${i + 1}. ${conn.peerId.substring(0, 8)} via ${conn.transport}`);
        console.log(`     Signal: ${conn.quality.signalStrength}%, Latency: ${conn.quality.latency}ms`);
      });
      if (connections.length > 5) {
        console.log(`  ... and ${connections.length - 5} more`);
      }
    } else {
      console.log('  No active connections');
    }

    // Transport statistics
    console.log('\nTransport Statistics:');
    const transportStats = networkMonitor.getTransportStatistics();
    Object.entries(transportStats).forEach(([transport, data]: [string, any]) => {
      console.log(`  ${transport}:`);
      console.log(`    Connections: ${data.count}`);
      console.log(`    Avg Latency: ${data.avgLatency.toFixed(2)}ms`);
      console.log(`    Avg Signal: ${data.avgSignalStrength.toFixed(2)}%`);
    });

    // Topology summary
    console.log('\nTopology Summary:');
    const topology = networkMonitor.getTopologySummary();
    console.log(`  Total Nodes: ${topology.totalNodes}`);
    console.log(`  Total Edges: ${topology.totalEdges}`);
    console.log(`  Relay Nodes: ${topology.relayNodes}`);
    console.log(`  Partitioned: ${topology.isPartitioned ? 'Yes' : 'No'}`);

    console.log('\n' + '='.repeat(50));
  }, 5000); // Update every 5 seconds

  // Wait for monitoring period
  await new Promise((resolve) => setTimeout(resolve, 30000));

  // Stop monitoring
  clearInterval(monitorInterval);

  // Generate final report
  console.log('\n\nGenerating final network report...\n');
  const report = networkMonitor.generateReport();
  console.log(report);

  // Export topology
  console.log('\n\nExporting network topology...');

  // Export as JSON
  const json = networkMonitor.exportTopologyJSON();
  fs.writeFileSync('./network-topology.json', json);
  console.log('✓ Topology saved as JSON: network-topology.json');

  // Export as DOT (Graphviz)
  const dot = networkMonitor.exportTopologyDOT();
  fs.writeFileSync('./network-topology.dot', dot);
  console.log('✓ Topology saved as DOT: network-topology.dot');
  console.log('  (Use Graphviz to visualize: dot -Tpng network-topology.dot -o network.png)');

  // Visualize topology
  const graph = networkMonitor.visualizeTopology();
  console.log(`\nNetwork Graph:`);
  console.log(`  Nodes: ${graph.nodes.length}`);
  console.log(`  Edges: ${graph.edges.length}`);

  if (graph.nodes.length > 0) {
    console.log('\nNode Details:');
    graph.nodes.slice(0, 5).forEach((node) => {
      console.log(`  - ${node.id.substring(0, 8)} [${node.type}]`);
      console.log(`    Online: ${node.online}, Reputation: ${node.reputation}`);
    });
  }

  // Stop
  console.log('\nStopping CallMe X...');
  await callme.stop();
  console.log('✓ Monitoring completed');
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
