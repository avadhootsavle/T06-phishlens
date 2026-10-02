/**
 * Sanitizes a URL for privacy-safe storage by stripping sensitive query parameter values.
 * Keeps parameter names but replaces values with '[REDACTED]'.
 */
export function sanitizeUrlForStorage(rawUrl: string): string {
  try {
    const parsed = new URL(rawUrl);
    const sanitizedParams = new URLSearchParams();

    for (const [key] of parsed.searchParams.entries()) {
      sanitizedParams.set(key, '[REDACTED]');
    }

    parsed.search = sanitizedParams.toString();
    return parsed.toString();
  } catch {
    // If unparseable, return host or generic string
    return rawUrl.split('?')[0];
  }
}
