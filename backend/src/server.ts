import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import pino from 'pino';
import dotenv from 'dotenv';
import { healthRouter } from './routes/health.js';
import { scansRouter } from './routes/scans.js';
import { reportsRouter } from './routes/reports.js';
import { adminRouter } from './routes/admin.js';
import { merchantsRouter } from './routes/merchants.js';

dotenv.config();

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport:
    process.env.NODE_ENV === 'development'
      ? {
          target: 'pino-pretty',
          options: { colorize: true },
        }
      : undefined,
});

const app = express();
const PORT = process.env.PORT || 5001;

// 1. Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // Allow PWA / Chrome Ext communication
  })
);

// 2. CORS configuration
app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

// 3. Body Parsers with payload limits
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// 4. Rate Limiting
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});

const scanLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 60, // Limit each IP to 60 scans per minute
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Scan rate limit exceeded, please wait a moment.' },
});

app.use('/api/', generalLimiter);
app.use('/api/v1/scans/', scanLimiter);

// 5. Mount API v1 Routes
app.use('/api/v1', healthRouter);
app.use('/api/v1', scansRouter);
app.use('/api/v1', reportsRouter);
app.use('/api/v1', adminRouter);
app.use('/api/v1', merchantsRouter);

// 6. Global 404 Handler
app.use((_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// 7. Global Error Handler
app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    logger.error({ err }, 'Unhandled application error');
    res.status(500).json({
      error: 'An internal server error occurred',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
);

app.listen(PORT, () => {
  logger.info(`🛡️ PhishLens Orchestration API running on http://localhost:${PORT}`);
  logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
});

export { app };
