import { Router } from 'express';
import { z } from 'zod';
import { ReportCategory, ReportStatus } from '@prisma/client';
import { prisma } from '../db/client.js';

export const reportsRouter = Router();

const CreateReportSchema = z.object({
  scanId: z.string().uuid().optional(),
  url: z.string().min(1).optional(),
  category: z.nativeEnum(ReportCategory),
  note: z.string().max(1000).optional(),
});

/**
 * POST /api/v1/reports
 * Submit a community or user threat report for a website or payment
 */
reportsRouter.post('/reports', async (req, res): Promise<void> => {
  const parseResult = CreateReportSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const { scanId, url, category, note } = parseResult.data;
  let linkedScanId = scanId;

  // 1. If URL is provided and no scanId exists, associate or create a scan record
  if (url) {
    try {
      const normalizedUrlString = url.startsWith('http://') || url.startsWith('https://')
        ? url
        : `https://${url}`;
      const parsedUrl = new URL(normalizedUrlString);
      const hostname = parsedUrl.hostname;

      if (!linkedScanId) {
        const existingScan = await prisma.scan.findFirst({
          where: { hostname },
          orderBy: { createdAt: 'desc' },
        });

        if (existingScan) {
          linkedScanId = existingScan.id;
        } else {
          const newScan = await prisma.scan.create({
            data: {
              inputType: 'URL',
              verdict: 'CAUTION',
              riskScore: 35,
              explanation: 'Community reported website queued for admin investigation.',
              hostname,
              finalHostname: hostname,
              url: parsedUrl.toString(),
            },
          });
          linkedScanId = newScan.id;
        }
      }
    } catch {
      // Continue if URL string parsing encounters irregular format
    }
  }

  // 2. If scanId was provided, verify it exists
  if (linkedScanId) {
    const scan = await prisma.scan.findUnique({ where: { id: linkedScanId } });
    if (!scan) {
      // If scanId was invalid, reset to null rather than failing entire report
      linkedScanId = undefined;
    }
  }

  const formattedNote = url && (!note || !note.includes(url))
    ? `Target Website: ${url}${note ? `\n\nObservation: ${note}` : ''}`
    : note;

  const report = await prisma.report.create({
    data: {
      scanId: linkedScanId,
      category,
      note: formattedNote,
      status: ReportStatus.PENDING,
    },
    include: {
      scan: true,
    },
  });

  res.status(201).json({
    message: 'Report submitted successfully for admin review.',
    reportId: report.id,
    scanId: report.scanId,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
  });
});
