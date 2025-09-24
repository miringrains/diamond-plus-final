#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('Mux PEM to Base64 Converter');
console.log('===========================\n');
console.log('Paste your PEM content below (including BEGIN and END lines).');
console.log('When done, type "DONE" on a new line:\n');

let pemContent = '';
let collecting = true;

rl.on('line', (line) => {
  if (line.trim() === 'DONE') {
    collecting = false;
    rl.close();
    
    if (!pemContent.includes('BEGIN') || !pemContent.includes('END')) {
      console.error('\n✗ Invalid PEM format - missing BEGIN/END markers');
      process.exit(1);
    }
    
    // Convert to base64
    const base64Key = Buffer.from(pemContent).toString('base64');
    
    console.log('\n=== Add these to your .env file ===\n');
    console.log(`MUX_SIGNING_KEY_ID=WGUd01tyW001TO9zzC6t7JHM19ioGQot02DRG02FRp6cfoo`);
    console.log(`MUX_SIGNING_KEY_BASE64=${base64Key}`);
    console.log('\n===================================');
    
    // Save to file
    const envContent = `
# Mux Signing Key Configuration
MUX_SIGNING_KEY_ID=WGUd01tyW001TO9zzC6t7JHM19ioGQot02DRG02FRp6cfoo
MUX_SIGNING_KEY_BASE64=${base64Key}
`;
    
    fs.writeFileSync('mux-signing-key-env.txt', envContent);
    console.log('\n✓ Also saved to: mux-signing-key-env.txt');
    
    // Verify
    try {
      const decoded = Buffer.from(base64Key, 'base64').toString('utf8');
      console.log(`\n✓ Verification: Base64 decodes correctly (${decoded.length} bytes)`);
    } catch (error) {
      console.error('✗ Failed to decode base64');
    }
  } else if (collecting) {
    pemContent += line + '\n';
  }
});
