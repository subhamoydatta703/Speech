import { randomUUID } from 'node:crypto';
import express, { type RequestHandler } from 'express';
import { clerkMiddleware } from '@clerk/express';
import cors from 'cors';
import helmet from 'helmet';
import type { Config } from './types/app-config';
import { ApiError } from './lib/errors';
import { authMiddleware } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error-handler';
import { createRequestLifecycle } from './middleware/request-lifecycle';
import { registerHealthRoutes } from './routes/health';
import { registerUserRoutes } from './routes/users';
import { registerDownloadRoutes } from './routes/downloads';
import { registerInstallationRoutes } from './routes/installations';

/** Tests can supply Clerk's middleware with a local verification key. */
export function buildApp(config: Config, options: { clerk?: RequestHandler } = {}) {
  const app = express();
  app.disable('x-powered-by');
  app.use(helmet());
  app.use((req, res, next) => {
    res.locals.requestId = randomUUID();
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Request-Id', res.locals.requestId);
    if (req.headers.origin && !config.origins.includes(req.headers.origin)) {
      return next(new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'This origin is not allowed.'));
    }
    next();
  });
  app.use(
    cors({
      origin: config.origins,
      methods: ['GET', 'POST', 'OPTIONS'],
      allowedHeaders: ['Authorization', 'Content-Type'],
      exposedHeaders: ['X-Request-Id', 'Retry-After', 'Content-Disposition', 'Content-Range'],
    }),
  );

  const beginRequest = createRequestLifecycle(config);
  const clerk =
    options.clerk ??
    clerkMiddleware({
      publishableKey: config.CLERK_PUBLISHABLE_KEY,
      secretKey: config.CLERK_SECRET_KEY,
      authorizedParties: config.origins,
    });
  registerHealthRoutes(app, beginRequest);
  registerUserRoutes(app, [beginRequest, clerk, authMiddleware]);
  registerInstallationRoutes(app, beginRequest, [beginRequest, clerk, authMiddleware]);
  // Large installer downloads have a separate admission pool and a five-minute deadline.
  const beginDownload = createRequestLifecycle({ ...config, REQUEST_TIMEOUT_MS: 300000 });
  registerDownloadRoutes(
    app,
    [beginDownload, clerk, authMiddleware],
    config.WINDOWS_INSTALLER_PATH,
  );
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
