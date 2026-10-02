import { Router } from 'express';
import { z } from 'zod';
import fs from 'fs/promises';
import rateLimit from 'express-rate-limit';
import {
  getPreviewJob,
  getPreviewImagePath,
  getBrandRefImagePath,
} from '../services/previewService.js';

export const previewRouter = Router();

// Zod Param Validation Schemas
const JobIdParamSchema = z.object({
  jobId: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid job ID format'),
});

const BrandKeyParamSchema = z.object({
  brandKey: z
    .string()
    .min(1)
    .max(32)
    .regex(/^[a-zA-Z0-9_-]+$/, 'Invalid brand key format'),
});

// Dedicated Rate Limiter for Preview Polling
const previewLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 120, // 120 requests per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Preview rate limit exceeded. Please wait.' },
});

previewRouter.use(previewLimiter);

/**
 * GET /api/preview/:jobId or /api/v1/preview/:jobId
 * Returns preview status (pending | ready | failed), image URLs and visual match data.
 */
previewRouter.get('/preview/:jobId', (req, res): void => {
  const parseResult = JobIdParamSchema.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const { jobId } = parseResult.data;
  const job = getPreviewJob(jobId);

  if (!job) {
    res.status(404).json({
      error: 'Preview job not found or expired',
      jobId,
      status: 'failed',
    });
    return;
  }

  res.json({
    jobId: job.jobId,
    scanId: job.scanId,
    status: job.status,
    error: job.error,
    imageUrl: job.status === 'ready' ? `/api/v1/preview/${job.jobId}/image` : undefined,
    brandRefImageUrl: job.brandRefImageUrl,
    visualImpersonation: job.visualImpersonation,
    brand: job.matchedBrand,
    similarity: job.similarity,
    officialDomain: job.officialDomain,
    riskBoost: job.riskBoost || 0,
    explanation: job.explanation,
    createdAt: new Date(job.createdAt).toISOString(),
  });
});

/**
 * GET /api/preview/:jobId/image or /api/v1/preview/:jobId/image
 * Serves the sandboxed WebP screenshot.
 * Strict Security Headers:
 * Content-Security-Policy: sandbox
 * X-Content-Type-Options: nosniff
 */
previewRouter.get('/preview/:jobId/image', async (req, res): Promise<void> => {
  const parseResult = JobIdParamSchema.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const { jobId } = parseResult.data;
  const job = getPreviewJob(jobId);

  if (!job || job.status !== 'ready') {
    res.status(404).json({ error: 'Screenshot not available or preview not ready' });
    return;
  }

  const filePath = getPreviewImagePath(jobId);
  try {
    await fs.access(filePath);
  } catch {
    res.status(404).json({ error: 'Screenshot file not found on server' });
    return;
  }

  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Content-Security-Policy', 'sandbox');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=600');

  res.sendFile(filePath);
});

/**
 * GET /api/preview/brand-ref/:brandKey or /api/v1/preview/brand-ref/:brandKey
 * Serves the official brand reference screenshot for side-by-side comparison.
 */
previewRouter.get('/preview/brand-ref/:brandKey', async (req, res): Promise<void> => {
  const parseResult = BrandKeyParamSchema.safeParse(req.params);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const { brandKey } = parseResult.data;
  const filePath = getBrandRefImagePath(brandKey);

  try {
    await fs.access(filePath);
  } catch {
    res.status(404).json({ error: `Brand reference screenshot for '${brandKey}' not found` });
    return;
  }

  res.setHeader('Content-Type', 'image/webp');
  res.setHeader('Content-Security-Policy', 'sandbox');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Cache-Control', 'public, max-age=86400');

  res.sendFile(filePath);
});
