import assert from 'assert';
import process from 'node:process';
import { parseUPIString } from '../src/pipeline/upiParser.js';
import { calculateRisk } from '../src/engine/riskEngine.js';
import { analyzeUrlHeuristics } from '../src/pipeline/urlHeuristics.js';
import { validateSSRF, SSRFError } from '../src/security/ssrf.js';
import { sanitizeUrlForStorage } from '../src/utils/sanitizeUrl.js';
import { SignalSeverity, Verdict } from '@prisma/client';

async function runTests() {
  console.log('🧪 Starting PhishLens Automated Test Suite...\n');
  let passed = 0;
  let total = 0;

  function test(name: string, fn: () => void | Promise<void>) {
    total++;
    try {
      const res = fn();
      if (res instanceof Promise) {
        return res
          .then(() => {
            console.log(`  ✅ PASS: ${name}`);
            passed++;
          })
          .catch((err) => {
            console.error(`  ❌ FAIL: ${name} ->`, err.message);
          });
      }
      console.log(`  ✅ PASS: ${name}`);
      passed++;
    } catch (err: unknown) {
      console.error(`  ❌ FAIL: ${name} ->`, (err as Error).message);
    }
  }

  // 1. UPI Parser Tests
  test('UPI Parser extracts payee, VPA, and amount correctly', () => {
    const raw = 'upi://pay?pa=abc@upi&pn=ABC%20Store&am=500&cu=INR';
    const parsed = parseUPIString(raw);
    assert.strictEqual(parsed.isUPI, true);
    assert.strictEqual(parsed.upiId, 'abc@upi');
    assert.strictEqual(parsed.payeeName, 'ABC Store');
    assert.strictEqual(parsed.amount, '500');
    assert.strictEqual(parsed.currency, 'INR');
  });

  test('UPI Parser handles non-UPI strings cleanly', () => {
    const parsed = parseUPIString('https://example.com');
    assert.strictEqual(parsed.isUPI, false);
  });

  // 2. Risk Engine & Threshold Boundaries
  test('Risk Engine assigns SAFE for 0-24 points', () => {
    const res = calculateRisk([
      { code: 'PASSWORD_FIELD_DETECTED', severity: SignalSeverity.LOW, scoreImpact: 8 },
      { code: 'SUSPICIOUS_URL_KEYWORDS', severity: SignalSeverity.LOW, scoreImpact: 8 },
    ]);
    assert.strictEqual(res.riskScore, 16);
    assert.strictEqual(res.verdict, Verdict.SAFE);
    assert.strictEqual(res.explanation, 'No major phishing indicators were detected.');
  });

  test('Risk Engine assigns CAUTION for 25-59 points', () => {
    const res = calculateRisk([
      { code: 'STRONG_LOOKALIKE_DOMAIN', severity: SignalSeverity.HIGH, scoreImpact: 25 },
    ]);
    assert.strictEqual(res.riskScore, 25);
    assert.strictEqual(res.verdict, Verdict.CAUTION);
  });

  test('Risk Engine assigns DANGER for 60-100 points', () => {
    const res = calculateRisk([
      { code: 'PAYMENT_INTENT_MISMATCH', severity: SignalSeverity.CRITICAL, scoreImpact: 70 },
    ]);
    assert.strictEqual(res.riskScore, 70);
    assert.strictEqual(res.verdict, Verdict.DANGER);
    assert.ok(res.explanation.includes('expected to receive money'));
  });

  test('Risk Engine clamps score at maximum 100', () => {
    const res = calculateRisk([
      { code: 'KNOWN_PHISHING', severity: SignalSeverity.CRITICAL, scoreImpact: 70 },
      { code: 'HOMOGLYPH_BRAND_MATCH', severity: SignalSeverity.HIGH, scoreImpact: 35 },
      { code: 'BRAND_DOMAIN_MISMATCH', severity: SignalSeverity.HIGH, scoreImpact: 30 },
    ]);
    assert.strictEqual(res.riskScore, 100);
    assert.strictEqual(res.verdict, Verdict.DANGER);
  });

  // 3. SSRF Protection Tests
  await test('SSRF rejects localhost destination', async () => {
    let threw = false;
    try {
      await validateSSRF('http://localhost:3000');
    } catch (err: unknown) {
      threw = err instanceof SSRFError;
    }
    assert.strictEqual(threw, true);
  });

  await test('SSRF rejects private IPv4 127.0.0.1', async () => {
    let threw = false;
    try {
      await validateSSRF('http://127.0.0.1:8080');
    } catch (err: unknown) {
      threw = err instanceof SSRFError;
    }
    assert.strictEqual(threw, true);
  });

  await test('SSRF rejects AWS/GCP metadata IP 169.254.169.254', async () => {
    let threw = false;
    try {
      await validateSSRF('http://169.254.169.254/latest/meta-data/');
    } catch (err: unknown) {
      threw = err instanceof SSRFError;
    }
    assert.strictEqual(threw, true);
  });

  await test('SSRF rejects non-HTTP protocol file://', async () => {
    let threw = false;
    try {
      await validateSSRF('file:///etc/passwd');
    } catch (err: unknown) {
      threw = err instanceof SSRFError;
    }
    assert.strictEqual(threw, true);
  });

  // 4. URL Structure Heuristics
  test('URL Heuristics detects raw numerical IP addresses', () => {
    const h = analyzeUrlHeuristics('http://192.0.2.1/login');
    assert.strictEqual(h.isIpAddress, true);
  });

  test('URL Heuristics detects sensitive keywords', () => {
    const h = analyzeUrlHeuristics('https://update-kyc-refund-portal.net/verify');
    assert.ok(h.suspiciousKeywordsFound.includes('kyc'));
    assert.ok(h.suspiciousKeywordsFound.includes('refund'));
    assert.ok(h.suspiciousKeywordsFound.includes('verify'));
  });

  // 5. Query Parameter Hashing Privacy Tests
  test('Logs and storage store only hashed query parameters', () => {
    const raw = 'https://example.com/login?token=mysecrettoken&user=john@doe.com';
    const sanitized = sanitizeUrlForStorage(raw);
    assert.strictEqual(sanitized.includes('mysecrettoken'), false);
    assert.strictEqual(sanitized.includes('john@doe.com'), false);
    assert.ok(sanitized.includes('token=hash_'));
    assert.ok(sanitized.includes('user=hash_'));
  });

  console.log(`\n🎉 Test Results: ${passed}/${total} passed (${Math.round((passed / total) * 100)}%)\n`);

}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});
