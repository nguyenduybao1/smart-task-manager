import { Request, Response, NextFunction } from 'express';
import { AppError } from '@/utils/errors';
import { logger } from '@/lib/logger';

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  // Known operational error
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      error: {
        code:    err.code,
        message: err.message,
      },
    });
  }

  // Unexpected error — log full details, hide from client
  logger.error('Unexpected error', {
    message: err.message,
    stack:   err.stack,
  });

  return res.status(500).json({
    success: false,
    error: {
      code:    'INTERNAL_SERVER_ERROR',
      message: 'An unexpected error occurred',
    },
  });
}