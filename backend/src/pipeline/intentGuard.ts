import { SignalSeverity } from '@prisma/client';
import { prisma } from '../db/client.js';
import { SignalInput } from '../engine/types.js';

export interface PageMetadataInput {
  title?: string;
  headings?: string[];
  brandKeywords?: string[];
  logoAltText?: string[];
  hasPasswordField?: boolean;
  hasOtpField?: boolean;
  hasCvvField?: boolean;
  hasCardField?: boolean;
  hasKycField?: boolean;
  hasUpiPinField?: boolean;
  inputFieldNames?: string[];
}

export interface IntentGuardAnalysisResult {
  claimedBrand: string | null;
  isOfficialDomain: boolean;
  hasCredentialTrap: boolean;
  signals: SignalInput[];
}

export async function analyzeIntentGuard(
  hostname: string,
  metadata: PageMetadataInput,
  isOfficialDomain: boolean
): Promise<IntentGuardAnalysisResult> {
  const signals: SignalInput[] = [];
  const normalizedHost = hostname.toLowerCase();

  // Combine textual clues from DOM
  const textCorpus = [
    metadata.title || '',
    ...(metadata.headings || []),
    ...(metadata.brandKeywords || []),
    ...(metadata.logoAltText || []),
  ]
    .join(' ')
    .toLowerCase();

  // 1. Identify which protected brand this page is claiming to be
  const brands = await prisma.brand.findMany({
    include: { domains: true },
  });

  let claimedBrand: { name: string; officialDomains: string[] } | null = null;

  for (const brand of brands) {
    for (const kw of brand.keywords) {
      if (textCorpus.includes(kw.toLowerCase())) {
        claimedBrand = {
          name: brand.name,
          officialDomains: brand.domains.map((d) => d.officialDomain.toLowerCase()),
        };
        break;
      }
    }
    if (claimedBrand) break;
  }

  // 2. Check Brand / Domain mismatch
  if (claimedBrand) {
    const isActuallyOfficial = claimedBrand.officialDomains.some(
      (dom) => normalizedHost === dom || normalizedHost.endsWith(`.${dom}`)
    );

    if (!isActuallyOfficial) {
      signals.push({
        code: 'BRAND_DOMAIN_MISMATCH',
        severity: SignalSeverity.HIGH,
        scoreImpact: 30,
        message: `Page claims to be ${claimedBrand.name} but is hosted on unofficial domain '${hostname}'.`,
        metadata: {
          brand: claimedBrand.name,
          officialDomains: claimedBrand.officialDomains,
        },
      });
    }
  }

  // 3. Credential Trap Detection (Section 15)
  // Check if page contains sensitive credential inputs
  const hasCredentialInputs =
    Boolean(metadata.hasPasswordField) ||
    Boolean(metadata.hasOtpField) ||
    Boolean(metadata.hasCvvField) ||
    Boolean(metadata.hasCardField) ||
    Boolean(metadata.hasKycField) ||
    Boolean(metadata.hasUpiPinField);

  if (metadata.hasOtpField) {
    signals.push({
      code: 'OTP_FIELD_DETECTED',
      severity: SignalSeverity.LOW,
      scoreImpact: 12,
      message: 'OTP / Verification code input field detected on page.',
    });
  }

  if (metadata.hasPasswordField) {
    signals.push({
      code: 'PASSWORD_FIELD_DETECTED',
      severity: SignalSeverity.LOW,
      scoreImpact: 8,
      message: 'Password entry input field detected on page.',
    });
  }

  // If page is NOT an official domain and has credential forms -> CREDENTIAL_TRAP (+25)
  let hasCredentialTrap = false;
  if (!isOfficialDomain && (claimedBrand || hasCredentialInputs)) {
    if (hasCredentialInputs) {
      hasCredentialTrap = true;
      signals.push({
        code: 'CREDENTIAL_TRAP',
        severity: SignalSeverity.HIGH,
        scoreImpact: 25,
        message: 'Suspicious credential/OTP harvesting form detected on an unofficial website.',
        metadata: {
          hasPasswordField: metadata.hasPasswordField,
          hasOtpField: metadata.hasOtpField,
          hasKycField: metadata.hasKycField,
        },
      });
    }
  }

  return {
    claimedBrand: claimedBrand ? claimedBrand.name : null,
    isOfficialDomain,
    hasCredentialTrap,
    signals,
  };
}
