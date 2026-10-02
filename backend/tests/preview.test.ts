import assert from 'assert';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { validateSSRF, SSRFError } from '../src/security/ssrf.js';
import {
  computeDHash,
  hammingDistance,
  calculateSimilarity,
  matchVisualImpersonation,
  cleanupExpiredPreviews,
  enqueuePreviewJob,
  getPreviewJob,
  loadBrandManifest,
  PREVIEW_TTL_MS,
} from '../src/services/previewService.js';
import { calculateRisk } from '../src/engine/riskEngine.js';
import { SignalSeverity, Verdict } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPreviewTests() {
  console.log('🧪 Starting Safe Preview Unit Test Suite...\n');
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

  // ==========================================
  // 1. SSRF Route Guard & Destination Tests
  // ==========================================
  await test('SSRF Route Guard: Blocks loopback IPv4 127.0.0.1', async () => {
    let blocked = false;
    try {
      await validateSSRF('http://127.0.0.1/admin');
    } catch (err) {
      blocked = err instanceof SSRFError;
    }
    assert.strictEqual(blocked, true);
  });

  await test('SSRF Route Guard: Blocks AWS/GCP cloud metadata IP 169.254.169.254', async () => {
    let blocked = false;
    try {
      await validateSSRF('http://169.254.169.254/computeMetadata/v1/');
    } catch (err) {
      blocked = err instanceof SSRFError;
    }
    assert.strictEqual(blocked, true);
  });

  await test('SSRF Route Guard: Blocks private subnets (10.0.0.0/8, 192.168.0.0/16, 172.16.0.0/12)', async () => {
    const privateIps = [
      'http://10.254.1.1/secret',
      'http://192.168.1.254:8080/internal',
      'http://172.16.5.10/database',
    ];
    for (const ipUrl of privateIps) {
      let blocked = false;
      try {
        await validateSSRF(ipUrl);
      } catch (err) {
        blocked = err instanceof SSRFError;
      }
      assert.strictEqual(blocked, true, `Expected ${ipUrl} to be blocked by SSRF`);
    }
  });

  await test('SSRF Route Guard: Blocks non-http(s) protocols (file, ftp, javascript, data)', async () => {
    const forbidden = [
      'file:///etc/passwd',
      'ftp://files.internal.corp',
      'data:text/html,<script>alert(1)</script>',
      'javascript:void(0)',
    ];
    for (const u of forbidden) {
      let blocked = false;
      try {
        await validateSSRF(u);
      } catch (err) {
        blocked = err instanceof SSRFError;
      }
      assert.strictEqual(blocked, true, `Expected ${u} to be blocked`);
    }
  });

  // Mock route handler simulating Playwright page.route('**/*')
  await test('SSRF Route Guard: Simulated Playwright page.route intercepts and aborts forbidden requests', async () => {
    async function simulateRoute(reqUrl: string, resourceType: string): Promise<'aborted' | 'continued'> {
      if (['media', 'websocket', 'eventsource', 'font'].includes(resourceType)) {
        return 'aborted';
      }
      if (!reqUrl.startsWith('http://') && !reqUrl.startsWith('https://')) {
        return 'aborted';
      }
      try {
        await validateSSRF(reqUrl);
        return 'continued';
      } catch {
        return 'aborted';
      }
    }

    assert.strictEqual(await simulateRoute('http://127.0.0.1/exploit', 'document'), 'aborted');
    assert.strictEqual(await simulateRoute('http://169.254.169.254/meta', 'fetch'), 'aborted');
    assert.strictEqual(await simulateRoute('https://evil.com/video.mp4', 'media'), 'aborted');
    assert.strictEqual(await simulateRoute('ws://evil.com/socket', 'websocket'), 'aborted');
    assert.strictEqual(await simulateRoute('https://example.com/login.html', 'document'), 'continued');
  });

  // ==========================================
  // 2. Similarity & Perceptual dHash Tests
  // ==========================================
  test('Similarity: Hamming distance and percentage on identical hashes is 100%', () => {
    const hash = '0110000110000101100000111000001110000011100010110110001101010100';
    assert.strictEqual(hammingDistance(hash, hash), 0);
    assert.strictEqual(calculateSimilarity(hash, hash), 100);
  });

  test('Similarity: Hamming distance on completely inverted hashes is 0%', () => {
    const h1 = '0'.repeat(64);
    const h2 = '1'.repeat(64);
    assert.strictEqual(hammingDistance(h1, h2), 64);
    assert.strictEqual(calculateSimilarity(h1, h2), 0);
  });

  test('Similarity: Hamming distance accurately calculates partial similarity (e.g. 56 matching bits = 88%)', () => {
    // 8 bits differ out of 64 -> (64 - 8) / 64 = 87.5% -> 88%
    const h1 = '1'.repeat(64);
    const h2 = '0'.repeat(8) + '1'.repeat(56);
    assert.strictEqual(hammingDistance(h1, h2), 8);
    assert.strictEqual(calculateSimilarity(h1, h2), 88);
  });

  await test('Brand Manifest: Loads protected brand references correctly', async () => {
    const manifest = await loadBrandManifest();
    assert.ok(manifest.length >= 4, `Expected at least 4 brands in manifest, found ${manifest.length}`);
    const sbi = manifest.find((b) => b.brandKey === 'sbi');
    assert.ok(sbi, 'SBI brand reference must be in manifest');
    assert.strictEqual(sbi?.officialDomains.includes('sbi.co.in'), true);
    assert.ok(sbi?.dHash && sbi.dHash.length === 64, 'SBI dHash must be 64-bit string');
  });

  await test('Visual Impersonation: Cloned bank login page on non-official domain flags visual impersonation (>= 80%)', async () => {
    const manifest = await loadBrandManifest();
    const sbi = manifest.find((b) => b.brandKey === 'sbi');
    assert.ok(sbi);

    // Provide a hash identical or very close to SBI official login
    const match = await matchVisualImpersonation(sbi.dHash, 'sbi-secure-update-login.xyz');
    assert.ok(match.visualImpersonation, 'Expected visualImpersonation to be flagged');
    assert.strictEqual(match.visualImpersonation?.brand, 'State Bank of India');
    assert.ok(match.visualImpersonation?.similarity >= 80);
  });

  await test('Visual Impersonation: A REAL bank page is NOT flagged as visual impersonation', async () => {
    const manifest = await loadBrandManifest();
    const sbi = manifest.find((b) => b.brandKey === 'sbi');
    assert.ok(sbi);

    // Official SBI domain
    const match = await matchVisualImpersonation(sbi.dHash, 'retail.onlinesbi.sbi');
    assert.strictEqual(match.visualImpersonation, undefined, 'Real bank page must NOT be flagged as impersonation');
    assert.strictEqual(match.bestBrand, 'State Bank of India');
    assert.strictEqual(match.bestSimilarity, 100);
  });

  test('Scoring Integration: Visual Impersonation raises score by +35 and generates plain explanation', () => {
    const signals = [
      {
        code: 'VISUAL_IMPERSONATION_DETECTED',
        severity: SignalSeverity.HIGH,
        scoreImpact: 35,
        metadata: { brand: 'State Bank of India', similarity: 94 },
      },
      {
        code: 'DOMAIN_AGE_UNDER_7_DAYS',
        severity: SignalSeverity.HIGH,
        scoreImpact: 20,
        metadata: { ageDays: 3 },
      },
      {
        code: 'PASSWORD_FIELD_DETECTED',
        severity: SignalSeverity.LOW,
        scoreImpact: 8,
      },
    ];

    const result = calculateRisk(signals);
    assert.strictEqual(result.riskScore, 63); // 35 + 20 + 8 = 63 (DANGER >= 60)
    assert.strictEqual(result.verdict, Verdict.DANGER);
    assert.ok(result.explanation.includes('State Bank of India'));
    assert.ok(result.explanation.includes('94%'));
  });

  // ==========================================
  // 3. TTL Cleanup Tests
  // ==========================================
  await test('TTL Cleanup: Deletes files and memory records older than TTL', async () => {
    const tempDir = path.resolve(__dirname, '../data/previews');
    await fs.mkdir(tempDir, { recursive: true });

    const expiredFile = path.join(tempDir, 'test_expired_123.webp');
    await fs.writeFile(expiredFile, Buffer.from('mock webp content'));

    // Manually set mtime to 15 minutes ago
    const fifteenMinutesAgo = (Date.now() - 15 * 60 * 1000) / 1000;
    await fs.utimes(expiredFile, fifteenMinutesAgo, fifteenMinutesAgo);

    const freshFile = path.join(tempDir, 'test_fresh_456.webp');
    await fs.writeFile(freshFile, Buffer.from('fresh mock webp'));

    // Run cleanup with default 10-minute TTL
    const deletedCount = await cleanupExpiredPreviews(10 * 60 * 1000);
    assert.ok(deletedCount >= 1, 'At least 1 expired file should be cleaned up');

    // Verify expired file was deleted
    let expiredExists = true;
    try {
      await fs.access(expiredFile);
    } catch {
      expiredExists = false;
    }
    assert.strictEqual(expiredExists, false, 'Expired file must be deleted from disk');

    // Verify fresh file was retained
    let freshExists = false;
    try {
      await fs.access(freshFile);
      freshExists = true;
      // Clean up test file
      await fs.unlink(freshFile);
    } catch {}
    assert.strictEqual(freshExists, true, 'Fresh file must be retained');
  });

  console.log(`\n🎉 Preview Test Suite: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)\n`);
  if (passed !== total) {
    process.exit(1);
  }
}

runPreviewTests().catch((err) => {
  console.error('Fatal test runner failure:', err);
  process.exit(1);
});
