import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';
import { metrics } from '../lib/metrics';

export const requestLogger = (req: Request, res: Response, next: NextFunction): void => {
  const start = Date.now();

  metrics.incrementRequests();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('HTTP Request', {
      method: req.method,
      url: req.url,
      status: res.statusCode,
      duration: `${duration}ms`,
      ip: req.ip,
      userAgent: req.get('user-agent'),
    });
  });

  next();
};
