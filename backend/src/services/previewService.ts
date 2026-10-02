import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { chromium, Browser, BrowserContext } from 'playwright';
import sharp from 'sharp';
import { validateSSRF, SSRFError } from '../security/ssrf.js';
import { prisma } from '../db/client.js';
import { calculateRisk } from '../engine/riskEngine.js';
import { SignalSeverity, Verdict } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface VisualImpersonationResult {
  brand: string;
  brandKey: string;
  similarity: number;
  officialDomain: string;
}

export interface PreviewJob {
  jobId: string;
  scanId?: string;
  url: string;
  finalHostname: string;
  status: 'pending' | 'ready' | 'failed';
  error?: string;
  imageUrl?: string;
  brandRefImageUrl?: string;
  visualImpersonation?: {
    brand: string;
    similarity: number;
    brandKey?: string;
  };
  matchedBrand?: string;
  similarity?: number;
  officialDomain?: string;
  riskBoost?: number;
  explanation?: string;
  createdAt: number;
}

export interface BrandReferenceManifestEntry {
  brand: string;
  brandKey: string;
  officialDomains: string[];
  loginUrl: string;
  file: string;
  dHash: string;
}

interface CachedDomainPreview {
  jobId: string;
  filePath: string;
  dHash: string;
  visualImpersonation?: {
    brand: string;
    similarity: number;
    brandKey?: string;
  };
  matchedBrand?: string;
  similarity?: number;
  officialDomain?: string;
  riskBoost?: number;
  explanation?: string;
  cachedAt: number;
}

// In-memory Job & Cache stores
const previewJobs = new Map<string, PreviewJob>();
const domainCache = new Map<string, CachedDomainPreview>();

// Preview directories
const PREVIEW_DIR = path.resolve(__dirname, '../../data/previews');
const BRAND_REFS_DIR = path.resolve(__dirname, '../../assets/brand-refs');
const MANIFEST_PATH = path.join(BRAND_REFS_DIR, 'manifest.json');

// TTL: 10 minutes in milliseconds
export const PREVIEW_TTL_MS = 10 * 60 * 1000;

// Shared Playwright Browser instance
let sharedBrowser: Browser | null = null;
let browserInitPromise: Promise<Browser> | null = null;

async function getBrowser(): Promise<Browser> {
  if (sharedBrowser && sharedBrowser.isConnected()) {
    return sharedBrowser;
  }
  if (!browserInitPromise) {
    browserInitPromise = (async () => {
      try {
        const browser = await chromium.launch({
          headless: true,
          args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
          ],
        });
        sharedBrowser = browser;
        return browser;
      } finally {
        browserInitPromise = null;
      }
    })();
  }
  return browserInitPromise;
}

// Concurrency Queue: Max 2 concurrent previews
class ConcurrencyQueue {
  private active = 0;
  private readonly maxConcurrent = 2;
  private readonly waiting: Array<() => void> = [];

  async acquire(): Promise<void> {
    if (this.active < this.maxConcurrent) {
      this.active++;
      return;
    }
    return new Promise<void>((resolve) => {
      this.waiting.push(() => {
        this.active++;
        resolve();
      });
    });
  }

  release(): void {
    this.active--;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift();
      if (next) next();
    }
  }
}

const previewQueue = new ConcurrencyQueue();

/**
 * Computes 64-bit difference hash (dHash) from an image buffer using sharp.
 */
export async function computeDHash(imageBuffer: Buffer): Promise<string> {
  const { data } = await sharp(imageBuffer)
    .resize(9, 8, { fit: 'fill' })
    .grayscale()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let hash = '';
  for (let row = 0; row < 8; row++) {
    for (let col = 0; col < 8; col++) {
      const left = data[row * 9 + col];
      const right = data[row * 9 + col + 1];
      hash += left > right ? '1' : '0';
    }
  }
  return hash;
}

/**
 * Computes Hamming distance between two binary hash strings.
 */
export function hammingDistance(hash1: string, hash2: string): number {
  if (hash1.length !== hash2.length) {
    throw new Error(`Hash lengths differ (${hash1.length} vs ${hash2.length})`);
  }
  let dist = 0;
  for (let i = 0; i < hash1.length; i++) {
    if (hash1[i] !== hash2[i]) dist++;
  }
  return dist;
}

/**
 * Calculates visual similarity percentage (0 - 100%).
 */
export function calculateSimilarity(hash1: string, hash2: string): number {
  const dist = hammingDistance(hash1, hash2);
  const similarity = Math.round(((64 - dist) / 64) * 100);
  return Math.max(0, Math.min(100, similarity));
}

/**
 * Loads brand reference manifest.
 */
export async function loadBrandManifest(): Promise<BrandReferenceManifestEntry[]> {
  try {
    const raw = await fs.readFile(MANIFEST_PATH, 'utf-8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/**
 * Compares a preview dHash against protected brand reference hashes.
 */
export async function matchVisualImpersonation(
  previewDHash: string,
  candidateHostname: string
): Promise<{
  visualImpersonation?: { brand: string; similarity: number; brandKey: string };
  bestBrand?: string;
  bestBrandKey?: string;
  bestSimilarity: number;
  officialDomain?: string;
}> {
  const manifest = await loadBrandManifest();
  if (manifest.length === 0) {
    return { bestSimilarity: 0 };
  }

  const normalizedCandidate = candidateHostname.toLowerCase();
  let bestMatch: BrandReferenceManifestEntry | null = null;
  let bestSim = 0;

  for (const entry of manifest) {
    if (!entry.dHash) continue;
    const sim = calculateSimilarity(previewDHash, entry.dHash);
    if (sim > bestSim) {
      bestSim = sim;
      bestMatch = entry;
    }
  }

  if (!bestMatch) {
    return { bestSimilarity: 0 };
  }

  // Check if candidate domain is an official domain for this brand
  const isOfficial = bestMatch.officialDomains.some((d) => {
    const norm = d.toLowerCase();
    return normalizedCandidate === norm || normalizedCandidate.endsWith('.' + norm);
  });

  // Cloned login page rule:
  // If similarity >= 80% AND domain is not an official domain -> VISUAL IMPERSONATION
  // A real bank page is NOT flagged!
  if (bestSim >= 80 && !isOfficial) {
    return {
      visualImpersonation: {
        brand: bestMatch.brand,
        similarity: bestSim,
        brandKey: bestMatch.brandKey,
      },
      bestBrand: bestMatch.brand,
      bestBrandKey: bestMatch.brandKey,
      bestSimilarity: bestSim,
      officialDomain: bestMatch.officialDomains[0],
    };
  }

  return {
    bestBrand: bestMatch.brand,
    bestBrandKey: bestMatch.brandKey,
    bestSimilarity: bestSim,
    officialDomain: bestMatch.officialDomains[0],
  };
}

/**
 * Creates and initiates an asynchronous preview job.
 * Non-blocking: returns job immediately.
 */
export function enqueuePreviewJob(params: {
  url: string;
  finalHostname: string;
  scanId?: string;
}): string {
  const { url, finalHostname, scanId } = params;
  const normalizedHost = finalHostname.toLowerCase();

  const jobId = `prev_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

  // Check domain cache (10-minute TTL)
  const cached = domainCache.get(normalizedHost);
  if (cached && Date.now() - cached.cachedAt < PREVIEW_TTL_MS) {
    const job: PreviewJob = {
      jobId,
      scanId,
      url,
      finalHostname,
      status: 'ready',
      imageUrl: `/api/v1/preview/${jobId}/image`,
      brandRefImageUrl: cached.visualImpersonation?.brandKey
        ? `/api/v1/preview/brand-ref/${cached.visualImpersonation.brandKey}`
        : undefined,
      visualImpersonation: cached.visualImpersonation,
      matchedBrand: cached.matchedBrand,
      similarity: cached.similarity,
      officialDomain: cached.officialDomain,
      riskBoost: cached.riskBoost,
      explanation: cached.explanation,
      createdAt: Date.now(),
    };
    previewJobs.set(jobId, job);

    // Also link the cached preview image file to this jobId
    const newFilePath = path.join(PREVIEW_DIR, `${jobId}.webp`);
    fs.copyFile(cached.filePath, newFilePath).catch(() => {});

    // If scanId provided, update scan in background
    if (scanId && cached.visualImpersonation) {
      applyVisualImpersonationScoreBoost(scanId, cached.visualImpersonation).catch(() => {});
    }

    return jobId;
  }

  // Register pending job
  const job: PreviewJob = {
    jobId,
    scanId,
    url,
    finalHostname,
    status: 'pending',
    createdAt: Date.now(),
  };
  previewJobs.set(jobId, job);

  // Trigger processing asynchronously in background (does not block caller)
  processPreviewJob(jobId, url, normalizedHost, scanId).catch((err) => {
    console.error(`Preview processing error for ${jobId}:`, err);
  });

  return jobId;
}

/**
 * Background worker executing Playwright sandboxed capture.
 */
async function processPreviewJob(
  jobId: string,
  targetUrl: string,
  finalHostname: string,
  scanId?: string
): Promise<void> {
  await previewQueue.acquire();

  let context: BrowserContext | null = null;
  const timeoutMs = 8000; // Hard 8s total limit

  try {
    // 1. Initial SSRF Pre-flight check
    try {
      await validateSSRF(targetUrl);
    } catch (err) {
      throw new Error(`SSRF blocked destination: ${(err as Error).message}`);
    }

    await fs.mkdir(PREVIEW_DIR, { recursive: true });

    // 2. Launch fresh isolated context per preview
    const browser = await getBrowser();
    context = await browser.newContext({
      viewport: { width: 1280, height: 800 },
      userAgent:
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 PhishLens-Preview/1.0',
      acceptDownloads: false,
      permissions: [], // Deny all permissions (camera, mic, geolocation, notifications)
      bypassCSP: false,
      ignoreHTTPSErrors: true,
    });

    const page = await context.newPage();

    // Dialogs auto-dismissed
    page.on('dialog', async (dialog) => {
      try {
        await dialog.dismiss();
      } catch {}
    });

    // Popups blocked
    page.on('popup', async (popup) => {
      try {
        await popup.close();
      } catch {}
    });

    // 3. Strict SSRF Route Guard for ALL requests (main frame, redirects, subresources)
    await page.route('**/*', async (route) => {
      const req = route.request();
      const reqUrl = req.url();
      const resourceType = req.resourceType();

      // Hard limits: abort media, video, websocket, heavy font streaming
      if (['media', 'websocket', 'eventsource', 'font'].includes(resourceType)) {
        return route.abort('blockedbyclient');
      }

      // Check scheme
      if (!reqUrl.startsWith('http://') && !reqUrl.startsWith('https://')) {
        return route.abort('blockedbyclient');
      }

      // Intercept and evaluate SSRF on EVERY outgoing request
      try {
        await validateSSRF(reqUrl);
        return route.continue();
      } catch {
        // Abort localhost, private ranges, link-local/metadata IPs
        return route.abort('blockedbyclient');
      }
    });

    // 4. Navigate with 8-second race timeout
    const navigationPromise = (async () => {
      await page.goto(targetUrl, {
        timeout: 7000,
        waitUntil: 'domcontentloaded',
      });
      // Brief delay for visual layout settling
      await page.waitForTimeout(600);
    })();

    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Navigation preview timed out after 8s')), timeoutMs)
    );

    await Promise.race([navigationPromise, timeoutPromise]);

    // 5. Capture screenshot buffer & process with sharp
    const rawPng = await page.screenshot({ type: 'png' });
    const webpBuffer = await sharp(rawPng)
      .resize(640, undefined, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 80 })
      .toBuffer();

    const filePath = path.join(PREVIEW_DIR, `${jobId}.webp`);
    await fs.writeFile(filePath, webpBuffer);

    // 6. Compute dHash and perform visual comparison against brand references
    const previewHash = await computeDHash(webpBuffer);
    const matchResult = await matchVisualImpersonation(previewHash, finalHostname);

    let riskBoost = 0;
    let plainExplanation: string | undefined;

    if (matchResult.visualImpersonation) {
      riskBoost = 35;
      plainExplanation = `This page looks ${matchResult.visualImpersonation.similarity}% like the ${matchResult.visualImpersonation.brand} login page but is not an official ${matchResult.visualImpersonation.brand} website.`;

      // Apply scoring update to database if scanId exists
      if (scanId) {
        await applyVisualImpersonationScoreBoost(scanId, matchResult.visualImpersonation);
      }
    }

    const job = previewJobs.get(jobId);
    if (job) {
      job.status = 'ready';
      job.imageUrl = `/api/v1/preview/${jobId}/image`;
      job.brandRefImageUrl = matchResult.bestBrandKey
        ? `/api/v1/preview/brand-ref/${matchResult.bestBrandKey}`
        : undefined;
      job.visualImpersonation = matchResult.visualImpersonation;
      job.matchedBrand = matchResult.bestBrand;
      job.similarity = matchResult.bestSimilarity;
      job.officialDomain = matchResult.officialDomain;
      job.riskBoost = riskBoost;
      job.explanation = plainExplanation;
    }

    // 7. Cache by final domain for 10 minutes
    domainCache.set(finalHostname, {
      jobId,
      filePath,
      dHash: previewHash,
      visualImpersonation: matchResult.visualImpersonation,
      matchedBrand: matchResult.bestBrand,
      similarity: matchResult.bestSimilarity,
      officialDomain: matchResult.officialDomain,
      riskBoost,
      explanation: plainExplanation,
      cachedAt: Date.now(),
    });
  } catch (err: unknown) {
    const job = previewJobs.get(jobId);
    if (job) {
      job.status = 'failed';
      job.error = (err as Error).message;
    }
  } finally {
    if (context) {
      await context.close().catch(() => {});
    }
    previewQueue.release();
  }
}

/**
 * Updates scan record in database with visual impersonation risk boost (+35)
 */
async function applyVisualImpersonationScoreBoost(
  scanId: string,
  visualImp: { brand: string; similarity: number }
): Promise<void> {
  try {
    const scan = await prisma.scan.findUnique({
      where: { id: scanId },
      include: { signals: true },
    });
    if (!scan) return;

    // Check if signal already exists
    const hasSignal = scan.signals.some((s) => s.code === 'VISUAL_IMPERSONATION_DETECTED');
    if (hasSignal) return;

    // Record new signal
    const newSignal = await prisma.scanSignal.create({
      data: {
        scanId,
        code: 'VISUAL_IMPERSONATION_DETECTED',
        severity: SignalSeverity.HIGH,
        scoreImpact: 35,
        metadata: {
          brand: visualImp.brand,
          similarity: visualImp.similarity,
        },
      },
    });

    const allSignals = [...scan.signals, newSignal].map((s) => ({
      code: s.code,
      severity: s.severity,
      scoreImpact: s.scoreImpact,
      metadata: s.metadata as Record<string, unknown> | undefined,
      message: `Visual Impersonation: Page layout matches ${visualImp.brand} by ${visualImp.similarity}%.`,
    }));

    const recalculated = calculateRisk(allSignals);

    await prisma.scan.update({
      where: { id: scanId },
      data: {
        riskScore: recalculated.riskScore,
        verdict: recalculated.verdict,
        explanation: `This page looks ${visualImp.similarity}% like the ${visualImp.brand} login page but is not an official ${visualImp.brand} website.`,
      },
    });
  } catch (err) {
    console.warn(`Failed to update scan ${scanId} with visual impersonation:`, err);
  }
}

/**
 * Retrieves preview job status and result.
 */
export function getPreviewJob(jobId: string): PreviewJob | undefined {
  return previewJobs.get(jobId);
}

/**
 * Resolves path to preview screenshot WebP.
 */
export function getPreviewImagePath(jobId: string): string {
  return path.join(PREVIEW_DIR, `${jobId}.webp`);
}

/**
 * Resolves path to brand reference WebP.
 */
export function getBrandRefImagePath(brandKey: string): string {
  return path.join(BRAND_REFS_DIR, `${brandKey}.webp`);
}

/**
 * 10-Minute TTL Cleanup routine.
 * Deletes old WebP screenshots and frees in-memory records.
 */
export async function cleanupExpiredPreviews(ttlMs: number = PREVIEW_TTL_MS): Promise<number> {
  const now = Date.now();
  let deletedFiles = 0;

  // 1. Clean in-memory jobs
  for (const [id, job] of previewJobs.entries()) {
    if (now - job.createdAt > ttlMs) {
      previewJobs.delete(id);
    }
  }

  // 2. Clean domain cache
  for (const [host, entry] of domainCache.entries()) {
    if (now - entry.cachedAt > ttlMs) {
      domainCache.delete(host);
    }
  }

  // 3. Clean files from preview temp folder
  try {
    const files = await fs.readdir(PREVIEW_DIR);
    for (const file of files) {
      if (!file.endsWith('.webp')) continue;
      const filePath = path.join(PREVIEW_DIR, file);
      try {
        const stats = await fs.stat(filePath);
        if (now - stats.mtimeMs > ttlMs) {
          await fs.unlink(filePath);
          deletedFiles++;
        }
      } catch {}
    }
  } catch {}

  return deletedFiles;
}

// Periodic TTL cleanup job every 60 seconds
setInterval(() => {
  cleanupExpiredPreviews().catch(() => {});
}, 60 * 1000).unref();
