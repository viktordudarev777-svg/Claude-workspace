import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { InvalidBarcodeError } from '../services/analysisService';

export class HttpError extends Error {
  constructor(readonly status: number, readonly code: string, message: string) {
    super(message);
    this.name = 'HttpError';
  }
}

/** Wraps an async handler so a rejected promise reaches the error middleware. */
export function asyncHandler<T extends Request>(
  handler: (req: T, res: Response, next: NextFunction) => Promise<unknown>,
) {
  return (req: T, res: Response, next: NextFunction): void => {
    handler(req, res, next).catch(next);
  };
}

export function errorHandler(
  error: unknown,
  _req: Request,
  res: Response,
  // Express identifies the error handler by its arity, so `next` must stay.
  _next: NextFunction,
): void {
  if (error instanceof ZodError) {
    res.status(400).json({
      error: 'invalid_request',
      message: 'Request body failed validation',
      details: error.issues.map((issue) => ({ path: issue.path.join('.'), message: issue.message })),
    });
    return;
  }
  if (error instanceof InvalidBarcodeError) {
    res.status(400).json({ error: 'invalid_barcode', message: error.message });
    return;
  }
  if (error instanceof HttpError) {
    res.status(error.status).json({ error: error.code, message: error.message });
    return;
  }

  const message = error instanceof Error ? error.message : 'Unexpected error';
  // eslint-disable-next-line no-console
  console.error('[foodlens] unhandled error:', error);
  res.status(500).json({ error: 'internal_error', message });
}
