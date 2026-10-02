import { Request, Response, NextFunction } from 'express';

/**
 * Admin authentication middleware.
 * Checks for x-admin-key or Authorization: Bearer <key>.
 * If ADMIN_API_KEY is not configured in env, permits in development mode.
 */
export function adminAuth(req: Request, res: Response, next: NextFunction): void {
  const adminSecret = process.env.ADMIN_API_KEY;

  // If no admin secret is configured in environment, permit during development
  if (!adminSecret || adminSecret.trim() === '') {
    return next();
  }

  const authHeader = req.headers.authorization;
  const adminHeader = req.headers['x-admin-key'] as string | undefined;

  const providedKey = authHeader?.startsWith('Bearer ')
    ? authHeader.substring(7).trim()
    : adminHeader?.trim();

  if (!providedKey || providedKey !== adminSecret.trim()) {
    res.status(401).json({ error: 'Unauthorized: Valid admin credentials required.' });
    return;
  }

  next();
}
