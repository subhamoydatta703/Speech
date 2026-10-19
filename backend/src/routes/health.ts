import type { FastifyInstance } from 'fastify';
import type { RouteContext } from '../lib/route-context';
import { capabilitiesSchema } from '@speech/contracts';
import { ApiError, untilAborted } from '../lib/errors';

export async function registerHealthRoutes(app: FastifyInstance, context: RouteContext) {
  const { users, beginRequest, getRequestSignal } = context;
  app.get('/v1/health', async () => ({ status: 'ok' }));
  app.get('/v1/ready', { onRequest: beginRequest }, async (request) => {
    try {
      await untilAborted(users.ready(), getRequestSignal(request));
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'The database is not ready.', true);
    }
    return { status: 'ready' };
  });
  const capabilities = capabilitiesSchema.parse({
    sttMode: 'local',
    cloudTranscription: false,
    storage: { audio: false, transcripts: false, userFields: ['id', 'email'] },
  });
  app.get('/v1/capabilities', async () => capabilities);
}
