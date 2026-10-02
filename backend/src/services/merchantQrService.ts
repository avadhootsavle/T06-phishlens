import crypto from 'crypto';
import QRCode from 'qrcode';
import sharp from 'sharp';
import { prisma } from '../db/client.js';
import { parseUPIString } from '../pipeline/upiParser.js';

export interface MerchantTokenPayload {
  v: 1;
  kid: string;
  merchantId: string;
  vpa: string;
  shopName: string;
  issuedAt: number;
  expiresAt: number;
}

export type VerificationStatus =
  | 'VERIFIED'
  | 'VERIFIED_REGISTRY'
  | 'TAMPERED'
  | 'MISMATCH'
  | 'EXPIRED'
  | 'REVOKED'
  | 'UNVERIFIED';

export interface VerifyQrResult {
  status: VerificationStatus;
  isToken: boolean;
  shopName?: string;
  vpa?: string;
  city?: string | null;
  expectedShopName?: string;
  registeredShopName?: string;
  message: string;
  merchantId?: string;
  tokenPayload?: Partial<MerchantTokenPayload>;
  upiUri?: string;
}

// In-memory key cache
let cachedPrivateKey: crypto.KeyObject | null = null;
let cachedPublicKey: crypto.KeyObject | null = null;
let cachedKid: string | null = null;

export function getSigningKid(): string {
  return process.env.PHISHLENS_SIGNING_KID || 'phishlens-ed25519-v1';
}

export function getPublicBaseUrl(): string {
  return (process.env.PUBLIC_BASE_URL || 'http://localhost:3000').replace(/\/+$/, '');
}

/**
 * Loads or initializes the Ed25519 private key from environment.
 */
export function getPrivateKey(): { privateKey: crypto.KeyObject; kid: string } {
  const kid = getSigningKid();

  if (cachedPrivateKey && cachedKid === kid) {
    return { privateKey: cachedPrivateKey, kid };
  }

  const rawEnvKey = process.env.PHISHLENS_SIGNING_PRIVATE_KEY;
  if (rawEnvKey && rawEnvKey.trim().length > 0) {
    try {
      // Unescape any literal \n characters from .env
      const pem = rawEnvKey.replace(/\\n/g, '\n').trim();
      const privateKey = crypto.createPrivateKey(pem);
      cachedPrivateKey = privateKey;
      cachedPublicKey = crypto.createPublicKey(privateKey);
      cachedKid = kid;
      return { privateKey, kid };
    } catch (err) {
      console.warn('Failed to parse PHISHLENS_SIGNING_PRIVATE_KEY, generating ephemeral key:', (err as Error).message);
    }
  }

  // Fallback: Generate ephemeral key for testing/dev if none provided
  const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
  cachedPrivateKey = privateKey;
  cachedPublicKey = publicKey;
  cachedKid = kid;
  return { privateKey, kid };
}

export function getPublicKey(): { publicKey: crypto.KeyObject; kid: string } {
  const { kid } = getPrivateKey();
  return { publicKey: cachedPublicKey!, kid };
}

/**
 * Returns JWKS representation for public key discovery at GET /api/.well-known/phishlens-keys
 */
export function getPublicJwks() {
  const { publicKey, kid } = getPublicKey();
  const jwk = publicKey.export({ format: 'jwk' });
  const spkiPem = publicKey.export({ type: 'spki', format: 'pem' }) as string;

  return {
    keys: [
      {
        ...jwk,
        kid,
        use: 'sig',
        alg: 'EdDSA',
        publicKeyPem: spkiPem,
      },
    ],
  };
}

/**
 * Canonical JSON serializer with sorted keys (RFC 8785 subset)
 */
export function canonicalJson(obj: Record<string, unknown>): string {
  const sortedKeys = Object.keys(obj).sort();
  const sortedObj: Record<string, unknown> = {};
  for (const k of sortedKeys) {
    sortedObj[k] = obj[k];
  }
  return JSON.stringify(sortedObj);
}

/**
 * Creates a cryptographically signed Merchant Token.
 * Token format: base64url(canonicalPayload) + "." + base64url(signature)
 */
export function signMerchantToken(
  merchant: { id: string; shopName: string; vpa: string },
  options?: { expiresInSeconds?: number; kid?: string }
): { token: string; payload: MerchantTokenPayload; url: string } {
  const { privateKey, kid: defaultKid } = getPrivateKey();
  const kid = options?.kid || defaultKid;

  const now = Math.floor(Date.now() / 1000);
  const expiresIn = options?.expiresInSeconds || 365 * 24 * 60 * 60; // 1 year default

  const payload: MerchantTokenPayload = {
    v: 1,
    kid,
    merchantId: merchant.id,
    vpa: merchant.vpa.toLowerCase().trim(),
    shopName: merchant.shopName.trim(),
    issuedAt: now,
    expiresAt: now + expiresIn,
  };

  const canonical = canonicalJson({
    expiresAt: payload.expiresAt,
    issuedAt: payload.issuedAt,
    kid: payload.kid,
    merchantId: payload.merchantId,
    shopName: payload.shopName,
    v: payload.v,
    vpa: payload.vpa,
  });

  const payloadBase64 = Buffer.from(canonical, 'utf-8').toString('base64url');
  const signature = crypto.sign(null, Buffer.from(canonical, 'utf-8'), privateKey);
  const signatureBase64 = signature.toString('base64url');

  const token = `${payloadBase64}.${signatureBase64}`;
  const url = `${getPublicBaseUrl()}/m/${token}`;

  return { token, payload, url };
}

/**
 * Extracts a PhishLens token from a URL string or returns the raw token if already provided.
 */
export function extractTokenFromContent(content: string): string | null {
  if (!content) return null;
  const trimmed = content.trim();

  // Pattern 1: URL with /m/<token>
  const urlMatch = trimmed.match(/\/m\/([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)/);
  if (urlMatch) {
    return urlMatch[1];
  }

  // Pattern 2: Raw token: base64url.base64url
  if (/^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(trimmed)) {
    return trimmed;
  }

  return null;
}

/**
 * Cryptographically verifies a Merchant Token and checks revocation list.
 */
export async function verifyMerchantToken(token: string): Promise<{
  status: 'VERIFIED' | 'TAMPERED' | 'EXPIRED' | 'REVOKED';
  payload?: MerchantTokenPayload;
  merchant?: { id: string; shopName: string; vpa: string; city: string | null; status: string };
  reason: string;
}> {
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { status: 'TAMPERED', reason: 'Invalid token structure. Expected two segments.' };
  }

  let payload: MerchantTokenPayload;
  try {
    const jsonStr = Buffer.from(parts[0], 'base64url').toString('utf-8');
    payload = JSON.parse(jsonStr);
  } catch {
    return { status: 'TAMPERED', reason: 'Corrupted token payload encoding.' };
  }

  // 1. Version check
  if (payload.v !== 1) {
    return { status: 'TAMPERED', reason: `Unsupported token version (${payload.v}). Expected version 1.` };
  }

  // 2. Key ID check
  const { publicKey, kid: currentKid } = getPublicKey();
  if (payload.kid !== currentKid) {
    return { status: 'TAMPERED', reason: `Unknown signing key id (${payload.kid}). Key may have been retired or forged.` };
  }

  // 3. Constant-time cryptographic signature verification
  const canonical = canonicalJson({
    expiresAt: payload.expiresAt,
    issuedAt: payload.issuedAt,
    kid: payload.kid,
    merchantId: payload.merchantId,
    shopName: payload.shopName,
    v: payload.v,
    vpa: payload.vpa,
  });

  const signatureBuf = Buffer.from(parts[1], 'base64url');
  let isSignatureValid = false;
  try {
    isSignatureValid = crypto.verify(null, Buffer.from(canonical, 'utf-8'), publicKey, signatureBuf);
  } catch {
    isSignatureValid = false;
  }

  if (!isSignatureValid) {
    return {
      status: 'TAMPERED',
      payload,
      reason: 'Cryptographic signature mismatch. QR sticker has been forged or altered.',
    };
  }

  // 4. Expiration check
  const now = Math.floor(Date.now() / 1000);
  if (payload.expiresAt && payload.expiresAt < now) {
    return {
      status: 'EXPIRED',
      payload,
      reason: `Verified merchant QR sticker expired on ${new Date(payload.expiresAt * 1000).toLocaleDateString()}.`,
    };
  }

  // 5. Database lookup & Revocation check
  const merchant = await prisma.merchant.findUnique({
    where: { id: payload.merchantId },
  });

  if (!merchant || merchant.status === 'REVOKED') {
    return {
      status: 'REVOKED',
      payload,
      reason: 'This merchant registration has been revoked by administration.',
    };
  }

  return {
    status: 'VERIFIED',
    payload,
    merchant: {
      id: merchant.id,
      shopName: merchant.shopName,
      vpa: merchant.vpa,
      city: merchant.city,
      status: merchant.status,
    },
    reason: `Cryptographically verified official sticker for ${merchant.shopName}.`,
  };
}

/**
 * Evaluates any scanned QR content (Signed Token, UPI URI, or plain text)
 * and verifies merchant identity against expected shop name.
 */
export async function verifyQrPayload(params: {
  content: string;
  expectedShopName?: string;
}): Promise<VerifyQrResult> {
  const { content, expectedShopName } = params;
  const cleanContent = content.trim();

  // 1. Check if content encodes a PhishLens Signed Token
  const token = extractTokenFromContent(cleanContent);
  if (token) {
    const tokenResult = await verifyMerchantToken(token);

    if (tokenResult.status === 'TAMPERED') {
      return {
        status: 'TAMPERED',
        isToken: true,
        message: 'This QR sticker claims to be a verified shop QR but its signature is fake. Someone may have pasted a fake sticker.',
        tokenPayload: tokenResult.payload,
      };
    }

    if (tokenResult.status === 'EXPIRED') {
      return {
        status: 'EXPIRED',
        isToken: true,
        shopName: tokenResult.payload?.shopName,
        vpa: tokenResult.payload?.vpa,
        message: tokenResult.reason,
        tokenPayload: tokenResult.payload,
      };
    }

    if (tokenResult.status === 'REVOKED') {
      return {
        status: 'REVOKED',
        isToken: true,
        shopName: tokenResult.payload?.shopName,
        vpa: tokenResult.payload?.vpa,
        message: 'This merchant registration has been revoked by administration.',
        tokenPayload: tokenResult.payload,
      };
    }

    // Token is cryptographically VERIFIED
    const shopName = tokenResult.merchant?.shopName || tokenResult.payload!.shopName;
    const vpa = tokenResult.merchant?.vpa || tokenResult.payload!.vpa;
    const city = tokenResult.merchant?.city;
    const merchantId = tokenResult.merchant?.id;
    const upiUri = `upi://pay?pa=${encodeURIComponent(vpa)}&pn=${encodeURIComponent(shopName)}&cu=INR`;

    // Check optional expected shop name for MISMATCH
    if (expectedShopName && expectedShopName.trim().length > 0) {
      const expNorm = expectedShopName.trim().toLowerCase();
      const actualNorm = shopName.toLowerCase();

      if (!actualNorm.includes(expNorm) && !expNorm.includes(actualNorm)) {
        return {
          status: 'MISMATCH',
          isToken: true,
          shopName,
          vpa,
          city,
          expectedShopName,
          registeredShopName: shopName,
          merchantId,
          upiUri,
          message: `QR recipient '${shopName}' does not match your expected shop name '${expectedShopName}'.`,
        };
      }
    }

    return {
      status: 'VERIFIED',
      isToken: true,
      shopName,
      vpa,
      city,
      merchantId,
      upiUri,
      message: `Verified by PhishLens: Official cryptographic sticker for '${shopName}' (${vpa}).`,
      tokenPayload: tokenResult.payload,
    };
  }

  // 2. Check if content is a standard upi://pay URI
  const upiParsed = parseUPIString(cleanContent);
  if (upiParsed.isUPI && upiParsed.upiId) {
    const vpa = upiParsed.upiId.toLowerCase().trim();

    // Look up VPA in Merchant table
    const merchant = await prisma.merchant.findUnique({
      where: { vpa },
    });

    if (merchant && merchant.status === 'ACTIVE') {
      const registeredShopName = merchant.shopName;

      // Check expected shop name mismatch
      if (expectedShopName && expectedShopName.trim().length > 0) {
        const expNorm = expectedShopName.trim().toLowerCase();
        const regNorm = registeredShopName.toLowerCase();
        const payeeNorm = (upiParsed.payeeName || '').toLowerCase();

        const matches = regNorm.includes(expNorm) || expNorm.includes(regNorm) || payeeNorm.includes(expNorm) || expNorm.includes(payeeNorm);

        if (!matches) {
          return {
            status: 'MISMATCH',
            isToken: false,
            shopName: registeredShopName,
            vpa: merchant.vpa,
            city: merchant.city,
            expectedShopName,
            registeredShopName,
            merchantId: merchant.id,
            upiUri: cleanContent,
            message: `QR recipient '${registeredShopName}' does not match your expected shop '${expectedShopName}'. Confirm with shopkeeper before paying.`,
          };
        }
      }

      return {
        status: 'VERIFIED_REGISTRY',
        isToken: false,
        shopName: registeredShopName,
        vpa: merchant.vpa,
        city: merchant.city,
        merchantId: merchant.id,
        upiUri: cleanContent,
        message: `Registered Merchant: Payment destination is registered to '${registeredShopName}'.`,
      };
    }

    // Unregistered standard UPI QR
    return {
      status: 'UNVERIFIED',
      isToken: false,
      shopName: upiParsed.payeeName || 'Individual / Unregistered Payee',
      vpa: upiParsed.upiId,
      upiUri: cleanContent,
      message: 'Not a registered merchant. Confirm recipient details directly before proceeding.',
    };
  }

  // 3. Fallback for non-UPI, non-token content
  return {
    status: 'UNVERIFIED',
    isToken: false,
    message: 'Content does not contain a verified merchant token or UPI payment payload.',
  };
}

/**
 * Generates a high-resolution, printable PNG sticker.
 * Requirements:
 * QR, shop name, text "Verified by PhishLens - scan with PhishLens to confirm", and the UPI ID.
 */
export async function generateStickerPng(
  merchant: { id: string; shopName: string; vpa: string; city?: string | null },
  token: string
): Promise<Buffer> {
  const stickerUrl = `${getPublicBaseUrl()}/m/${token}`;

  // Generate crisp 400x400 QR code
  const qrPngBuffer = await QRCode.toBuffer(stickerUrl, {
    width: 380,
    margin: 2,
    color: {
      dark: '#0f172a',
      light: '#ffffff',
    },
    errorCorrectionLevel: 'H',
  });

  const cityDisplay = merchant.city ? ` • ${merchant.city}` : '';
  const escapedShopName = escapeXml(merchant.shopName);
  const escapedVpa = escapeXml(merchant.vpa);

  // SVG Template for the printable sticker (600 x 820 px)
  const svgTemplate = `
    <svg width="600" height="820" xmlns="http://www.w3.org/2000/svg">
      <!-- Outer Card with Soft Shadow -->
      <rect width="600" height="820" rx="20" fill="#ffffff" stroke="#cbd5e1" stroke-width="2"/>

      <!-- Header Banner (Emerald Security Accent) -->
      <rect width="600" height="100" rx="20" fill="#047857"/>
      <rect y="70" width="600" height="30" fill="#047857"/>
      <circle cx="65" cy="50" r="22" fill="#ffffff" opacity="0.95"/>
      <path d="M65 37 L75 42 V50 C75 56 70 61 65 63 C60 61 55 56 55 50 V42 Z" fill="#047857"/>
      <text x="100" y="47" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="20" font-weight="800" fill="#ffffff" letter-spacing="1">VERIFIED MERCHANT QR</text>
      <text x="100" y="70" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="12" font-weight="600" fill="#d1fae5">PhishLens Cryptographic Trust Protocol • Ed25519 Signed</text>

      <!-- Shop Information -->
      <text x="300" y="145" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="26" font-weight="800" fill="#0f172a" text-anchor="middle">${escapedShopName}</text>
      <text x="300" y="175" font-family="ui-monospace, Courier, monospace" font-size="15" font-weight="600" fill="#0284c7" text-anchor="middle">${escapedVpa}${cityDisplay}</text>

      <!-- QR Frame Box -->
      <rect x="95" y="195" width="410" height="410" rx="14" fill="#ffffff" stroke="#e2e8f0" stroke-width="2"/>

      <!-- Instruction / Disclaimer Text (Required Specification) -->
      <text x="300" y="640" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="15" font-weight="800" fill="#0f172a" text-anchor="middle">Verified by PhishLens - scan with PhishLens to confirm</text>
      <text x="300" y="666" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="12" fill="#475569" text-anchor="middle">Do not pay if PhishLens reports sticker tampering or payee mismatch</text>
      <text x="300" y="686" font-family="ui-monospace, Courier, monospace" font-size="11" font-weight="600" fill="#059669" text-anchor="middle">UPI ID: ${escapedVpa}</text>

      <!-- Footer Security Guarantee -->
      <rect y="725" width="600" height="95" fill="#f8fafc" rx="20"/>
      <rect y="725" width="600" height="20" fill="#f8fafc"/>
      <line x1="0" y1="725" x2="600" y2="725" stroke="#e2e8f0" stroke-width="1.5"/>
      <text x="300" y="760" font-family="-apple-system, BlinkMacSystemFont, Arial, sans-serif" font-size="12" font-weight="700" fill="#334155" text-anchor="middle">Intent-Aware Anti-Phishing &amp; QR Defense</text>
      <text x="300" y="782" font-family="ui-monospace, Courier, monospace" font-size="10" fill="#94a3b8" text-anchor="middle">Proof of Concept Trust Layer • Not Affiliated with NPCI / Banks</text>
    </svg>
  `;

  return sharp(Buffer.from(svgTemplate))
    .composite([
      {
        input: qrPngBuffer,
        top: 210,
        left: 110,
      },
    ])
    .png({ quality: 95 })
    .toBuffer();
}

function escapeXml(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '&':
        return '&amp;';
      case '\'':
        return '&apos;';
      case '"':
        return '&quot;';
      default:
        return c;
    }
  });
}
