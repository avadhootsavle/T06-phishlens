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
import { parseIcs, isIcsContent } from '../utils/icsParser.js';

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
 * Core URL scanning pipeline reusable by direct URL scan and batch Email Link scanner
 */
export async function performUrlScan(rawInputUrl: string) {
  let rawUrl = rawInputUrl.trim();
  if (!/^https?:\/\//i.test(rawUrl)) {
    rawUrl = 'https://' + rawUrl;
  }

  const collectedSignals: SignalInput[] = [];

  // 1. SSRF Validation
  try {
    await validateSSRF(rawUrl);
  } catch (err: unknown) {
    return {
      isBlocked: true,
      error: (err as Error).message,
      verdict: 'DANGER' as const,
      riskScore: 100,
      explanation: 'Blocked by SSRF Route Guard: Destination points to protected or internal network.',
      why: ['Destination resolves to private, loopback, or metadata network.'],
      signals: [],
      url: rawUrl,
      finalUrl: rawUrl,
      hostname: 'blocked',
      finalHostname: 'blocked',
      isShortened: false,
      redirects: [],
    };
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

  return {
    scanId: scan.id,
    inputType: 'URL' as const,
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
  };
}

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

  const result = await performUrlScan(parseResult.data.url);
  if ((result as any).isBlocked) {
    res.status(400).json({
      error: (result as any).error,
      isBlocked: true,
    });
    return;
  }

  res.json(result);
});

const EmailScanSchema = z.object({
  subject: z.string().optional(),
  senderName: z.string().optional(),
  senderEmail: z.string().optional(),
  bodySnippet: z.string().optional(),
  icsContent: z.string().optional(),
  links: z
    .array(
      z.object({
        url: z.string(),
        text: z.string().optional(),
      })
    )
    .default([]),
});

/**
 * POST /api/v1/scans/email
 * Comprehensive Gmail / Email / Calendar (.ics) Scanner:
 * 1. Checks for sender/organizer brand spoofing
 * 2. Parses .ics calendar invites for UNC exploit vectors and malicious attachments
 * 3. Scans all links in parallel through the IntentGuard pipeline
 * 4. Evaluates urgency and social engineering patterns
 * 5. Produces a composite threat rating & verdict
 */
scansRouter.post('/scans/email', async (req, res): Promise<void> => {
  const parseResult = EmailScanSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  let { subject, senderName, senderEmail, bodySnippet, icsContent, links } = parseResult.data;

  // Detect and parse RFC 5545 iCalendar (.ics) invite if present
  const rawIcs = icsContent || (bodySnippet && isIcsContent(bodySnippet) ? bodySnippet : undefined);
  const parsedIcs = rawIcs ? parseIcs(rawIcs) : undefined;
  const calendarExploitSignals: string[] = [];

  if (parsedIcs && parsedIcs.isIcs) {
    if (!subject && parsedIcs.summary) {
      subject = parsedIcs.summary;
    }
    if (!senderName && parsedIcs.organizerName) {
      senderName = parsedIcs.organizerName;
    }
    if (!senderEmail && parsedIcs.organizerEmail) {
      senderEmail = parsedIcs.organizerEmail;
    }
    if (parsedIcs.description) {
      bodySnippet = `${bodySnippet ? bodySnippet + '\n\n' : ''}Event Description: ${parsedIcs.description}`;
    }
    if (parsedIcs.location) {
      bodySnippet = `${bodySnippet ? bodySnippet + '\n' : ''}Location: ${parsedIcs.location}`;
    }

    // Merge any URLs extracted from calendar properties
    for (const extracted of parsedIcs.extractedUrls) {
      if (!links.some((l) => l.url.trim().toLowerCase() === extracted.url.trim().toLowerCase())) {
        links.push(extracted);
      }
    }

    // Capture exploit vectors like UNC path coercion or dangerous executable attachments
    if (parsedIcs.exploitIndicators.length > 0) {
      calendarExploitSignals.push(...parsedIcs.exploitIndicators);
    }
  }

  // 1. Analyze Sender Identity vs Claimed Brand
  const brands = await prisma.brand.findMany({
    include: { domains: true },
  });

  let isSpoofed = false;
  let spoofedBrandName: string | undefined;
  let senderDetails = 'Sender address appears consistent.';
  let senderRiskPoints = 0;

  const senderText = `${senderName || ''} ${senderEmail || ''}`.toLowerCase();
  let senderDomain = '';
  if (senderEmail && senderEmail.includes('@')) {
    senderDomain = senderEmail.split('@')[1].toLowerCase().trim().replace(/[>\])]/, '');
  }

  for (const b of brands) {
    const brandMatches =
      b.keywords.some((kw) => senderText.includes(kw.toLowerCase())) ||
      senderText.includes(b.name.toLowerCase());

    if (brandMatches) {
      const officialDomains = b.domains.map((d) => d.officialDomain.toLowerCase());
      const isOfficial = officialDomains.some(
        (od) => senderDomain === od || senderDomain.endsWith('.' + od)
      );

      if (!isOfficial && senderDomain) {
        isSpoofed = true;
        spoofedBrandName = b.name;
        senderRiskPoints = 50;
        senderDetails = `Display name claims to be '${b.name}', but email was sent from '@${senderDomain}' (Official: ${officialDomains.join(', ')}).`;
        break;
      }
    }
  }

  // Check if claiming to be financial / banking while using generic webmail
  const genericFreeMail = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'yopmail.com'];
  if (!isSpoofed && senderDomain && genericFreeMail.includes(senderDomain)) {
    const bankingKeywords = ['bank', 'security', 'alert', 'kyc', 'support', 'customercare', 'verify', 'update'];
    if (bankingKeywords.some((bk) => (senderName || '').toLowerCase().includes(bk))) {
      isSpoofed = true;
      senderRiskPoints = 40;
      senderDetails = `Institutional service alerts are not dispatched from free webmail accounts (@${senderDomain}).`;
    }
  }

  // 2. Urgent / Coercive Social Engineering Analysis
  const urgencySignals: string[] = [];
  const fullEmailContent = `${subject || ''} ${bodySnippet || ''}`.toLowerCase();

  const urgencyPatterns = [
    { pattern: /(account|card|access)\s+(suspended|blocked|terminated|locked|deactivated)/i, desc: 'Account suspension intimidation' },
    { pattern: /(update|verify|confirm)\s+(kyc|pan|identity|details|pin|password)/i, desc: 'Urgent KYC or credential prompt' },
    { pattern: /(unauthorized|suspicious|fraudulent)\s+(transaction|login|activity)/i, desc: 'Unverified security alert' },
    { pattern: /(unpaid|electricity|power\s+cut|bill\s+due|disconnected\s+tonight)/i, desc: 'Utility disconnection intimidation' },
    { pattern: /(lottery|won|cashback\s+of|reward\s+claim|prize)/i, desc: 'Unsolicited reward or cashback lure' },
    { pattern: /(immediate|urgent|action\s+required|within\s+\d+\s+hours)/i, desc: 'Artificial urgency time pressure' },
  ];

  for (const up of urgencyPatterns) {
    if (up.pattern.test(fullEmailContent)) {
      urgencySignals.push(up.desc);
    }
  }

  const urgencyRiskPoints = urgencySignals.length >= 2 ? 20 : urgencySignals.length === 1 ? 10 : 0;

  // 3. Scan All Contained Links in Parallel (up to 12 unique links)
  const uniqueUrls = Array.from(new Set(links.map((l) => l.url.trim()))).filter((u) => u.length > 0).slice(0, 12);

  const linkScanResults = await Promise.all(
    uniqueUrls.map(async (u) => {
      try {
        const scanRes = await performUrlScan(u);
        const originalLinkObj = links.find((l) => l.url.trim() === u);
        return {
          url: u,
          text: originalLinkObj?.text || undefined,
          scanId: (scanRes as any).scanId,
          verdict: scanRes.verdict,
          riskScore: scanRes.riskScore,
          explanation: scanRes.explanation,
          finalUrl: scanRes.finalUrl,
          why: scanRes.why || [],
          isShortened: scanRes.isShortened,
        };
      } catch (err) {
        return {
          url: u,
          verdict: 'CAUTION' as const,
          riskScore: 30,
          explanation: 'Unable to complete full pipeline inspection for this link.',
          why: [(err as Error).message],
        };
      }
    })
  );

  // 4. Aggregate Email Threat Scoring
  const dangerLinks = linkScanResults.filter((l) => l.verdict === 'DANGER');
  const cautionLinks = linkScanResults.filter((l) => l.verdict === 'CAUTION');
  const safeLinks = linkScanResults.filter((l) => l.verdict === 'SAFE');

  const maxLinkRisk = linkScanResults.length > 0
    ? Math.max(...linkScanResults.map((l) => l.riskScore))
    : 0;

  const calendarExploitRisk = calendarExploitSignals.length > 0 ? 80 : 0;

  let totalEmailRisk = Math.max(
    maxLinkRisk,
    senderRiskPoints + urgencyRiskPoints,
    calendarExploitRisk
  );

  if (calendarExploitSignals.length > 0) {
    totalEmailRisk = Math.max(totalEmailRisk, 85);
  } else if (isSpoofed && dangerLinks.length > 0) {
    totalEmailRisk = Math.max(totalEmailRisk, 90);
  } else if (dangerLinks.length > 0) {
    totalEmailRisk = Math.max(totalEmailRisk, 75);
  }

  totalEmailRisk = Math.min(100, Math.max(0, totalEmailRisk));

  let emailVerdict: 'SAFE' | 'CAUTION' | 'DANGER' = 'SAFE';
  if (totalEmailRisk >= 60 || dangerLinks.length > 0 || isSpoofed || calendarExploitSignals.length > 0) {
    emailVerdict = 'DANGER';
  } else if (totalEmailRisk >= 25 || cautionLinks.length > 0 || urgencySignals.length > 0) {
    emailVerdict = 'CAUTION';
  }

  // 5. Construct Deterministic Explanation
  let explanation = '';
  if (calendarExploitSignals.length > 0) {
    explanation = `Dangerous calendar invite: Detected ${calendarExploitSignals[0]}`;
  } else if (emailVerdict === 'DANGER') {
    if (isSpoofed && dangerLinks.length > 0) {
      explanation = `Dangerous email: Impersonates ${spoofedBrandName || 'a recognized organization'} from an unauthorized domain and contains ${dangerLinks.length} malicious phishing link(s).`;
    } else if (isSpoofed) {
      explanation = `Dangerous email: Sender address is spoofed (${senderDetails}).`;
    } else if (dangerLinks.length > 0) {
      explanation = `Dangerous email: Contains ${dangerLinks.length} high-risk phishing link(s) (${dangerLinks[0].explanation}).`;
    } else {
      explanation = 'High-risk email: Detected strong impersonation and credential theft indicators.';
    }
  } else if (emailVerdict === 'CAUTION') {
    if (cautionLinks.length > 0) {
      explanation = `Caution advised: Contains ${cautionLinks.length} link(s) with suspicious or young domain characteristics.`;
    } else if (urgencySignals.length > 0) {
      explanation = `Caution advised: Uses psychological urgency and pressure tactics (${urgencySignals.join(', ')}).`;
    } else {
      explanation = 'Caution advised: Email signals warrant verification before clicking links.';
    }
  } else {
    explanation = linkScanResults.length > 0
      ? `No malicious links or sender impersonation detected across ${linkScanResults.length} analyzed link(s).`
      : 'No malicious indicators detected in this email.';
  }

  res.json({
    emailVerdict,
    emailRiskScore: totalEmailRisk,
    explanation,
    subject: subject || (parsedIcs?.isIcs ? 'Calendar Event' : 'Untitled Email'),
    senderAnalysis: {
      senderName: senderName || (parsedIcs?.isIcs ? 'Unknown Organizer' : 'Unknown Sender'),
      senderEmail: senderEmail || (parsedIcs?.isIcs ? 'Unknown Organizer Email' : 'Unknown Email'),
      isSpoofed,
      claimedBrand: spoofedBrandName,
      details: senderDetails,
      riskImpact: senderRiskPoints,
    },
    urgencySignals,
    calendarAnalysis: parsedIcs?.isIcs
      ? {
          isCalendarInvite: true,
          summary: parsedIcs.summary,
          organizerName: parsedIcs.organizerName,
          organizerEmail: parsedIcs.organizerEmail,
          location: parsedIcs.location,
          exploitSignals: calendarExploitSignals,
          attachments: parsedIcs.attachments,
        }
      : undefined,
    summary: {
      totalLinks: linkScanResults.length,
      dangerCount: dangerLinks.length,
      cautionCount: cautionLinks.length,
      safeCount: safeLinks.length,
    },
    linksAnalyzed: linkScanResults,
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
