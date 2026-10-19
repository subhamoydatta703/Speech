import type { Express, RequestHandler } from 'express';
import type { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../config/db';
import { ApiError } from '../lib/errors';

export function registerUserRoutes(app: Express, middleware: RequestHandler[]) {
  app.get('/v1/me', ...middleware, async (req: AuthenticatedRequest, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.userId! },
      select: { id: true, email: true },
    });
    if (!user)
      throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'The user profile is unavailable.', true);
    if (!res.destroyed) res.json({ user });
  });
}
