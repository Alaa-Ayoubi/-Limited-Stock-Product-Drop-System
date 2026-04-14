import { Request, Response, NextFunction } from 'express';
import { Prisma } from '@prisma/client';
import { logger } from '../lib/logger';

export class AppError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly code?: string
  ) {
    super(message);
    this.name = 'AppError';
    Error.captureStackTrace(this, this.constructor);
  }
}

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  logger.error('Request error', {
    method: req.method,
    url: req.url,
    error: err.message,
    stack: err.stack,
  });

  // Known application error
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      code: err.code,
    });
    return;
  }

  // Prisma unique constraint violation
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      res.status(409).json({
        success: false,
        error: 'Resource already exists',
        code: 'DUPLICATE_ENTRY',
      });
      return;
    }
    if (err.code === 'P2025') {
      res.status(404).json({
        success: false,
        error: 'Resource not found',
        code: 'NOT_FOUND',
      });
      return;
    }
  }

  // Prisma transaction conflict (serialization failure under concurrency)
  if (
    err instanceof Prisma.PrismaClientUnknownRequestError &&
    err.message.includes('could not serialize access')
  ) {
    res.status(409).json({
      success: false,
      error: 'Transaction conflict – please retry',
      code: 'TRANSACTION_CONFLICT',
    });
    return;
  }

  // Default 500
  res.status(500).json({
    success: false,
    error: process.env['NODE_ENV'] === 'production' ? 'Internal server error' : err.message,
    code: 'INTERNAL_ERROR',
  });
};
