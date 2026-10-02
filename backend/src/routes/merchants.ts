import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import crypto from 'crypto';
import { prisma } from '../db/client.js';
import { adminAuth } from '../security/adminAuth.js';
import {
  signMerchantToken,
  generateStickerPng,
  getPublicJwks,
  verifyQrPayload,
} from '../services/merchantQrService.js';
import { MerchantStatus } from '@prisma/client';

export const merchantsRouter = Router();

// Zod Validation Schemas
const CreateMerchantSchema = z.object({
  shopName: z
    .string()
    .min(2, 'Shop name must be between 2 and 60 characters')
    .max(60, 'Shop name must be between 2 and 60 characters')
    .trim(),
  vpa: z
    .string()
    .min(3, 'VPA must be at least 3 characters')
    .max(100, 'VPA cannot exceed 100 characters')
    .regex(/^[\w.-]+@[\w.-]+$/, 'Invalid UPI VPA format. Expected name@bank or name@upi')
    .trim()
    .toLowerCase(),
  city: z.string().max(60).optional(),
});

const VerifyQrSchema = z.object({
  content: z.string().min(1, 'QR content is required').trim(),
  expectedShopName: z.string().max(100).optional(),
});

const MerchantIdParamSchema = z.object({
  id: z.string().uuid('Invalid merchant ID format'),
});

// Dedicated Rate Limiter for QR Verification
const verifyQrLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Verification rate limit exceeded. Please wait a moment.' },
});

/**
 * GET /.well-known/phishlens-keys or /api/.well-known/phishlens-keys
 * Public cryptographic key discovery endpoint (Ed25519 JWKS)
 */
merchantsRouter.get(['/.well-known/phishlens-keys', '/.well-known/jwks.json'], (_req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  res.json(getPublicJwks());
});

/**
 * POST /api/merchants or /api/v1/merchants
 * Admin-protected: Register a shopkeeper and issue an Ed25519-signed merchant token
 */
merchantsRouter.post('/merchants', adminAuth, async (req, res): Promise<void> => {
  const parseResult = CreateMerchantSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const { shopName, vpa, city } = parseResult.data;

  // Check if VPA is already registered to another active merchant
  const existing = await prisma.merchant.findUnique({
    where: { vpa },
  });

  if (existing && existing.status === MerchantStatus.ACTIVE) {
    res.status(409).json({
      error: `VPA '${vpa}' is already registered to active merchant '${existing.shopName}'.`,
    });
    return;
  }

  // Create or reactivate merchant
  let merchant;
  if (existing) {
    merchant = await prisma.merchant.update({
      where: { id: existing.id },
      data: {
        shopName,
        city: city || existing.city,
        status: MerchantStatus.ACTIVE,
        revokedAt: null,
        name: shopName,
        normalizedName: shopName.toLowerCase(),
        verified: true,
      },
    });
  } else {
    merchant = await prisma.merchant.create({
      data: {
        shopName,
        vpa,
        city,
        status: MerchantStatus.ACTIVE,
        name: shopName,
        normalizedName: shopName.toLowerCase(),
        verified: true,
      },
    });
  }

  // Generate cryptographically signed token
  const { token, payload, url } = signMerchantToken({
    id: merchant.id,
    shopName: merchant.shopName,
    vpa: merchant.vpa,
  });

  res.status(201).json({
    message: `Merchant '${merchant.shopName}' successfully registered and signed.`,
    merchant: {
      id: merchant.id,
      shopName: merchant.shopName,
      vpa: merchant.vpa,
      city: merchant.city,
      status: merchant.status,
      createdAt: merchant.createdAt.toISOString(),
    },
    token,
    payload,
    stickerUrl: `/api/v1/merchants/${merchant.id}/sticker.png`,
    qrEncodedUrl: url,
  });
});

/**
 * GET /api/merchants or /api/v1/merchants
 * Admin-protected: List all registered merchants
 */
merchantsRouter.get('/merchants', adminAuth, async (_req, res): Promise<void> => {
  const merchants = await prisma.merchant.findMany({
    orderBy: { createdAt: 'desc' },
  });

  res.json({
    merchants: merchants.map((m) => ({
      id: m.id,
      shopName: m.shopName || m.name || 'Unnamed Merchant',
      vpa: m.vpa,
      city: m.city,
      status: m.status,
      createdAt: m.createdAt.toISOString(),
      revokedAt: m.revokedAt ? m.revokedAt.toISOString() : null,
      stickerUrl: `/api/v1/merchants/${m.id}/sticker.png`,
    })),
  });
});

/**
 * GET /api/merchants/:id/sticker.png or /api/v1/merchants/:id/sticker.png
 * Admin-protected: Generates and serves a high-resolution printable PNG sticker
 */
merchantsRouter.get('/merchants/:id/sticker.png', adminAuth, async (req, res): Promise<void> => {
  const parseResult = MerchantIdParamSchema.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const { id } = parseResult.data;
  const merchant = await prisma.merchant.findUnique({ where: { id } });

  if (!merchant) {
    res.status(404).json({ error: 'Merchant not found' });
    return;
  }

  if (merchant.status === MerchantStatus.REVOKED) {
    res.status(400).json({ error: 'Cannot generate sticker for a revoked merchant.' });
    return;
  }

  // Generate signed token for this merchant
  const { token } = signMerchantToken({
    id: merchant.id,
    shopName: merchant.shopName,
    vpa: merchant.vpa,
  });

  const pngBuffer = await generateStickerPng(
    {
      id: merchant.id,
      shopName: merchant.shopName,
      vpa: merchant.vpa,
      city: merchant.city,
    },
    token
  );

  const safeFilename = merchant.shopName.replace(/[^a-zA-Z0-9_-]/g, '_');

  res.setHeader('Content-Type', 'image/png');
  res.setHeader('Content-Disposition', `inline; filename="phishlens_${safeFilename}_sticker.png"`);
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.send(pngBuffer);
});

/**
 * POST /api/merchants/:id/revoke or /api/v1/merchants/:id/revoke
 * Admin-protected: Revoke a merchant's verification status
 */
merchantsRouter.post('/merchants/:id/revoke', adminAuth, async (req, res): Promise<void> => {
  const parseResult = MerchantIdParamSchema.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const { id } = parseResult.data;
  const merchant = await prisma.merchant.findUnique({ where: { id } });

  if (!merchant) {
    res.status(404).json({ error: 'Merchant not found' });
    return;
  }

  const updated = await prisma.merchant.update({
    where: { id },
    data: {
      status: MerchantStatus.REVOKED,
      revokedAt: new Date(),
    },
  });

  res.json({
    message: `Merchant '${updated.shopName}' verification has been revoked.`,
    merchant: {
      id: updated.id,
      shopName: updated.shopName,
      vpa: updated.vpa,
      status: updated.status,
      revokedAt: updated.revokedAt?.toISOString(),
    },
  });
});

/**
 * POST /api/verify-qr or /api/v1/verify-qr
 * Primary QR Verification Endpoint: Verifies signed tokens & UPI VPA registry
 */
merchantsRouter.post('/verify-qr', verifyQrLimiter, async (req, res): Promise<void> => {
  const parseResult = VerifyQrSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const { content, expectedShopName } = parseResult.data;

  // Privacy-safe logging: log only a cryptographic SHA-256 hash of payload, never full token
  const contentHash = crypto.createHash('sha256').update(content).digest('hex').substring(0, 16);

  const result = await verifyQrPayload({
    content,
    expectedShopName,
  });

  res.json({
    ...result,
    payloadHash: `hash_${contentHash}`,
    timestamp: new Date().toISOString(),
  });
});

/**
 * GET /api/v1/merchants/search
 * Backward compatibility: Search verified merchants by name or VPA
 */
merchantsRouter.get('/merchants/search', async (req, res): Promise<void> => {
  const query = (req.query.q as string | undefined)?.trim();

  if (!query || query.length < 2) {
    res.json({ merchants: [] });
    return;
  }

  const normalizedQuery = query.toLowerCase();

  const merchants = await prisma.merchant.findMany({
    where: {
      OR: [
        { shopName: { contains: query, mode: 'insensitive' } },
        { vpa: { contains: normalizedQuery } },
        { normalizedName: { contains: normalizedQuery } },
      ],
    },
    take: 10,
  });

  res.json({
    merchants: merchants.map((m) => ({
      id: m.id,
      name: m.shopName || m.name,
      verified: m.status === MerchantStatus.ACTIVE,
      category: m.category,
      vpa: m.vpa,
    })),
  });
});
