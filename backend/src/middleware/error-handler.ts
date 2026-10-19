import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { ApiError, errorBody } from '../lib/errors';

type HttpError = Error & { code?: string; statusCode?: number };

function toPublicError(error: HttpError): ApiError {
  if (error instanceof ApiError) return error;

  if (error instanceof z.ZodError) {
    return new ApiError(400, 'INVALID_REQUEST', 'Request fields are invalid.');
  }

  const uploadTooLarge = ['FST_REQ_FILE_TOO_LARGE', 'FST_ERR_CTP_BODY_TOO_LARGE'];
  if (uploadTooLarge.includes(error.code ?? '')) {
    return new ApiError(413, 'AUDIO_TOO_LARGE', 'The upload exceeds the configured limit.');
  }

  if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
    return new ApiError(
      error.statusCode,
      'INVALID_REQUEST',
      'The request format or upload fields are invalid.',
    );
  }

  // Database and provider errors can contain credentials or user content.
  return new ApiError(500, 'INTERNAL_ERROR', 'The request could not be completed.');
}

export function registerErrorHandlers(app: FastifyInstance) {
  app.setErrorHandler((error: HttpError, request, reply) => {
    if (reply.sent) return;
    const publicError = toPublicError(error);

    if (publicError.code === 'RATE_LIMITED' || publicError.code === 'BUSY') {
      reply.header('Retry-After', '60');
    }

    app.log.warn(
      { requestId: request.id, code: publicError.code, status: publicError.status },
      'request failed',
    );
    reply.code(publicError.status).send(errorBody(publicError, request.id));
  });

  app.setNotFoundHandler((request, reply) => {
    const error = new ApiError(404, 'NOT_FOUND', 'This endpoint does not exist.');
    return reply.code(404).send(errorBody(error, request.id));
  });
}
