import { SignalSeverity } from '@prisma/client';
import { prisma } from '../db/client.js';
import { SignalInput } from '../engine/types.js';
import { parse } from 'tldts';

// Common Latin lookalikes in Cyrillic, Greek, etc.
const CONFUSABLE_MAP: Record<string, string> = {
  // Cyrillic
  '\u0430': 'a', // а
  '\u0435': 'e', // е
  '\u043E': 'o', // о
  '\u0440': 'p', // р
  '\u0441': 'c', // с
  '\u0443': 'y', // у
  '\u0445': 'x', // х
  '\u0456': 'i', // і
  '\u0458': 'j', // ј
  '\u0410': 'A',
  '\u0412': 'B',
  '\u0415': 'E',
  '\u041A': 'K',
  '\u041C': 'M',
  '\u041D': 'H',
  '\u041E': 'O',
  '\u0420': 'P',
  '\u0421': 'C',
  '\u0422': 'T',
  '\u0425': 'X',
  // Greek
  '\u03BF': 'o', // ο
  '\u03BD': 'v', // ν
  '\u03C1': 'p', // ρ
};

/**
 * Standard Levenshtein Distance calculation
 */
function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }

  return dp[m][n];
}

/**
 * Normalizes confusable Unicode characters to their Latin counterparts.
 */
function normalizeConfusables(str: string): { normalized: string; hadConfusables: boolean } {
  let hadConfusables = false;
  let normalized = '';

  for (const char of str) {
    if (CONFUSABLE_MAP[char]) {
      normalized += CONFUSABLE_MAP[char];
      hadConfusables = true;
    } else {
      normalized += char;
    }
  }

  return { normalized, hadConfusables };
}

export interface LookalikeCheckResult {
  isOfficialDomain: boolean;
  matchedBrandName?: string;
  matchedOfficialDomain?: string;
  signals: SignalInput[];
}

export async function checkLookalikeAndHomoglyphs(hostname: string): Promise<LookalikeCheckResult> {
  const normalizedHost = hostname.toLowerCase();
  const parsed = parse(normalizedHost);
  const candidateDomain = parsed.domain || normalizedHost;
  const candidateSLD = (parsed.domainWithoutSuffix || candidateDomain.split('.')[0]).toLowerCase();

  // 1. Fetch all protected brands and their official domains
  const brands = await prisma.brand.findMany({
    include: { domains: true },
  });

  // 2. Check if host is an official domain of any brand
  for (const brand of brands) {
    for (const d of brand.domains) {
      const official = d.officialDomain.toLowerCase();
      if (candidateDomain === official || normalizedHost.endsWith(`.${official}`)) {
        return {
          isOfficialDomain: true,
          matchedBrandName: brand.name,
          matchedOfficialDomain: official,
          signals: [],
        };
      }
    }
  }

  // 3. Not an official domain. Check for homoglyphs (e.g., punycode or confusables)
  const signals: SignalInput[] = [];
  const { normalized: deconfusedSLD, hadConfusables } = normalizeConfusables(candidateSLD);

  const isPunycode = normalizedHost.includes('xn--');

  for (const brand of brands) {
    const brandNameLower = brand.name.toLowerCase();
    const brandKey = brand.normalizedName.toLowerCase();
    const officialDomains = brand.domains.map((d) => d.officialDomain.toLowerCase());

    // Check each official domain's SLD (e.g. "sbi" from "sbi.co.in", "hdfcbank" from "hdfcbank.com")
    for (const official of officialDomains) {
      const officialParsed = parse(official);
      const officialSLD = (officialParsed.domainWithoutSuffix || official.split('.')[0]).toLowerCase();

      // Case A: Unicode Homoglyph attack (e.g. Cyrillic 'а' replacing Latin 'a' in 'paytm' or 'sbi')
      if ((hadConfusables || isPunycode) && deconfusedSLD.includes(officialSLD)) {
        signals.push({
          code: 'HOMOGLYPH_BRAND_MATCH',
          severity: SignalSeverity.HIGH,
          scoreImpact: 35,
          message: `Domain uses confusable characters to imitate ${brand.name} (${official}).`,
          metadata: { brand: brand.name, officialDomain: official },
        });
        return {
          isOfficialDomain: false,
          matchedBrandName: brand.name,
          matchedOfficialDomain: official,
          signals,
        };
      }

      // Case B: Typosquatting / Edit Distance (Distance <= 2, but length >= 4)
      const distance = levenshteinDistance(candidateSLD, officialSLD);
      const isCloseEdit = distance > 0 && distance <= 2 && officialSLD.length >= 4;

      // Case C: Combosquatting (e.g. "hdfc-secure", "sbi-login", "paytm-kyc")
      const containsBrandPattern =
        (candidateSLD.includes(`${officialSLD}-`) ||
          candidateSLD.includes(`-${officialSLD}`) ||
          candidateSLD.includes(`${brandKey}-`) ||
          candidateSLD.includes(`-${brandKey}`)) &&
        !officialDomains.includes(candidateDomain);

      if (isCloseEdit || containsBrandPattern) {
        signals.push({
          code: 'STRONG_LOOKALIKE_DOMAIN',
          severity: SignalSeverity.HIGH,
          scoreImpact: 25,
          message: `Domain '${candidateDomain}' closely mimics official ${brand.name} address (${official}).`,
          metadata: {
            brand: brand.name,
            officialDomain: official,
            reason: isCloseEdit ? 'edit_distance' : 'combosquatting',
          },
        });
        return {
          isOfficialDomain: false,
          matchedBrandName: brand.name,
          matchedOfficialDomain: official,
          signals,
        };
      }
    }
  }

  return {
    isOfficialDomain: false,
    signals,
  };
}
