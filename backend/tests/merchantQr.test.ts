import assert from 'assert';
import jsQR from 'jsqr';
import sharp from 'sharp';
import { prisma } from '../src/db/client.js';
import {
  signMerchantToken,
  verifyMerchantToken,
  verifyQrPayload,
  generateStickerPng,
  extractTokenFromContent,
  getPublicJwks,
} from '../src/services/merchantQrService.js';
import { calculateRisk } from '../src/engine/riskEngine.js';
import { SignalSeverity, Verdict, MerchantStatus } from '@prisma/client';

async function runMerchantQrTests() {
  console.log('🧪 Starting Verified Merchant QR Test Suite...\n');
  let passed = 0;
  let total = 0;

  async function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      await fn();
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: unknown) {
      console.error(`  ❌ FAIL: ${name} ->`, (err as Error).message);
    }
  }

  // Seed test merchant in database
  const testVpa = `shoptester_${Date.now()}@upi`;
  const merchant = await prisma.merchant.upsert({
    where: { vpa: testVpa },
    update: {
      shopName: 'Sharma General Store',
      status: MerchantStatus.ACTIVE,
      city: 'Pune',
    },
    create: {
      shopName: 'Sharma General Store',
      vpa: testVpa,
      city: 'Pune',
      status: MerchantStatus.ACTIVE,
      name: 'Sharma General Store',
      normalizedName: 'sharma general store',
      verified: true,
    },
  });

  // 1. Valid token verifies
  await test('Valid Token: Cryptographically signed token verifies successfully', async () => {
    const { token, payload } = signMerchantToken(merchant);
    assert.ok(token.includes('.'));
    assert.strictEqual(payload.shopName, 'Sharma General Store');
    assert.strictEqual(payload.vpa, testVpa);

    const result = await verifyMerchantToken(token);
    assert.strictEqual(result.status, 'VERIFIED');
    assert.strictEqual(result.merchant?.shopName, 'Sharma General Store');
    assert.strictEqual(result.merchant?.vpa, testVpa);
  });

  // 2. Token with one changed character fails
  await test('Tamper Resistance: A token with one modified character fails signature verification (TAMPERED)', async () => {
    const { token } = signMerchantToken(merchant);
    const parts = token.split('.');

    // Modify a character in signature segment (use index 0 to ensure data bit, not padding)
    const sig = parts[1];
    const tamperedChar = sig[0] === 'A' ? 'B' : 'A';
    const tamperedSig = tamperedChar + sig.slice(1);
    const tamperedToken = `${parts[0]}.${tamperedSig}`;

    const result = await verifyMerchantToken(tamperedToken);
    assert.strictEqual(result.status, 'TAMPERED');
    assert.ok(result.reason.toLowerCase().includes('mismatch') || result.reason.toLowerCase().includes('forged'));
  });

  // 3. Expired token fails
  await test('Expiry Check: An expired token is rejected (EXPIRED)', async () => {
    // Generate token that expired 10 minutes ago
    const { token } = signMerchantToken(merchant, { expiresInSeconds: -600 });
    const result = await verifyMerchantToken(token);
    assert.strictEqual(result.status, 'EXPIRED');
    assert.ok(result.reason.includes('expired'));
  });

  // 4. Revoked merchant fails
  await test('Revocation List: A token from a revoked merchant is rejected (REVOKED)', async () => {
    const revokedVpa = `revoked_${Date.now()}@upi`;
    const revokedMerchant = await prisma.merchant.create({
      data: {
        shopName: 'Shady Electronics',
        vpa: revokedVpa,
        city: 'Delhi',
        status: MerchantStatus.ACTIVE,
        name: 'Shady Electronics',
        normalizedName: 'shady electronics',
        verified: true,
      },
    });

    const { token } = signMerchantToken(revokedMerchant);

    // Now revoke merchant in database
    await prisma.merchant.update({
      where: { id: revokedMerchant.id },
      data: { status: MerchantStatus.REVOKED, revokedAt: new Date() },
    });

    const result = await verifyMerchantToken(token);
    assert.strictEqual(result.status, 'REVOKED');
    assert.ok(result.reason.includes('revoked'));
  });

  // 5. Token signed with unknown kid fails
  await test('Key Rotation: A token signed with an unknown kid is rejected (TAMPERED)', async () => {
    const { token } = signMerchantToken(merchant, { kid: 'unknown-rogue-key-id-999' });
    const result = await verifyMerchantToken(token);
    assert.strictEqual(result.status, 'TAMPERED');
    assert.ok(result.reason.includes('Unknown signing key id'));
  });

  // 6. QR scanned from printed sticker image verifies end-to-end
  await test('End-to-End Sticker: QR code extracted from printed PNG sticker verifies completely', async () => {
    const { token, url } = signMerchantToken(merchant);

    // 1. Generate printable sticker PNG
    const stickerPng = await generateStickerPng(merchant, token);
    assert.ok(stickerPng.length > 5000, 'Sticker PNG should be non-empty image');

    // 2. Decode QR code embedded in sticker PNG using jsQR
    const { data, info } = await sharp(stickerPng).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const decoded = jsQR(new Uint8ClampedArray(data), info.width, info.height);

    assert.ok(decoded, 'jsQR must locate and decode the QR code within the sticker image');
    assert.strictEqual(decoded.data, url);

    // 3. Extract token from decoded URL and verify
    const extractedToken = extractTokenFromContent(decoded.data);
    assert.ok(extractedToken);
    assert.strictEqual(extractedToken, token);

    const verifyResult = await verifyQrPayload({ content: decoded.data });
    assert.strictEqual(verifyResult.status, 'VERIFIED');
    assert.strictEqual(verifyResult.shopName, 'Sharma General Store');
    assert.strictEqual(verifyResult.vpa, testVpa);
  });

  // 7. Plain UPI QR for registered VPA with different expected shop name returns MISMATCH
  await test('Merchant Mismatch: Plain UPI QR with mismatched expected shop name returns MISMATCH', async () => {
    const upiContent = `upi://pay?pa=${testVpa}&pn=Sharma%20General%20Store&cu=INR`;

    // Customer expected "Gupta Medical" instead of "Sharma General Store"
    const result = await verifyQrPayload({
      content: upiContent,
      expectedShopName: 'Gupta Medical Pharmacy',
    });

    assert.strictEqual(result.status, 'MISMATCH');
    assert.strictEqual(result.registeredShopName, 'Sharma General Store');
    assert.strictEqual(result.expectedShopName, 'Gupta Medical Pharmacy');
    assert.ok(result.message.includes('does not match'));
  });

  // 8. Plain UPI QR for registered VPA with matching shop name returns VERIFIED_REGISTRY
  await test('Registry Match: Plain UPI QR for registered VPA returns VERIFIED_REGISTRY', async () => {
    const upiContent = `upi://pay?pa=${testVpa}&pn=Sharma%20General%20Store&cu=INR`;

    const result = await verifyQrPayload({
      content: upiContent,
      expectedShopName: 'Sharma General Store',
    });

    assert.strictEqual(result.status, 'VERIFIED_REGISTRY');
    assert.strictEqual(result.shopName, 'Sharma General Store');
    assert.strictEqual(result.vpa, testVpa);
  });

  // 9. Scoring Integration: VERIFIED lowers risk score (-20) & TAMPERED triggers DANGER (+70)
  await test('Scoring Integration: VERIFIED lowers risk score (-20), TAMPERED triggers DANGER (+70)', () => {
    // 1. Verified Merchant signal lowers risk (clamped at 0)
    const verifiedEngine = calculateRisk([
      { code: 'MERCHANT_VERIFIED', severity: SignalSeverity.INFO, scoreImpact: -20, metadata: { shopName: 'Sharma Store' } },
    ]);
    assert.strictEqual(verifiedEngine.riskScore, 0);
    assert.strictEqual(verifiedEngine.verdict, Verdict.SAFE);
    assert.ok(verifiedEngine.explanation.includes('Verified Merchant'));

    // 2. Tampered sticker triggers DANGER
    const tamperedEngine = calculateRisk([
      { code: 'MERCHANT_TAMPERED', severity: SignalSeverity.CRITICAL, scoreImpact: 70 },
    ]);
    assert.strictEqual(tamperedEngine.riskScore, 70);
    assert.strictEqual(tamperedEngine.verdict, Verdict.DANGER);
    assert.ok(tamperedEngine.explanation.includes('fake sticker'));
  });

  // 10. Public JWKS discovery
  await test('JWKS Discovery: Returns RFC-compliant public keys with Ed25519', () => {
    const jwks = getPublicJwks();
    assert.ok(jwks.keys && jwks.keys.length > 0);
    const key = jwks.keys[0];
    assert.strictEqual(key.kty, 'OKP');
    assert.strictEqual(key.crv, 'Ed25519');
    assert.ok(key.x, 'Raw public key coordinate x must exist');
    assert.ok(key.publicKeyPem, 'SPKI PEM representation must exist');
  });

  console.log(`\n🎉 Verified Merchant QR Test Suite: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)\n`);

  if (passed !== total) {
    process.exit(1);
  }
}

runMerchantQrTests()
  .catch((e) => {
    console.error('Test runner exception:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
