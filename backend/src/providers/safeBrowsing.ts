import { SignalSeverity } from '@prisma/client';
import { SignalInput } from '../engine/types.js';

interface GsbCacheEntry {
  isMalicious: boolean;
  threatType?: string;
  timestamp: number;
}

const gsbCache = new Map<string, GsbCacheEntry>();
const CACHE_TTL_MS = 1000 * 60 * 30; // 30 minutes

export async function checkSafeBrowsing(url: string): Promise<SignalInput | null> {
  const apiKey = process.env.SAFE_BROWSING_API_KEY;
  if (!apiKey || apiKey.trim() === '') {
    // API key not configured; fallback gracefully without penalty
    return null;
  }

  const cached = gsbCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    if (cached.isMalicious) {
      return {
        code: 'KNOWN_PHISHING',
        severity: SignalSeverity.CRITICAL,
        scoreImpact: 70,
        metadata: { threatType: cached.threatType, source: 'Google Safe Browsing (cached)' },
      };
    }
    return null;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const endpoint = `https://safebrowsing.googleapis.com/v4/threatMatches:find?key=${apiKey}`;
    const payload = {
      client: {
        clientId: 'phishlens-security-engine',
        clientVersion: '1.0.0',
      },
      threatInfo: {
        threatTypes: [
          'MALWARE',
          'SOCIAL_ENGINEERING',
          'UNWANTED_SOFTWARE',
          'POTENTIALLY_HARMFUL_APPLICATION',
        ],
        platformTypes: ['ANY_PLATFORM'],
        threatEntryTypes: ['URL'],
        threatEntries: [{ url }],
      },
    };

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return null;
    }

    const data = (await response.json()) as { matches?: Array<{ threatType: string }> };

    if (data.matches && data.matches.length > 0) {
      const match = data.matches[0];
      gsbCache.set(url, { isMalicious: true, threatType: match.threatType, timestamp: Date.now() });

      return {
        code: 'KNOWN_PHISHING',
        severity: SignalSeverity.CRITICAL,
        scoreImpact: 70,
        message: `Identified as known ${match.threatType.toLowerCase().replace(/_/g, ' ')} threat by Google Safe Browsing.`,
        metadata: { threatType: match.threatType },
      };
    }

    gsbCache.set(url, { isMalicious: false, timestamp: Date.now() });
    return null;
  } catch {
    // If request fails or times out, never fail the whole scan; return null
    return null;
  }
}
