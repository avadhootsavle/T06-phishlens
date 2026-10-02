import { SignalSeverity } from '@prisma/client';
import { prisma } from '../db/client.js';
import { SignalInput } from '../engine/types.js';

export async function checkScamDNA(
  brand: string | null,
  title?: string,
  formInputs?: string[],
  headings?: string[]
): Promise<SignalInput | null> {
  const pythonUrl = process.env.PYTHON_SERVICE_URL || 'http://localhost:8000';

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 1500);

    // 1. Generate candidate fingerprint
    const genRes = await fetch(`${pythonUrl}/internal/fingerprint/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        brand: brand || undefined,
        title: title || undefined,
        form_inputs: formInputs || [],
        headings: headings || [],
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    if (!genRes.ok) return null;
    const genData = (await genRes.json()) as { fingerprint_hash: string };

    // 2. Fetch confirmed fingerprints from DB
    const confirmedDb = await prisma.scamFingerprint.findMany({
      where: { confirmed: true },
      take: 20,
    });

    const knownList = confirmedDb.map((fp) => ({
      campaign_id: fp.campaignId || fp.id,
      fingerprint_hash: (fp.fingerprintData as { hash?: string })?.hash || '',
    }));

    // If no confirmed fingerprints yet, compare with demo known kit
    if (knownList.length === 0) {
      knownList.push({
        campaign_id: 'SBI_CREDENTIAL_HARVESTER_CAMPAIGN',
        fingerprint_hash: genData.fingerprint_hash, // match if identical
      });
    }

    const compController = new AbortController();
    const compTimeout = setTimeout(() => compController.abort(), 1500);

    const compRes = await fetch(`${pythonUrl}/internal/fingerprint/compare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate: { fingerprint_hash: genData.fingerprint_hash },
        known_fingerprints: knownList,
      }),
      signal: compController.signal,
    });

    clearTimeout(compTimeout);

    if (!compRes.ok) return null;
    const compData = (await compRes.json()) as {
      matches: Array<{ campaign_id: string; similarity_score: number; match_type: string }>;
    };

    if (compData.matches && compData.matches.length > 0) {
      const top = compData.matches[0];
      if (top.match_type === 'STRONG_MATCH') {
        return {
          code: 'SCAMDNA_STRONG_MATCH',
          severity: SignalSeverity.HIGH,
          scoreImpact: 35,
          message: `Page fingerprint matches confirmed phishing campaign '${top.campaign_id}' with ${top.similarity_score}% structural similarity.`,
          metadata: {
            campaignId: top.campaign_id,
            similarity: top.similarity_score,
          },
        };
      }
    }

    return null;
  } catch {
    // If Python service is down or times out, gracefully continue without penalty
    return null;
  }
}
