import type { Express, RequestHandler } from 'express';
import { capabilitiesSchema } from '@speech/contracts';
import { prisma } from '../config/db';
import { ApiError } from '../lib/errors';

export function registerHealthRoutes(app: Express, beginRequest: RequestHandler) {
  app.get('/v1/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.get('/v1/ready', beginRequest, async (_req, res) => {
    try {
      await prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'The database is not ready.', true);
    }
    if (!res.destroyed) res.json({ status: 'ready' });
  });
  const capabilities = capabilitiesSchema.parse({
    sttMode: 'local',
    cloudTranscription: false,
    storage: { audio: false, transcripts: false, userFields: ['id', 'email'] },
  });
  app.get('/v1/capabilities', (_req, res) => {
    res.json(capabilities);
  });
}
