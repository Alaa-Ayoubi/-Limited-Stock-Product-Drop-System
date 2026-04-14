import rateLimit from 'express-rate-limit';
import { env } from '../config/env';

export const globalRateLimiter = rateLimit({
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests, please try again later',
    code: 'RATE_LIMIT_EXCEEDED',
  },
});

// Stricter limiter for reservation endpoint to prevent abuse
export const reservationRateLimiter = rateLimit({
  windowMs: 60_000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many reservation attempts, please slow down',
    code: 'RESERVATION_RATE_LIMIT',
  },
  keyGenerator: (req) => {
    // Rate-limit by user ID if authenticated, otherwise by IP
    return (req as { user?: { id?: string } }).user?.id ?? req.ip ?? 'unknown';
  },
});
