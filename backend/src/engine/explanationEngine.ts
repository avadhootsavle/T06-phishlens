import { Verdict } from '@prisma/client';
import { SignalInput } from './types.js';

export function generateExplanation(
  verdict: Verdict,
  signals: SignalInput[]
): { explanation: string; why: string[] } {
  const why: string[] = [];

  // Generate detailed bullet points for each detected signal
  for (const sig of signals) {
    if (sig.message) {
      why.push(sig.message);
      continue;
    }

    switch (sig.code) {
      case 'KNOWN_PHISHING':
        why.push('Flagged by verified threat intelligence as a confirmed phishing destination.');
        break;
      case 'VISUAL_IMPERSONATION_DETECTED':
        why.push(
          sig.metadata?.brand && sig.metadata?.similarity
            ? `Page layout visually matches the official ${sig.metadata.brand} login portal (${sig.metadata.similarity}% visual similarity).`
            : 'Page visually clones the layout and styling of a protected banking login portal.'
        );
        break;
      case 'PAYMENT_INTENT_MISMATCH':
        why.push('This QR initiates a payment from your account even though you expected to receive money.');
        break;
      case 'HOMOGLYPH_BRAND_MATCH':
        why.push(
          sig.metadata?.brand
            ? `Domain closely imitates ${sig.metadata.brand} using deceptive Unicode lookalike characters.`
            : 'Domain uses confusable characters to imitate a protected brand.'
        );
        break;
      case 'SCAMDNA_STRONG_MATCH':
        why.push('Page layout, brand assets, and form structure strongly match a confirmed phishing kit (ScamDNA).');
        break;
      case 'BRAND_DOMAIN_MISMATCH':
        why.push(
          sig.metadata?.brand
            ? `Page displays ${sig.metadata.brand} branding but is not hosted on an official domain.`
            : 'Page claims to be a recognized institution on an unofficial domain.'
        );
        break;
      case 'STRONG_LOOKALIKE_DOMAIN':
        why.push(
          sig.metadata?.brand
            ? `Domain name typosquats or closely mimics official ${sig.metadata.brand} web address.`
            : 'Domain name closely resembles a protected brand.'
        );
        break;
      case 'CREDENTIAL_TRAP':
        why.push('Suspicious credential forms (passwords, PINs, or OTP inputs) detected on an unofficial domain.');
        break;
      case 'MERCHANT_VERIFIED':
        why.push(
          sig.metadata?.shopName
            ? `Verified Merchant QR: Cryptographically confirmed for '${sig.metadata.shopName}'.`
            : 'Verified Merchant: Cryptographically signed official shop QR sticker.'
        );
        break;
      case 'MERCHANT_TAMPERED':
        why.push('This QR sticker claims to be a verified shop QR but its signature is fake. Someone may have pasted a fake sticker.');
        break;
      case 'MERCHANT_REVOKED':
        why.push('Merchant registration has been revoked by administration.');
        break;
      case 'MERCHANT_EXPIRED':
        why.push('Verified merchant QR sticker has expired.');
        break;
      case 'MERCHANT_PAYEE_MISMATCH':
        why.push(
          sig.metadata?.expected && sig.metadata?.actual
            ? `QR recipient '${sig.metadata.actual}' does not match expected merchant '${sig.metadata.expected}'.`
            : 'Payment recipient does not match the merchant name you provided.'
        );
        break;
      case 'DOMAIN_AGE_UNDER_7_DAYS':
        why.push(`Domain was registered very recently (${sig.metadata?.ageDays ?? '< 7'} days ago).`);
        break;
      case 'DOMAIN_AGE_UNDER_30_DAYS':
        why.push(`Domain is less than a month old (${sig.metadata?.ageDays ?? '< 30'} days).`);
        break;
      case 'OTP_FIELD_DETECTED':
        why.push('Sensitive OTP / 2-Factor authentication input field detected.');
        break;
      case 'EXCESSIVE_REDIRECTS':
        why.push('Unusually long or cross-domain redirect chain detected before reaching final destination.');
        break;
      case 'IP_ADDRESS_URL':
        why.push('URL navigates directly to a raw numerical IP address instead of a registered domain.');
        break;
      case 'PASSWORD_FIELD_DETECTED':
        why.push('Password entry field detected.');
        break;
      case 'SUSPICIOUS_URL_KEYWORDS':
        why.push(
          sig.metadata?.keywords
            ? `URL structure includes high-risk keywords: ${(sig.metadata.keywords as string[]).join(', ')}.`
            : 'URL contains security-sensitive keywords commonly found in phishing links.'
        );
        break;
      default:
        why.push(`Security indicator observed: ${sig.code.replace(/_/g, ' ').toLowerCase()}.`);
        break;
    }
  }

  // Primary explanation selection based on dominant signals
  let explanation = '';

  if (verdict === 'DANGER') {
    const dangerSignal = signals.find((s) =>
      [
        'KNOWN_PHISHING',
        'PAYMENT_INTENT_MISMATCH',
        'MERCHANT_TAMPERED',
        'VISUAL_IMPERSONATION_DETECTED',
        'BRAND_DOMAIN_MISMATCH',
        'HOMOGLYPH_BRAND_MATCH',
        'SCAMDNA_STRONG_MATCH',
        'CREDENTIAL_TRAP',
      ].includes(s.code)
    );

    if (dangerSignal) {
      if (dangerSignal.code === 'PAYMENT_INTENT_MISMATCH') {
        explanation = 'This QR starts a payment from you even though you expected to receive money.';
      } else if (dangerSignal.code === 'MERCHANT_TAMPERED') {
        explanation = 'This QR sticker claims to be a verified shop QR but its signature is fake. Someone may have pasted a fake sticker.';
      } else if (dangerSignal.code === 'VISUAL_IMPERSONATION_DETECTED') {
        const brand = dangerSignal.metadata?.brand || 'official';
        const similarity = dangerSignal.metadata?.similarity || '90';
        explanation = `This page looks ${similarity}% like the ${brand} login page but is not an official ${brand} website.`;
      } else if (dangerSignal.code === 'BRAND_DOMAIN_MISMATCH') {
        const brand = dangerSignal.metadata?.brand || 'a protected institution';
        explanation = `This page claims to be ${brand} but is not hosted on an official domain and asks for sensitive details.`;
      } else if (dangerSignal.code === 'HOMOGLYPH_BRAND_MATCH') {
        const brand = dangerSignal.metadata?.brand || 'a trusted brand';
        explanation = `This domain closely imitates ${brand} using deceptive characters to steal credentials.`;
      } else if (dangerSignal.code === 'SCAMDNA_STRONG_MATCH') {
        explanation = 'This site matches known phishing templates previously used in active fraudulent campaigns.';
      } else if (dangerSignal.code === 'KNOWN_PHISHING') {
        explanation = 'This destination has been confirmed malicious by verified global cybersecurity feeds.';
      } else {
        explanation = 'High-risk deception indicators detected matching active phishing operations.';
      }
    } else {
      explanation = 'Multiple high-risk indicators detected that strongly suggest a fraudulent website.';
    }
  } else if (verdict === 'CAUTION') {
    const cautionSignal = signals.find((s) =>
      [
        'MERCHANT_PAYEE_MISMATCH',
        'MERCHANT_REVOKED',
        'MERCHANT_EXPIRED',
        'STRONG_LOOKALIKE_DOMAIN',
        'DOMAIN_AGE_UNDER_7_DAYS',
        'DOMAIN_AGE_UNDER_30_DAYS',
        'EXCESSIVE_REDIRECTS',
      ].includes(s.code)
    );

    if (cautionSignal?.code === 'MERCHANT_PAYEE_MISMATCH') {
      const exp = cautionSignal.metadata?.expected;
      const act = cautionSignal.metadata?.actual;
      explanation =
        exp && act
          ? `The payment recipient '${act}' does not match expected shop '${exp}'.`
          : 'The payment name does not match the merchant name you provided. Confirm the recipient before paying.';
    } else if (cautionSignal?.code === 'MERCHANT_REVOKED') {
      explanation = 'This merchant registration has been revoked. Confirm identity before paying.';
    } else if (cautionSignal?.code === 'MERCHANT_EXPIRED') {
      explanation = 'This verified merchant QR sticker has expired. Confirm with the shopkeeper.';
    } else if (cautionSignal?.code === 'STRONG_LOOKALIKE_DOMAIN') {
      const brand = cautionSignal.metadata?.brand || 'a familiar service';
      explanation = `The domain name resembles ${brand}. Verify the full address carefully before proceeding.`;
    } else if (cautionSignal?.code === 'DOMAIN_AGE_UNDER_7_DAYS' || cautionSignal?.code === 'DOMAIN_AGE_UNDER_30_DAYS') {
      explanation = 'This website was created very recently. Exercise caution before entering personal information.';
    } else {
      explanation = 'Suspicious elements detected. Review site details carefully before taking action.';
    }
  } else {
    // SAFE
    if (signals.some((s) => s.code === 'MERCHANT_VERIFIED')) {
      const verifiedSig = signals.find((s) => s.code === 'MERCHANT_VERIFIED');
      const shop = verifiedSig?.metadata?.shopName;
      explanation = shop
        ? `Verified Merchant: Cryptographically verified official payment QR for ${shop}.`
        : 'Verified Merchant: Official verified payment QR.';
    } else {
      explanation = 'No major phishing indicators were detected.';
    }
    if (why.length === 0) {
      why.push('Verified domain registration and clear redirect path.');
      why.push('No credential harvesting traps or lookalike patterns identified.');
    }
  }

  return { explanation, why };
}
