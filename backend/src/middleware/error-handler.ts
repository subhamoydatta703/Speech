import type { ErrorRequestHandler, RequestHandler } from 'express';
import { ApiError, errorBody } from '../lib/errors';
import { z } from 'zod';

export const errorHandler: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (res.destroyed) return;
  const parserError = error?.type === 'entity.parse.failed' || error?.type === 'entity.too.large';
  const publicError =
    error instanceof ApiError
      ? error
      : error instanceof z.ZodError || parserError
        ? new ApiError(
            error?.type === 'entity.too.large' ? 413 : 400,
            'INVALID_REQUEST',
            'The request body is invalid.',
          )
        : new ApiError(500, 'INTERNAL_ERROR', 'The request could not be completed.');
  if (publicError.code === 'RATE_LIMITED' || publicError.code === 'BUSY') {
    res.setHeader('Retry-After', '60');
  }
  res.status(publicError.status).json(errorBody(publicError, res.locals.requestId));
};

export const notFoundHandler: RequestHandler = (_req, res) => {
  const error = new ApiError(404, 'NOT_FOUND', 'This endpoint does not exist.');
  res.status(404).json(errorBody(error, res.locals.requestId));
};
