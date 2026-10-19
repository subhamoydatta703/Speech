import { randomUUID } from 'node:crypto';
import Fastify, { LogController } from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import type { Config } from './config/env';
import { ApiError } from './lib/errors';
import { createAuthMiddleware } from './middleware/auth';
import { registerErrorHandlers } from './middleware/error-handler';
import { registerRequestLifecycle } from './middleware/request-lifecycle';
import { registerHealthRoutes } from './routes/health';
import { registerUserRoutes } from './routes/users';
import type { UserRepository } from './services/user.service';

type AppDependencies = {
  users: UserRepository;
  logger?: boolean;
};

/** Compose the API. Dependencies are supplied so tests need no live credentials. */
export async function buildApp(config: Config, dependencies: AppDependencies) {
  const { users } = dependencies;
  const app = Fastify({
    logger: dependencies.logger ? { level: 'info' } : false,
    logController: new LogController({ disableRequestLogging: true }),
    requestIdHeader: false,
    genReqId: () => randomUUID(),
    trustProxy: false,
    bodyLimit: 64 * 1024,
    requestTimeout: config.REQUEST_TIMEOUT_MS,
    connectionTimeout: config.REQUEST_TIMEOUT_MS,
    keepAliveTimeout: 5000,
    forceCloseConnections: true,
  });

  app.decorateRequest('userId', null);
  app.decorateRequest('user', null);
  registerErrorHandlers(app);

  await app.register(helmet);
  app.addHook('onRequest', async (request, reply) => {
    reply.header('Cache-Control', 'no-store');
    reply.header('X-Request-Id', request.id);
    const origin = request.headers.origin;
    // Desktop clients may omit Origin, but still need a valid bearer token.
    if (origin && !config.origins.includes(origin)) {
      throw new ApiError(403, 'ORIGIN_NOT_ALLOWED', 'This origin is not allowed.');
    }
  });

  await app.register(cors, {
    origin: config.origins,
    credentials: false,
    methods: ['GET', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    exposedHeaders: ['X-Request-Id', 'Retry-After'],
    maxAge: 600,
  });

  const authenticate = createAuthMiddleware(config, users);
  const lifecycle = registerRequestLifecycle(app, config, authenticate);
  const context = { config, users, ...lifecycle };
  await registerHealthRoutes(app, context);
  await registerUserRoutes(app, context);

  app.addHook('onClose', async () => users.close());
  await app.ready();
  return app;
}
