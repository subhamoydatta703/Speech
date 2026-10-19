import { stat } from 'node:fs/promises';
import { resolve } from 'node:path';
import type { Express, RequestHandler } from 'express';
import { ApiError } from '../lib/errors';

/** Returns true when the source looks like an HTTP(S) URL. */
function isRemoteUrl(source: string): boolean {
  return source.startsWith('https://') || source.startsWith('http://');
}

/** Serve a private release only after Clerk and the supplied auth middleware succeed. */
export function registerDownloadRoutes(
  app: Express,
  middleware: RequestHandler[],
  installerSource?: string,
) {
  app.get('/v1/downloads/windows', ...middleware, async (req, res, next) => {
    const unavailable = () =>
      new ApiError(
        503,
        'RELEASE_UNAVAILABLE',
        'The Windows installer is not available yet. Please try again later.',
        true,
      );
    if (!installerSource) throw unavailable();

    // ── Remote URL (production: GitHub Releases, S3, R2, etc.) ──
    if (isRemoteUrl(installerSource)) {
      try {
        const upstream = await fetch(installerSource, {
          method: req.method,
          redirect: 'follow',
          signal: AbortSignal.timeout(15000),
        });
        if (!upstream.ok) throw unavailable();

        // HEAD requests only check availability.
        if (req.method === 'HEAD') {
          res.status(200);
          res.setHeader('Content-Type', 'application/octet-stream');
          res.setHeader('Content-Disposition', 'attachment; filename="Speech-Setup.exe"');
          const length = upstream.headers.get('content-length');
          if (length) res.setHeader('Content-Length', length);
          return res.end();
        }

        // GET: stream the installer to the client.
        res.status(200);
        res.setHeader('Content-Type', 'application/octet-stream');
        res.setHeader('Content-Disposition', 'attachment; filename="Speech-Setup.exe"');
        res.setHeader('Cache-Control', 'private, no-store');
        const length = upstream.headers.get('content-length');
        if (length) res.setHeader('Content-Length', length);

        if (!upstream.body) throw unavailable();
        const reader = upstream.body.getReader();
        const pump = async (): Promise<void> => {
          while (true) {
            const { done, value } = await reader.read();
            if (done || res.destroyed) break;
            const canContinue = res.write(value);
            if (!canContinue) {
              await new Promise<void>((r) => res.once('drain', r));
            }
          }
          res.end();
        };
        await pump();
      } catch (error) {
        if (res.headersSent) return;
        next(unavailable());
      }
      return;
    }

    // ── Local file path (development) ──
    const filePath = resolve(installerSource);
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
        next(unavailable());
      },
    );
  });
}
