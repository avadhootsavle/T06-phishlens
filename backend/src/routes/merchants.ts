import { Router } from 'express';
import { prisma } from '../db/client.js';

export const merchantsRouter = Router();

/**
 * GET /api/v1/merchants/search
 * Search verified merchants by name or VPA
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
        { normalizedName: { contains: normalizedQuery } },
        { name: { contains: query, mode: 'insensitive' } },
        {
          identifiers: {
            some: {
              value: { contains: normalizedQuery },
            },
          },
        },
      ],
    },
    include: {
      identifiers: true,
    },
    take: 10,
  });

  res.json({
    merchants: merchants.map((m) => ({
      id: m.id,
      name: m.name,
      verified: m.verified,
      category: m.category,
      identifiers: m.identifiers.map((i) => ({ type: i.type, value: i.value })),
    })),
  });
});
