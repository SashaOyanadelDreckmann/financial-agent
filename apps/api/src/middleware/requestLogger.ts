/**
 * requestLogger.ts
 *
 * Express middleware for request/response logging.
 * Adds correlation ID and logs request details.
 */

import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import { createRequestLogger } from '../logger';

declare global {
  namespace Express {
    interface Request {
      correlationId: string;
      logger: ReturnType<typeof createRequestLogger>;
      startTime?: number;
    }
  }
}

export function requestLoggerMiddleware(req: Request, res: Response, next: NextFunction): void {
  const correlationId = randomUUID();
  const userId = (req as any).userId; // Set by auth middleware

  req.correlationId = correlationId;
  req.logger = createRequestLogger(correlationId, userId);
  req.startTime = Date.now();

  // Log request
  req.logger.info({
    msg: 'HTTP request',
    method: req.method,
    path: req.path,
    query: req.query,
    ip: req.ip,
  });

  // Intercept response finish to log response details
  res.on('finish', () => {
    const duration = req.startTime ? Date.now() - req.startTime : 0;

    req.logger.info({
      msg: 'HTTP response',
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: `${duration}ms`,
    });
  });

  next();
}
