import { Router } from 'express';
import { z } from 'zod';
import { InputType, Prisma, SignalSeverity } from '@prisma/client';
import { prisma } from '../db/client.js';
import { validateSSRF, SSRFError } from '../security/ssrf.js';
import { resolveRedirects } from '../pipeline/redirectResolver.js';
import { analyzeUrlHeuristics } from '../pipeline/urlHeuristics.js';
import { checkSafeBrowsing } from '../providers/safeBrowsing.js';
import { lookupDomainAge, evaluateDomainAgeSignal } from '../providers/rdap.js';
import { checkLookalikeAndHomoglyphs } from '../pipeline/lookalikeEngine.js';
import { analyzeThreatWithGemini } from '../providers/gemini.js';
import { analyzeIntentGuard } from '../pipeline/intentGuard.js';
import { checkScamDNA } from '../pipeline/scamDna.js';
import { parseUPIString } from '../pipeline/upiParser.js';
import { analyzePaymentTruth } from '../pipeline/paymentTruth.js';
import { calculateRisk } from '../engine/riskEngine.js';
import { SignalInput } from '../engine/types.js';
import { sanitizeUrlForStorage } from '../utils/sanitizeUrl.js';
import { extractTokenFromContent, verifyQrPayload } from '../services/merchantQrService.js';

export const scansRouter = Router();

const UrlScanSchema = z.object({
  url: z.string().min(1, 'URL is required').trim(),
});

const PageMetadataSchema = z.object({
  url: z.string().optional(),
  title: z.string().optional(),
  headings: z.array(z.string()).optional(),
  brandKeywords: z.array(z.string()).optional(),
  logoAltText: z.array(z.string()).optional(),
  hasPasswordField: z.boolean().optional(),
  hasOtpField: z.boolean().optional(),
  hasCvvField: z.boolean().optional(),
  hasCardField: z.boolean().optional(),
  hasKycField: z.boolean().optional(),
  hasUpiPinField: z.boolean().optional(),
  inputFieldNames: z.array(z.string()).optional(),
  faviconUrl: z.string().optional(),
  domStructureHash: z.string().optional(),
});

const QrScanSchema = z.object({
  qrContent: z.string().min(1, 'QR payload is required').trim(),
  expectedIntent: z.enum(['PAY_MERCHANT', 'RECEIVE_MONEY', 'NOT_SURE']).optional(),
  expectedMerchantName: z.string().optional(),
});

/**
 * POST /api/v1/scans/url
 * Primary URL scanning endpoint with redirect tracing, heuristics, reputation, and scoring
 */
scansRouter.post('/scans/url', async (req, res): Promise<void> => {
  const parseResult = UrlScanSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  let rawUrl = parseResult.data.url;
  if (!/^https?:\/\//i.test(rawUrl)) {
    rawUrl = 'https://' + rawUrl;
  }

  const collectedSignals: SignalInput[] = [];

  // 1. SSRF Validation
  try {
    await validateSSRF(rawUrl);
  } catch (err: unknown) {
    res.status(400).json({
      error: (err as Error).message,
      isBlocked: true,
    });
    return;
  }

  // 2. Redirect Resolution (Up to 5 hops)
  const redirectInfo = await resolveRedirects(rawUrl);
  const finalUrl = redirectInfo.finalUrl;
  const initialHostname = new URL(rawUrl).hostname.toLowerCase();
  const finalHostname = redirectInfo.finalHostname;

  if (redirectInfo.isShortened) {
    collectedSignals.push({
      code: 'URL_SHORTENER_DETECTED',
      severity: SignalSeverity.LOW,
      scoreImpact: 5,
      message: `Shortened URL detected (${initialHostname}). Destination unmasked to '${finalHostname}'.`,
      metadata: { shortener: initialHostname, finalHostname, redirectCount: redirectInfo.redirectCount },
    });
  }

  if (redirectInfo.redirectCount >= 3 || redirectInfo.crossDomainCount > 1) {
    collectedSignals.push({
      code: 'EXCESSIVE_REDIRECTS',
      severity: SignalSeverity.LOW,
      scoreImpact: 10,
      message: `Multiple redirect hops detected (${redirectInfo.redirectCount} redirects across ${redirectInfo.crossDomainCount} different domains).`,
      metadata: {
        redirectCount: redirectInfo.redirectCount,
        crossDomainCount: redirectInfo.crossDomainCount,
      },
    });
  }

  // 3. Pre-compute URL Structure Heuristics
  const heuristics = analyzeUrlHeuristics(finalUrl);
  if (heuristics.isIpAddress) {
    collectedSignals.push({
      code: 'IP_ADDRESS_URL',
      severity: SignalSeverity.LOW,
      scoreImpact: 10,
      message: 'Destination navigates directly to a raw numerical IP address.',
    });
  }

  if (heuristics.suspiciousKeywordsFound.length > 0) {
    collectedSignals.push({
      code: 'SUSPICIOUS_URL_KEYWORDS',
      severity: SignalSeverity.LOW,
      scoreImpact: 8,
      message: `Suspicious keywords found in URL path: ${heuristics.suspiciousKeywordsFound.join(', ')}.`,
      metadata: { keywords: heuristics.suspiciousKeywordsFound },
    });
  }

  // 4. Independent Concurrent Threat & Gemini Intelligence Checks
  const [safeBrowsingSig, rdapResult, lookalikeResult, geminiAnalysis] = await Promise.all([
    checkSafeBrowsing(finalUrl),
    lookupDomainAge(finalHostname),
    checkLookalikeAndHomoglyphs(finalHostname),
    analyzeThreatWithGemini({
      url: finalUrl,
      hostname: finalHostname,
      initialUrl: rawUrl !== finalUrl ? rawUrl : undefined,
      isShortened: redirectInfo.isShortened,
      redirectChain: redirectInfo.chain.map((h) => `${h.hostname} [${h.statusCode}]`),
      redirectCount: redirectInfo.redirectCount,
      suspiciousKeywords: heuristics.suspiciousKeywordsFound,
    }),
  ]);

  if (safeBrowsingSig) {
    collectedSignals.push(safeBrowsingSig);
  }

  const ageSig = evaluateDomainAgeSignal(rdapResult.ageDays);
  if (ageSig) {
    collectedSignals.push(ageSig);
  }

  if (lookalikeResult.signals.length > 0) {
    collectedSignals.push(...lookalikeResult.signals);
  }

  // If Gemini detected universal brand impersonation outside stored list
  if (
    geminiAnalysis &&
    geminiAnalysis.apparentBrand &&
    !geminiAnalysis.isLegitimateDomain &&
    !lookalikeResult.isOfficialDomain
  ) {
    const impersonationScore =
      geminiAnalysis.threatLevel === 'MALICIOUS' || geminiAnalysis.impersonationConfidence >= 80
        ? Math.max(50, geminiAnalysis.additionalRiskPoints || 50)
        : Math.max(35, geminiAnalysis.additionalRiskPoints || 35);

    collectedSignals.push({
      code: 'GEMINI_IMPERSONATION_DETECTED',
      severity: SignalSeverity.HIGH,
      scoreImpact: Math.min(60, impersonationScore),
      message: `Gemini AI identified impersonation of '${geminiAnalysis.apparentBrand}'. Official domain: '${geminiAnalysis.legitimateOfficialDomain || 'unverified'}'.`,
      metadata: {
        brand: geminiAnalysis.apparentBrand,
        officialDomain: geminiAnalysis.legitimateOfficialDomain,
        confidence: geminiAnalysis.impersonationConfidence,
        threatLevel: geminiAnalysis.threatLevel,
      },
    });
  }

  // If Gemini detected social engineering tactics
  if (
    geminiAnalysis &&
    geminiAnalysis.socialEngineeringTactics &&
    geminiAnalysis.socialEngineeringTactics.length > 0
  ) {
    collectedSignals.push({
      code: 'SOCIAL_ENGINEERING_TACTICS',
      severity: SignalSeverity.MEDIUM,
      scoreImpact: Math.min(15, geminiAnalysis.socialEngineeringTactics.length * 5),
      message: `Psychological manipulation tactics identified: ${geminiAnalysis.socialEngineeringTactics.join(', ')}.`,
      metadata: { tactics: geminiAnalysis.socialEngineeringTactics },
    });
  }

  // 5. Centralized Risk Scoring & Explanation
  const engineResult = calculateRisk(collectedSignals);

  // 6. Persist to Database
  const sanitizedForDb = sanitizeUrlForStorage(rawUrl);

  const scan = await prisma.scan.create({
    data: {
      inputType: InputType.URL,
      verdict: engineResult.verdict,
      riskScore: engineResult.riskScore,
      explanation: engineResult.explanation,
      hostname: initialHostname,
      finalHostname,
      url: sanitizedForDb,
      signals: {
        create: engineResult.signals.map((s) => ({
          code: s.code,
          severity: s.severity,
          scoreImpact: s.scoreImpact,
          metadata: s.metadata ? (s.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        })),
      },
    },
    include: { signals: true },
  });

  res.json({
    scanId: scan.id,
    inputType: 'URL',
    verdict: scan.verdict,
    riskScore: scan.riskScore,
    explanation: scan.explanation,
    why: engineResult.why,
    hostname: initialHostname,
    finalHostname,
    url: rawUrl,
    finalUrl,
    isShortened: redirectInfo.isShortened,
    redirects: redirectInfo.chain,
    signals: engineResult.signals,
    intentGuard: {
      claimedBrand: lookalikeResult.matchedBrandName || geminiAnalysis?.apparentBrand || undefined,
      isOfficialDomain: lookalikeResult.isOfficialDomain || (geminiAnalysis?.isLegitimateDomain ?? false),
      domainAgeDays: rdapResult.ageDays,
      hasCredentialTrap: false,
      lookalikeMatch: lookalikeResult.matchedOfficialDomain || geminiAnalysis?.legitimateOfficialDomain || undefined,
    },
    geminiAdvisor: geminiAnalysis || undefined,
    createdAt: scan.createdAt.toISOString(),
  });
});

/**
 * POST /api/v1/scans/:scanId/page-metadata
 * Content Script metadata enrichment for IntentGuard & Credential Traps
 */
scansRouter.post('/scans/:scanId/page-metadata', async (req, res): Promise<void> => {
  const { scanId } = req.params;
  const parseResult = PageMetadataSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const scan = await prisma.scan.findUnique({
    where: { id: scanId },
    include: { signals: true },
  });

  if (!scan) {
    res.status(404).json({ error: 'Scan not found' });
    return;
  }

  const hostname = scan.finalHostname || scan.hostname || '';

  // Check if current domain is official
  const lookalikeResult = await checkLookalikeAndHomoglyphs(hostname);

  // Run IntentGuard analysis with page metadata
  const intentGuardResult = await analyzeIntentGuard(
    hostname,
    parseResult.data,
    lookalikeResult.isOfficialDomain
  );

  // Run ScamDNA and Gemini Threat Analysis concurrently
  const [scamDnaSignal, geminiAnalysis] = await Promise.all([
    checkScamDNA(
      intentGuardResult.claimedBrand,
      parseResult.data.title,
      parseResult.data.inputFieldNames,
      parseResult.data.headings
    ),
    analyzeThreatWithGemini({
      url: scan.url || `https://${hostname}`,
      hostname,
      title: parseResult.data.title,
      headings: parseResult.data.headings,
      brandKeywords: parseResult.data.brandKeywords,
      inputFieldNames: parseResult.data.inputFieldNames,
      hasPasswordField: parseResult.data.hasPasswordField,
      hasOtpField: parseResult.data.hasOtpField,
    }),
  ]);

  if (scamDnaSignal) {
    intentGuardResult.signals.push(scamDnaSignal);
  }

  if (
    geminiAnalysis &&
    geminiAnalysis.apparentBrand &&
    !geminiAnalysis.isLegitimateDomain &&
    !lookalikeResult.isOfficialDomain
  ) {
    const impersonationScore =
      geminiAnalysis.threatLevel === 'MALICIOUS' || geminiAnalysis.impersonationConfidence >= 80
        ? Math.max(50, geminiAnalysis.additionalRiskPoints || 50)
        : Math.max(35, geminiAnalysis.additionalRiskPoints || 35);

    intentGuardResult.signals.push({
      code: 'GEMINI_IMPERSONATION_DETECTED',
      severity: SignalSeverity.HIGH,
      scoreImpact: Math.min(60, impersonationScore),
      message: `Gemini AI identified impersonation of '${geminiAnalysis.apparentBrand}'. Official domain: '${geminiAnalysis.legitimateOfficialDomain || 'unverified'}'.`,
      metadata: {
        brand: geminiAnalysis.apparentBrand,
        officialDomain: geminiAnalysis.legitimateOfficialDomain,
        confidence: geminiAnalysis.impersonationConfidence,
      },
    });
  }

  // Combine existing signals with new IntentGuard signals
  const existingSignals: SignalInput[] = scan.signals.map((s) => ({
    code: s.code,
    severity: s.severity,
    scoreImpact: s.scoreImpact,
    metadata: (s.metadata as Record<string, unknown>) || undefined,
  }));

  const allSignals = [...existingSignals];
  for (const newSig of intentGuardResult.signals) {
    if (!allSignals.some((s) => s.code === newSig.code)) {
      allSignals.push(newSig);
      // Save new signal to DB
      await prisma.scanSignal.create({
        data: {
          scanId: scan.id,
          code: newSig.code,
          severity: newSig.severity,
          scoreImpact: newSig.scoreImpact,
          metadata: newSig.metadata ? (newSig.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
        },
      });
    }
  }

  // Recalculate Risk
  const engineResult = calculateRisk(allSignals);

  // Update Scan record
  const updatedScan = await prisma.scan.update({
    where: { id: scan.id },
    data: {
      verdict: engineResult.verdict,
      riskScore: engineResult.riskScore,
      explanation: engineResult.explanation,
    },
    include: { signals: true },
  });

  res.json({
    scanId: updatedScan.id,
    inputType: updatedScan.inputType,
    verdict: updatedScan.verdict,
    riskScore: updatedScan.riskScore,
    explanation: updatedScan.explanation,
    why: engineResult.why,
    hostname: scan.hostname,
    finalHostname: scan.finalHostname,
    signals: engineResult.signals,
    intentGuard: {
      claimedBrand: intentGuardResult.claimedBrand || lookalikeResult.matchedBrandName || geminiAnalysis?.apparentBrand || undefined,
      isOfficialDomain: lookalikeResult.isOfficialDomain || (geminiAnalysis?.isLegitimateDomain ?? false),
      hasCredentialTrap: intentGuardResult.hasCredentialTrap,
      lookalikeMatch: lookalikeResult.matchedOfficialDomain || geminiAnalysis?.legitimateOfficialDomain || undefined,
    },
    geminiAdvisor: geminiAnalysis || undefined,
    createdAt: updatedScan.createdAt.toISOString(),
  });
});

/**
 * POST /api/v1/scans/qr
 * QR scanning endpoint handling both UPI payment payloads and web URLs
 */
scansRouter.post('/scans/qr', async (req, res): Promise<void> => {
  const parseResult = QrScanSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const { qrContent, expectedIntent, expectedMerchantName } = parseResult.data;

  // 1. Check if content encodes a PhishLens Verified Merchant Token (Cryptographic Sticker)
  const merchantToken = extractTokenFromContent(qrContent);
  if (merchantToken) {
    const qrVerification = await verifyQrPayload({
      content: qrContent,
      expectedShopName: expectedMerchantName,
    });

    const vpa = qrVerification.vpa || 'merchant@upi';
    const shopName = qrVerification.shopName || qrVerification.registeredShopName || 'Verified Merchant';

    const syntheticUpi = {
      isUPI: true,
      rawPayload: qrContent,
      rawUPI: qrVerification.upiUri || `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(shopName)}&cu=INR`,
      upiId: vpa,
      payeeName: shopName,
      amount: undefined,
      currency: 'INR',
    };

    const paymentTruth = await analyzePaymentTruth(
      syntheticUpi,
      expectedIntent,
      expectedMerchantName,
      {
        status: qrVerification.status,
        shopName,
        vpa,
        city: qrVerification.city,
        expectedShopName: qrVerification.expectedShopName,
        registeredShopName: qrVerification.registeredShopName,
        message: qrVerification.message,
      }
    );

    const engineResult = calculateRisk(paymentTruth.signals);

    const scan = await prisma.scan.create({
      data: {
        inputType: InputType.QR_UPI,
        verdict: engineResult.verdict,
        riskScore: engineResult.riskScore,
        explanation: engineResult.explanation,
        rawInput: sanitizeUrlForStorage(qrContent),
        signals: {
          create: engineResult.signals.map((s) => ({
            code: s.code,
            severity: s.severity,
            scoreImpact: s.scoreImpact,
            metadata: s.metadata ? (s.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
          })),
        },
      },
    });

    res.json({
      scanId: scan.id,
      inputType: 'QR_UPI',
      verdict: scan.verdict,
      riskScore: scan.riskScore,
      explanation: scan.explanation,
      why: engineResult.why,
      signals: engineResult.signals,
      paymentTruth: {
        isUPI: true,
        upiId: vpa,
        payeeName: shopName,
        amount: null,
        currency: 'INR',
        actionDescription: paymentTruth.actionDescription,
        expectedAction: expectedIntent,
        intentMismatch: paymentTruth.intentMismatch,
        merchantMatchStatus: paymentTruth.merchantMatchStatus,
        merchantVerification: paymentTruth.merchantVerification,
        expectedMerchant: expectedMerchantName,
      },
      createdAt: scan.createdAt.toISOString(),
    });
    return;
  }

  // 2. Check if content is standard UPI QR
  const upiParsed = parseUPIString(qrContent);

  if (upiParsed.isUPI) {
    // Payment Truth Pipeline
    const paymentTruth = await analyzePaymentTruth(
      upiParsed,
      expectedIntent,
      expectedMerchantName
    );

    const engineResult = calculateRisk(paymentTruth.signals);

    const scan = await prisma.scan.create({
      data: {
        inputType: InputType.QR_UPI,
        verdict: engineResult.verdict,
        riskScore: engineResult.riskScore,
        explanation: engineResult.explanation,
        rawInput: sanitizeUrlForStorage(qrContent),
        signals: {
          create: engineResult.signals.map((s) => ({
            code: s.code,
            severity: s.severity,
            scoreImpact: s.scoreImpact,
            metadata: s.metadata ? (s.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
          })),
        },
      },
    });

    res.json({
      scanId: scan.id,
      inputType: 'QR_UPI',
      verdict: scan.verdict,
      riskScore: scan.riskScore,
      explanation: scan.explanation,
      why: engineResult.why,
      signals: engineResult.signals,
      paymentTruth: {
        isUPI: true,
        upiId: upiParsed.upiId,
        payeeName: upiParsed.payeeName,
        amount: upiParsed.amount || null,
        currency: upiParsed.currency,
        actionDescription: paymentTruth.actionDescription,
        expectedAction: expectedIntent,
        intentMismatch: paymentTruth.intentMismatch,
        merchantMatchStatus: paymentTruth.merchantMatchStatus,
        merchantVerification: paymentTruth.merchantVerification,
        expectedMerchant: expectedMerchantName,
      },
      createdAt: scan.createdAt.toISOString(),
    });
    return;
  }

  // Check if content is a URL
  if (/^https?:\/\//i.test(qrContent) || /^[\w-]+\.[a-z]{2,}/i.test(qrContent)) {
    let targetUrl = qrContent;
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    try {
      await validateSSRF(targetUrl);
    } catch (err: unknown) {
      res.status(400).json({ error: (err as Error).message, isBlocked: true });
      return;
    }

    const redirectInfo = await resolveRedirects(targetUrl);
    const finalHostname = redirectInfo.finalHostname;

    const [safeBrowsingSig, rdapResult, lookalikeResult] = await Promise.all([
      checkSafeBrowsing(redirectInfo.finalUrl),
      lookupDomainAge(finalHostname),
      checkLookalikeAndHomoglyphs(finalHostname),
    ]);

    const collectedSignals: SignalInput[] = [];
    if (safeBrowsingSig) collectedSignals.push(safeBrowsingSig);

    const ageSig = evaluateDomainAgeSignal(rdapResult.ageDays);
    if (ageSig) collectedSignals.push(ageSig);

    if (lookalikeResult.signals.length > 0) collectedSignals.push(...lookalikeResult.signals);

    const heuristics = analyzeUrlHeuristics(redirectInfo.finalUrl);
    if (heuristics.isIpAddress) {
      collectedSignals.push({
        code: 'IP_ADDRESS_URL',
        severity: SignalSeverity.LOW,
        scoreImpact: 10,
        message: 'Destination navigates directly to a raw numerical IP address.',
      });
    }

    const engineResult = calculateRisk(collectedSignals);

    const scan = await prisma.scan.create({
      data: {
        inputType: InputType.QR_URL,
        verdict: engineResult.verdict,
        riskScore: engineResult.riskScore,
        explanation: engineResult.explanation,
        hostname: new URL(targetUrl).hostname,
        finalHostname,
        url: sanitizeUrlForStorage(targetUrl),
        signals: {
          create: engineResult.signals.map((s) => ({
            code: s.code,
            severity: s.severity,
            scoreImpact: s.scoreImpact,
            metadata: s.metadata ? (s.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
          })),
        },
      },
    });

    res.json({
      scanId: scan.id,
      inputType: 'QR_URL',
      verdict: scan.verdict,
      riskScore: scan.riskScore,
      explanation: scan.explanation,
      why: engineResult.why,
      hostname: new URL(targetUrl).hostname,
      finalHostname,
      url: targetUrl,
      signals: engineResult.signals,
      intentGuard: {
        claimedBrand: lookalikeResult.matchedBrandName,
        isOfficialDomain: lookalikeResult.isOfficialDomain,
        domainAgeDays: rdapResult.ageDays,
        hasCredentialTrap: false,
      },
      createdAt: scan.createdAt.toISOString(),
    });
    return;
  }

  // Plain text or unhandled payload
  res.json({
    inputType: 'UNKNOWN',
    verdict: 'SAFE',
    riskScore: 0,
    explanation: 'Scanned content is plain text and does not initiate a payment or navigate to a web URL.',
    why: ['Payload contains plain text with no executable URL or UPI payment instructions.'],
    rawContent: qrContent,
  });
});
