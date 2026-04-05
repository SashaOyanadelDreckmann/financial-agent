/**
 * errorHandler.ts
 *
 * Global Express error handling middleware.
 * Catches all errors and returns structured error responses.
 */

import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { getLogger } from '../logger';

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
    timestamp: string;
    correlationId?: string;
  };
}

/**
 * Global error handler middleware.
 * Place this LAST in middleware stack.
 */
export function errorHandlerMiddleware(
  err: Error | ZodError | any,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const logger = (req as any).logger || getLogger();
  const correlationId = (req as any).correlationId;

  let statusCode = 500;
  let errorCode = 'INTERNAL_ERROR';
  let message = 'An unexpected error occurred';
  let details: unknown;

  // Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
    message = 'Request validation failed';
    details = err.errors.map((e: any) => ({
      path: e.path.join('.'),
      message: e.message,
    }));
  }
  // Standard HTTP errors
  else if (err instanceof Error) {
    message = err.message;

    // Map common error patterns to status codes
    if (message.includes('unauthorized') || message.includes('invalid credentials')) {
      statusCode = 401;
      errorCode = 'AUTH_ERROR';
    } else if (message.includes('not found') || message.includes('not found')) {
      statusCode = 404;
      errorCode = 'NOT_FOUND';
    } else if (message.includes('already exists')) {
      statusCode = 409;
      errorCode = 'CONFLICT';
    }
  }

  // Log error with context
  logger.error({
    msg: 'Unhandled error',
    errorCode,
    statusCode,
    errorMessage: message,
    errorStack: err?.stack,
    path: req.path,
    method: req.method,
  });

  // Send structured error response
  const errorObj: any = {
    code: errorCode,
    message,
    timestamp: new Date().toISOString(),
  };

  if (correlationId) {
    errorObj.correlationId = correlationId;
  }

  if (process.env.NODE_ENV === 'development' && details) {
    errorObj.details = details;
  }

  const response: ErrorResponse = { error: errorObj };

  res.status(statusCode).json(response);
}

/**
 * Utility to wrap async route handlers for error catching.
 * Use: router.get('/path', asyncHandler(async (req, res) => { ... }))
 */
export function asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
