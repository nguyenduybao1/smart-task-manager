import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import { config } from '@/config/env';
import { errorHandler } from '@/middleware/errorHandler';
import authRoutes from '@/routes/auth.routes';

const app = express();

// ─────────────────────────────────────────────
// Security middleware
// ─────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin:      config.cors.origin,
  credentials: true,
}));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      100,
  message:  { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests' } },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:      10,
  message:  { success: false, error: { code: 'RATE_LIMITED', message: 'Too many auth attempts' } },
});

app.use(limiter);

// ─────────────────────────────────────────────
// General middleware
// ─────────────────────────────────────────────
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser(config.cookie.secret));

if (config.env !== 'test') {
  app.use(morgan('dev'));
}

// ─────────────────────────────────────────────
// Health check
// ─────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({ success: true, data: { status: 'ok' } });
});

// ─────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: 'Route not found' },
  });
});

// Error handler — must be last
app.use(errorHandler);

export default app;