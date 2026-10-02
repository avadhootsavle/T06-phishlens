import { parse } from 'tldts';
import { isIP } from 'net';

export interface URLHeuristicsResult {
  isIpAddress: boolean;
  domain: string | null;
  subdomain: string | null;
  publicSuffix: string | null;
  excessiveSubdomains: boolean;
  excessiveLength: boolean;
  urlLength: number;
  suspiciousKeywordsFound: string[];
  hasAtSymbol: boolean;
  hasSuspiciousEncoding: boolean;
}

const SUSPICIOUS_KEYWORDS = [
  'login',
  'verify',
  'secure',
  'kyc',
  'update',
  'refund',
  'account',
  'wallet',
  'claim',
  'banking',
  'netbanking',
  'password',
  'support',
  'billing',
  'signin',
  'auth',
];

export function analyzeUrlHeuristics(urlString: string): URLHeuristicsResult {
  const parsedUrl = new URL(urlString);
  const hostname = parsedUrl.hostname.toLowerCase();
  const urlLength = urlString.length;

  const isIp = isIP(hostname) !== 0;
  const tldInfo = parse(hostname);

  const subdomains = tldInfo.subdomain ? tldInfo.subdomain.split('.') : [];
  const excessiveSubdomains = subdomains.length >= 3;
  const excessiveLength = urlLength > 85;

  const urlLower = urlString.toLowerCase();
  const suspiciousKeywordsFound: string[] = [];
  for (const kw of SUSPICIOUS_KEYWORDS) {
    if (urlLower.includes(kw)) {
      suspiciousKeywordsFound.push(kw);
    }
  }

  const hasAtSymbol = parsedUrl.username !== '' || urlString.includes('@');
  const percentMatches = urlString.match(/%[0-9a-fA-F]{2}/g);
  const hasSuspiciousEncoding = percentMatches !== null && percentMatches.length > 3;

  return {
    isIpAddress: isIp,
    domain: tldInfo.domain || null,
    subdomain: tldInfo.subdomain || null,
    publicSuffix: tldInfo.publicSuffix || null,
    excessiveSubdomains,
    excessiveLength,
    urlLength,
    suspiciousKeywordsFound,
    hasAtSymbol,
    hasSuspiciousEncoding,
  };
}
