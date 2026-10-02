import { Router } from 'express';
import { z } from 'zod';
import { ReportCategory, ReportStatus } from '@prisma/client';
import { prisma } from '../db/client.js';

export const reportsRouter = Router();

const CreateReportSchema = z.object({
  scanId: z.string().uuid().optional(),
  category: z.nativeEnum(ReportCategory),
  note: z.string().max(1000).optional(),
});

/**
 * POST /api/v1/reports
 * Submit a community or user threat report
 */
reportsRouter.post('/reports', async (req, res): Promise<void> => {
  const parseResult = CreateReportSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const { scanId, category, note } = parseResult.data;

  // If scanId was provided, verify it exists
  if (scanId) {
    const scan = await prisma.scan.findUnique({ where: { id: scanId } });
    if (!scan) {
      res.status(404).json({ error: 'Referenced scan not found' });
      return;
    }
  }

  const report = await prisma.report.create({
    data: {
      scanId,
      category,
      note,
      status: ReportStatus.PENDING,
    },
  });

  res.status(201).json({
    message: 'Report submitted successfully for admin review.',
    reportId: report.id,
    status: report.status,
    createdAt: report.createdAt.toISOString(),
  });
});
