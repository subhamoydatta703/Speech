import type { FastifyInstance } from 'fastify';
import type { RouteContext } from '../lib/route-context';

export async function registerUserRoutes(app: FastifyInstance, context: RouteContext) {
  const { beginRequest, requireUser } = context;
  app.get('/v1/me', { onRequest: [beginRequest, requireUser] }, async (request) => ({
    user: request.user,
  }));
}
