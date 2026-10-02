import { SignalSeverity } from '@prisma/client';
import { SignalInput } from '../engine/types.js';

interface RdapResult {
  registrationDate: Date | null;
  ageDays: number | null;
  raw?: unknown;
}

const rdapCache = new Map<string, { result: RdapResult; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours

export async function lookupDomainAge(domain: string): Promise<RdapResult> {
  const cached = rdapCache.get(domain);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch(`https://rdap.org/domain/${domain}`, {
      headers: { Accept: 'application/rdap+json, application/json' },
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!response.ok) {
      return { registrationDate: null, ageDays: null };
    }

    const data = (await response.json()) as {
      events?: Array<{ eventAction: string; eventDate: string }>;
    };

    let regDateStr: string | null = null;
    if (data.events && Array.isArray(data.events)) {
      const regEvent = data.events.find(
        (e) => e.eventAction === 'registration' || e.eventAction === 'created'
      );
      if (regEvent) {
        regDateStr = regEvent.eventDate;
      }
    }

    if (regDateStr) {
      const regDate = new Date(regDateStr);
      if (!isNaN(regDate.getTime())) {
        const diffMs = Date.now() - regDate.getTime();
        const ageDays = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
        const result: RdapResult = { registrationDate: regDate, ageDays };
        rdapCache.set(domain, { result, timestamp: Date.now() });
        return result;
      }
    }

    const fallbackResult = { registrationDate: null, ageDays: null };
    rdapCache.set(domain, { result: fallbackResult, timestamp: Date.now() });
    return fallbackResult;
  } catch {
    // If RDAP lookup fails or times out, degrade gracefully without increasing threat score
    return { registrationDate: null, ageDays: null };
  }
}

export function evaluateDomainAgeSignal(ageDays: number | null): SignalInput | null {
  if (ageDays === null) return null;

  if (ageDays < 7) {
    return {
      code: 'DOMAIN_AGE_UNDER_7_DAYS',
      severity: SignalSeverity.MEDIUM,
      scoreImpact: 20,
      message: `Domain was created very recently (${ageDays} day${ageDays === 1 ? '' : 's'} ago).`,
      metadata: { ageDays },
    };
  } else if (ageDays < 30) {
    return {
      code: 'DOMAIN_AGE_UNDER_30_DAYS',
      severity: SignalSeverity.LOW,
      scoreImpact: 12,
      message: `Domain is less than a month old (${ageDays} days).`,
      metadata: { ageDays },
    };
  }

  return null;
}
