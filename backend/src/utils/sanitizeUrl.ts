import crypto from 'node:crypto';

/**
 * Sanitizes a URL/URI for privacy-safe storage and logging by replacing
 * query parameter values with a deterministic SHA-256 cryptographic hash.
 * This ensures no raw PII or sensitive tokens (?email=..., ?token=..., ?pa=...) are stored.
 */
export function sanitizeUrlForStorage(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const sanitizedParams = new URLSearchParams();

    for (const [key, value] of parsed.searchParams.entries()) {
      const hash = crypto.createHash('sha256').update(value).digest('hex').substring(0, 16);
      sanitizedParams.set(key, `hash_${hash}`);
    }

    parsed.search = sanitizedParams.toString();
    return parsed.toString();
  } catch {
    // If standard URL parsing fails (e.g., custom URI schemes like upi://pay?pa=...), parse query manually
    if (rawUrl.includes('?')) {
      const [base, query] = rawUrl.split('?');
      const searchParams = new URLSearchParams(query);
      const sanitizedParams = new URLSearchParams();

      for (const [key, value] of searchParams.entries()) {
        const hash = crypto.createHash('sha256').update(value).digest('hex').substring(0, 16);
        sanitizedParams.set(key, `hash_${hash}`);
      }

      return `${base}?${sanitizedParams.toString()}`;
    }
    return rawUrl;
  }
}

