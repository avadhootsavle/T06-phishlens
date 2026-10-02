import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function generateEd25519KeyPair(kid: string = 'key-1') {
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');

  const privateKeyPem = privateKey.export({ type: 'pkcs8', format: 'pem' }) as string;
  const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;
  const jwk = publicKey.export({ format: 'jwk' });

  return {
    kid,
    privateKeyPem,
    publicKeyPem,
    jwk: {
      ...jwk,
      kid,
      use: 'sig',
    },
  };
}

async function main() {
  const kid = process.env.PHISHLENS_SIGNING_KID || 'phishlens-ed25519-v1';
  console.log(`🔑 Generating Ed25519 Merchant Signing Keypair (kid: ${kid})...\n`);

  const keys = generateEd25519KeyPair(kid);

  console.log('--- Private Key (PKCS#8 PEM) ---');
  console.log(keys.privateKeyPem);

  console.log('--- Public Key (SPKI PEM) ---');
  console.log(keys.publicKeyPem);

  console.log('--- JWK ---');
  console.log(JSON.stringify(keys.jwk, null, 2));

  // Single-line escaped format for .env
  const escapedPrivKey = keys.privateKeyPem.replace(/\n/g, '\\n');
  console.log('\n--- Paste into .env: ---');
  console.log(`PHISHLENS_SIGNING_KID="${kid}"`);
  console.log(`PHISHLENS_SIGNING_PRIVATE_KEY="${escapedPrivKey}"`);
  console.log(`PUBLIC_BASE_URL="http://localhost:3000"`);

  // Optionally append or update .env if run directly and not yet set
  const envPath = path.resolve(__dirname, '../.env');
  try {
    const existingEnv = await fs.readFile(envPath, 'utf-8');
    if (!existingEnv.includes('PHISHLENS_SIGNING_PRIVATE_KEY=')) {
      const addition = `\n# Merchant QR Ed25519 Signing Keys\nPHISHLENS_SIGNING_KID="${kid}"\nPHISHLENS_SIGNING_PRIVATE_KEY="${escapedPrivKey}"\nPUBLIC_BASE_URL="http://localhost:3000"\n`;
      await fs.appendFile(envPath, addition);
      console.log(`\n✅ Automatically updated local backend/.env with generated signing key!`);
    } else {
      console.log(`\nℹ️ backend/.env already contains a signing key. Not overwriting.`);
    }
  } catch (err) {
    console.warn('Could not read/write .env:', (err as Error).message);
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().catch((err) => {
    console.error('Failed to generate signing key:', err);
    process.exit(1);
  });
}
