import { validateSSRF } from '../security/ssrf.js';

export interface RedirectHop {
  url: string;
  statusCode: number;
  hostname: string;
}

export interface RedirectResult {
  initialUrl: string;
  finalUrl: string;
  finalHostname: string;
  chain: RedirectHop[];
  redirectCount: number;
  crossDomainCount: number;
  isShortened: boolean;
  error?: string;
}

const KNOWN_SHORTENERS = new Set([
  'bit.ly',
  'tinyurl.com',
  't.co',
  'goo.gl',
  'ow.ly',
  'is.gd',
  'buff.ly',
  'cutt.ly',
  'tiny.cc',
  'rb.gy',
  'shorturl.at',
  'rebrand.ly',
  'bl.ink',
]);

const MAX_REDIRECTS = 5;
const REQUEST_TIMEOUT_MS = 2500;

export async function resolveRedirects(initialUrl: string): Promise<RedirectResult> {
  const chain: RedirectHop[] = [];
  let currentUrl = initialUrl;
  let crossDomainCount = 0;
  let isShortened = false;

  for (let hop = 0; hop < MAX_REDIRECTS; hop++) {
    // 1. Validate SSRF on current hop URL
    const { url: parsedUrl } = await validateSSRF(currentUrl);
    const currentHostname = parsedUrl.hostname.toLowerCase();

    if (KNOWN_SHORTENERS.has(currentHostname)) {
      isShortened = true;
    }

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      // Perform HEAD request first to minimize network transfer
      let response = await fetch(currentUrl, {
        method: 'HEAD',
        redirect: 'manual',
        headers: {
          'User-Agent': 'Mozilla/5.0 (PhishLens Security Scanner)',
          Accept: '*/*',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // If HEAD is not allowed (e.g. 405 Method Not Allowed), retry with GET
      if (response.status === 405) {
        const getController = new AbortController();
        const getTimeoutId = setTimeout(() => getController.abort(), REQUEST_TIMEOUT_MS);
        response = await fetch(currentUrl, {
          method: 'GET',
          redirect: 'manual',
          headers: {
            'User-Agent': 'Mozilla/5.0 (PhishLens Security Scanner)',
            Accept: '*/*',
          },
          signal: getController.signal,
        });
        clearTimeout(getTimeoutId);
      }

      chain.push({
        url: currentUrl,
        statusCode: response.status,
        hostname: currentHostname,
      });

      // Check if redirect status (301, 302, 303, 307, 308)
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const locationHeader = response.headers.get('location');
        if (!locationHeader) {
          break; // Redirect response without Location header, terminate chain
        }

        const nextUrl = new URL(locationHeader, currentUrl).toString();
        const nextHostname = new URL(nextUrl).hostname.toLowerCase();

        if (nextHostname !== currentHostname) {
          crossDomainCount++;
        }

        currentUrl = nextUrl;
      } else {
        // Not a redirect, arrived at destination
        break;
      }
    } catch (err: unknown) {
      // If network request failed during redirect trace, record error and break
      return {
        initialUrl,
        finalUrl: currentUrl,
        finalHostname: new URL(currentUrl).hostname.toLowerCase(),
        chain,
        redirectCount: chain.length > 0 ? chain.length - 1 : 0,
        crossDomainCount,
        isShortened,
        error: (err as Error).message,
      };
    }
  }

  const finalParsed = new URL(currentUrl);

  return {
    initialUrl,
    finalUrl: currentUrl,
    finalHostname: finalParsed.hostname.toLowerCase(),
    chain,
    redirectCount: chain.length > 0 ? chain.length - 1 : 0,
    crossDomainCount,
    isShortened,
  };
}
