import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Express, RequestHandler } from 'express';
import { ApiError } from '../lib/errors';

/** Serve a private release only after Clerk and the supplied auth middleware succeed. */
export function registerDownloadRoutes(
  app: Express,
  middleware: RequestHandler[],
  installerPath?: string,
) {
  app.get('/v1/downloads/windows', ...middleware, async (_req, res, next) => {
    const unavailable = () =>
      new ApiError(
        503,
        'RELEASE_UNAVAILABLE',
        'The Windows installer is not available yet. Please try again later.',
        true,
      );
    if (!installerPath) throw unavailable();

    // The path comes only from server configuration, never from query/path parameters.
    const filePath = resolve(installerPath);
    try {
      const file = await stat(filePath);
      if (!file.isFile() || file.size === 0) throw unavailable();
    } catch {
      throw unavailable();
    }
    if (res.destroyed) return;
    res.type('application/octet-stream');
    res.download(
      filePath,
      'Speech-Setup.exe',
      {
        cacheControl: false,
        lastModified: false,
        dotfiles: 'deny',
      },
      (error) => {
        if (!error || res.destroyed) return;
        // Once streaming has started the error handler closes the connection.
        next(unavailable());
      },
    );
  });
}
