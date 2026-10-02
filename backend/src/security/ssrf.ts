import dns from 'dns/promises';
import { isIP } from 'net';

export class SSRFError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SSRFError';
  }
}

/**
 * Checks if an IPv4 address is in a private, loopback, or reserved range.
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => parseInt(p, 10));
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true; // malformed, treat as unsafe
  }

  const [a, b] = parts;

  // 0.0.0.0/8 (Current network)
  if (a === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;

  // 10.0.0.0/8 (Private)
  if (a === 10) return true;

  // 172.16.0.0/12 (Private: 172.16.0.0 - 172.31.255.255)
  if (a === 172 && b >= 16 && b <= 31) return true;

  // 192.168.0.0/16 (Private)
  if (a === 192 && b === 168) return true;

  // 169.254.0.0/16 (Link-local & Cloud Metadata)
  if (a === 169 && b === 254) return true;

  // 100.64.0.0/10 (Carrier-grade NAT)
  if (a === 100 && b >= 64 && b <= 127) return true;

  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved)
  if (a >= 224) return true;

  return false;
}

/**
 * Checks if an IPv6 address is in a loopback, unique local, or link-local range.
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();
  if (normalized === '::1' || normalized === '::') return true;

  // Unique local address fc00::/7 (fc00:: - fdff::)
  if (normalized.startsWith('fc') || normalized.startsWith('fd')) return true;

  // Link-local address fe80::/10 (fe80:: - febf::)
  if (
    normalized.startsWith('fe8') ||
    normalized.startsWith('fe9') ||
    normalized.startsWith('fea') ||
    normalized.startsWith('feb')
  ) {
    return true;
  }

  return false;
}

/**
 * Validates a URL against SSRF threats.
 * Throws SSRFError if the URL points to a forbidden protocol, host, or private IP.
 */
export async function validateSSRF(urlString: string): Promise<{ url: URL; resolvedIp?: string }> {
  let parsed: URL;
  try {
    parsed = new URL(urlString);
  } catch {
    throw new SSRFError('Invalid URL format');
  }

  // Enforce protocol restriction: only http and https
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SSRFError(`Protocol '${parsed.protocol}' is forbidden. Only HTTP/HTTPS allowed.`);
  }

  const hostname = parsed.hostname.toLowerCase();

  // Check for localhost or cloud metadata hostnames directly
  if (
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname === 'metadata.google.internal' ||
    hostname === 'instance-data'
  ) {
    throw new SSRFError(`Host '${hostname}' is a forbidden internal destination.`);
  }

  // Check if hostname is already a raw IP
  const ipFamily = isIP(hostname);
  if (ipFamily === 4) {
    if (isPrivateIPv4(hostname)) {
      throw new SSRFError(`IP address '${hostname}' is private or reserved.`);
    }
    return { url: parsed, resolvedIp: hostname };
  } else if (ipFamily === 6) {
    if (isPrivateIPv6(hostname)) {
      throw new SSRFError(`IPv6 address '${hostname}' is private or reserved.`);
    }
    return { url: parsed, resolvedIp: hostname };
  }

  // If domain name, resolve DNS to prevent DNS rebinding or internal IP mapping
  try {
    const lookupResult = await dns.lookup(hostname, { all: true });
    if (!lookupResult || lookupResult.length === 0) {
      return { url: parsed, resolvedIp: undefined };
    }

    for (const record of lookupResult) {
      if (record.family === 4 && isPrivateIPv4(record.address)) {
        throw new SSRFError(`Domain resolves to private IPv4 '${record.address}'.`);
      }
      if (record.family === 6 && isPrivateIPv6(record.address)) {
        throw new SSRFError(`Domain resolves to private IPv6 '${record.address}'.`);
      }
    }

    return { url: parsed, resolvedIp: lookupResult[0].address };
  } catch (err: unknown) {
    if (err instanceof SSRFError) throw err;
    const errorCode = (err as { code?: string }).code;
    if (errorCode === 'ENOTFOUND' || errorCode === 'EAI_AGAIN') {
      // Domain does not resolve in public DNS; safe from internal SSRF, proceed to heuristics
      return { url: parsed, resolvedIp: undefined };
    }
    throw new SSRFError(`DNS validation error for '${hostname}': ${(err as Error).message}`);
  }
}
