/**
 * QR Contact Exchange Example
 * Demonstrates contact exchange via QR codes
 */

import { CallMeX, qrExchange } from '../src';
import * as fs from 'fs';

async function main() {
  console.log('=== CallMe X QR Contact Exchange Example ===\n');

  // Create CallMe X instance
  const callme = new CallMeX();

  // Initialize
  await callme.initialize();

  console.log('Generating QR code for contact exchange...\n');

  // Generate QR code as data URL
  const qrDataURL = await callme.generateContactQR('Alice');
  console.log('QR Code generated (data URL)');

  // Save QR code to file
  const base64Data = qrDataURL.replace(/^data:image\/png;base64,/, '');
  fs.writeFileSync('./contact-qr.png', base64Data, 'base64');
  console.log('✓ QR code saved to: contact-qr.png\n');

  // Generate QR code as SVG
  const identity = callme.exportConfig().identity;
  const qrSVG = await qrExchange.generateQRSVG(identity, 'Alice');
  fs.writeFileSync('./contact-qr.svg', qrSVG);
  console.log('✓ QR code SVG saved to: contact-qr.svg\n');

  // Example: Simulate scanning a QR code
  console.log('Simulating QR code scan...\n');

  // Export contact info
  const contactInfo = qrExchange.exportContactInfo('Alice');
  const qrData = JSON.stringify(contactInfo);

  // Scan the QR code
  const scannedContact = qrExchange.scanQR(qrData);
  console.log('Scanned contact info:');
  console.log(`  User ID: ${scannedContact.userId}`);
  console.log(`  Public Key: ${scannedContact.publicKey.substring(0, 32)}...`);
  console.log(`  Device Fingerprint: ${scannedContact.deviceFingerprint}`);
  console.log(`  Display Name: ${scannedContact.displayName}`);

  // Verify contact
  const isValid = qrExchange.verifyContact(scannedContact);
  console.log(`\nContact verification: ${isValid ? '✓ Valid' : '❌ Invalid'}`);

  if (isValid) {
    // Add contact
    const contact = await callme.addContactFromQR(qrData);
    console.log('\n✓ Contact added successfully!');
    console.log(`  Name: ${contact.displayName}`);
    console.log(`  User ID: ${contact.userId.substring(0, 16)}...`);
    console.log(`  Verified: ${contact.verified}`);

    // Check network compatibility
    const localCapabilities = identity.networkCapabilities;
    const compatible = qrExchange.checkCompatibility(
      localCapabilities,
      contact.networkCapabilities
    );
    console.log(`\nNetwork compatibility: ${compatible ? '✓ Compatible' : '❌ Incompatible'}`);

    if (compatible) {
      const transports = qrExchange.getCompatibleTransports(
        localCapabilities,
        contact.networkCapabilities
      );
      console.log('\nCompatible transports:');
      transports.forEach((t) => {
        console.log(`  - ${t.type} (strength: ${t.strength})`);
      });
    }
  }

  // Create shareable link
  console.log('\nCreating shareable contact link...');
  const link = qrExchange.createContactLink('https://callmex.app', contactInfo);
  console.log(`Link: ${link.substring(0, 80)}...`);

  // Parse contact link
  const parsedContact = qrExchange.parseContactLink(link);
  if (parsedContact) {
    console.log('✓ Link parsed successfully');
    console.log(`  User ID: ${parsedContact.userId.substring(0, 16)}...`);
  }

  console.log('\n✓ Example completed');
}

// Run
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
