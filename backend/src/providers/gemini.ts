import { GoogleGenAI, Type } from '@google/genai';

export interface GeminiThreatAnalysis {
  apparentBrand: string | null;
  isLegitimateDomain: boolean;
  legitimateOfficialDomain?: string | null;
  impersonationConfidence: number; // 0 - 100
  socialEngineeringTactics: string[];
  summaryExplanation: string;
  actionableAdvice: string;
  threatLevel: 'SAFE' | 'SUSPICIOUS' | 'MALICIOUS';
  additionalRiskPoints: number; // 0 - 40
}

interface CacheEntry {
  analysis: GeminiThreatAnalysis;
  timestamp: number;
}

const geminiCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 15; // 15 minutes

export interface GeminiAnalysisContext {
  url: string;
  hostname: string;
  title?: string;
  headings?: string[];
  brandKeywords?: string[];
  inputFieldNames?: string[];
  hasPasswordField?: boolean;
  hasOtpField?: boolean;
  domainAgeDays?: number | null;
  redirectCount?: number;
  suspiciousKeywords?: string[];
}

export async function analyzeThreatWithGemini(
  ctx: GeminiAnalysisContext
): Promise<GeminiThreatAnalysis | null> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    // API key not populated; fallback cleanly to deterministic rules
    return null;
  }

  const cacheKey = ctx.url.toLowerCase();
  const cached = geminiCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.analysis;
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const model = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

    const prompt = `
You are PhishLens AI, a world-class cybersecurity and threat intelligence reasoning model.
Analyze this destination link and page metadata for phishing, brand impersonation, credential harvesting, or deceptive social engineering:

URL: ${ctx.url}
Hostname: ${ctx.hostname}
Page Title: ${ctx.title || 'N/A'}
Page Headings: ${ctx.headings?.join(' | ') || 'N/A'}
Form Inputs Detected: ${ctx.inputFieldNames?.join(', ') || 'N/A'}
Has Password Field: ${ctx.hasPasswordField ?? false}
Has OTP / Verification Field: ${ctx.hasOtpField ?? false}
Domain Registration Age: ${ctx.domainAgeDays !== null && ctx.domainAgeDays !== undefined ? `${ctx.domainAgeDays} days` : 'Unknown'}
Redirect Count: ${ctx.redirectCount ?? 0}
Suspicious Keywords in URL: ${ctx.suspiciousKeywords?.join(', ') || 'None'}

Reason carefully:
1. What organization, brand, or service does this page claim, resemble, or impersonate (globally, e.g. banks, tech companies, delivery, government)? If none, set apparentBrand to null.
2. Is this exact domain the authentic, legitimate primary domain for that organization?
3. Are there social engineering manipulation tactics present (e.g. artificial urgency, account closure panic, prize lure, fake verification)?
4. Assess threat level ('SAFE', 'SUSPICIOUS', or 'MALICIOUS') and recommend risk score impact (0 for safe, 10-25 for suspicious, 30-40 for malicious).
5. Provide a 1-sentence plain English explanation and 1-sentence actionable user advice.
`;

    const apiCallPromise = ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            apparentBrand: { type: Type.STRING, nullable: true },
            isLegitimateDomain: { type: Type.BOOLEAN },
            legitimateOfficialDomain: { type: Type.STRING, nullable: true },
            impersonationConfidence: { type: Type.INTEGER },
            socialEngineeringTactics: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
            },
            summaryExplanation: { type: Type.STRING },
            actionableAdvice: { type: Type.STRING },
            threatLevel: {
              type: Type.STRING,
              enum: ['SAFE', 'SUSPICIOUS', 'MALICIOUS'],
            },
            additionalRiskPoints: { type: Type.INTEGER },
          },
          required: [
            'isLegitimateDomain',
            'impersonationConfidence',
            'socialEngineeringTactics',
            'summaryExplanation',
            'actionableAdvice',
            'threatLevel',
            'additionalRiskPoints',
          ],
        },
      },
    });

    // 2.5 second timeout safeguard
    const timeoutPromise = new Promise<null>((_, reject) =>
      setTimeout(() => reject(new Error('Gemini API timeout')), 2500)
    );

    const response = (await Promise.race([apiCallPromise, timeoutPromise])) as {
      text: string;
    };

    if (!response || !response.text) return null;

    const parsed: GeminiThreatAnalysis = JSON.parse(response.text);

    geminiCache.set(cacheKey, { analysis: parsed, timestamp: Date.now() });
    return parsed;
  } catch (err: unknown) {
    // If Gemini fails or times out, never block the scan; degrade gracefully
    return null;
  }
}
