import type { FastifyInstance } from 'fastify';
import type { RouteContext } from '../lib/route-context';
import { AUDIO_FORMAT } from '../lib/audio';
import { ApiError, untilAborted } from '../lib/errors';

export async function registerHealthRoutes(app: FastifyInstance, context: RouteContext) {
  const { config, users, beginRequest, getRequestSignal } = context;
  app.get('/v1/health', async () => ({ status: 'ok' }));
  app.get('/v1/ready', { onRequest: beginRequest }, async (request) => {
    try {
      await untilAborted(users.ready(), getRequestSignal(request));
    } catch {
      throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'The database is not ready.', true);
    }
    return { status: 'ready' };
  });
  app.get('/v1/capabilities', async () => ({
    audio: AUDIO_FORMAT,
    maxAudioSeconds: config.MAX_AUDIO_SECONDS,
    maxUploadBytes: config.MAX_UPLOAD_BYTES,
    streaming: false,
    storage: { audio: false, transcripts: false, userFields: ['id', 'email'] },
  }));
}
