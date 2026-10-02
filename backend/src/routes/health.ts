import { Router } from 'express';
import { prisma } from '../db/client.js';

export const healthRouter = Router();

healthRouter.get('/health', async (_req, res) => {
  try {
    // Quick DB connectivity check
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      status: 'ok',
      service: 'phishlens-backend',
      timestamp: new Date().toISOString(),
      database: 'connected',
    });
  } catch (err: unknown) {
    res.status(503).json({
      status: 'degraded',
      service: 'phishlens-backend',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: (err as Error).message,
    });
  }
});
