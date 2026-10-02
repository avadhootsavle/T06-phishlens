import { Router } from 'express';
import { z } from 'zod';
import { ReportStatus } from '@prisma/client';
import { prisma } from '../db/client.js';

export const adminRouter = Router();

const UpdateReportSchema = z.object({
  status: z.nativeEnum(ReportStatus),
});

/**
 * GET /api/v1/admin/reports
 * Fetch reports for review with optional status filtering
 */
adminRouter.get('/admin/reports', async (req, res): Promise<void> => {
  const statusQuery = req.query.status as string | undefined;

  const whereClause: { status?: ReportStatus } = {};
  if (statusQuery && Object.values(ReportStatus).includes(statusQuery as ReportStatus)) {
    whereClause.status = statusQuery as ReportStatus;
  }

  const reports = await prisma.report.findMany({
    where: whereClause,
    include: {
      scan: {
        select: {
          id: true,
          inputType: true,
          verdict: true,
          riskScore: true,
          explanation: true,
          hostname: true,
          finalHostname: true,
          createdAt: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const counts = await prisma.report.groupBy({
    by: ['status'],
    _count: true,
  });

  const countSummary = counts.reduce(
    (acc, curr) => {
      acc[curr.status] = curr._count;
      return acc;
    },
    {} as Record<string, number>
  );

  res.json({
    reports,
    summary: {
      total: reports.length,
      counts: countSummary,
    },
  });
});

/**
 * PATCH /api/v1/admin/reports/:id
 * Triage and update status of a report
 */
adminRouter.patch('/admin/reports/:id', async (req, res): Promise<void> => {
  const { id } = req.params;
  const parseResult = UpdateReportSchema.safeParse(req.body);

  if (!parseResult.success) {
    res.status(400).json({ error: parseResult.error.errors[0].message });
    return;
  }

  const existingReport = await prisma.report.findUnique({ where: { id } });
  if (!existingReport) {
    res.status(404).json({ error: 'Report not found' });
    return;
  }

  const updated = await prisma.report.update({
    where: { id },
    data: { status: parseResult.data.status },
  });

  res.json({
    message: `Report status updated to ${updated.status}`,
    report: updated,
  });
});
