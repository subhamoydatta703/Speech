import express, { type Express, type RequestHandler } from 'express';
import { z } from 'zod';
import {
  installationStartSchema,
  installationApproveSchema,
  installationExchangeSchema,
} from '@speech/contracts';
import type { AuthenticatedRequest } from '../middleware/auth';
import { prisma } from '../config/db';
import { ApiError } from '../lib/errors';
import { InstallationService, INSTALLATION_POLL_SECONDS } from '../services/installation.service';

const idSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);

export function registerInstallationRoutes(
  app: Express,
  beginRequest: RequestHandler,
  authenticated: RequestHandler[],
) {
  const installations = new InstallationService();
  app.once('shutdown', () => installations.dispose());
  const json = express.json({ limit: '2kb', strict: true });
  const requireJson: RequestHandler = (req, _res, next) => {
    if (!req.is('application/json')) {
      return next(new ApiError(415, 'INVALID_REQUEST', 'Send an application/json request.'));
    }
    next();
  };

  // Setup knows a private verifier. Only its hash is sent when starting the request.
  app.post('/v1/installations', beginRequest, requireJson, json, (req, res) => {
    const { codeChallenge } = installationStartSchema.parse(req.body);
    res.status(201).json(installations.start(codeChallenge));
  });

  // The website uses its existing Clerk session; no second login is introduced.
  app.get('/v1/installations/:id', ...authenticated, (req, res) => {
    res.json(installations.inspect(idSchema.parse(req.params.id)));
  });

  app.post(
    '/v1/installations/:id/approve',
    ...authenticated,
    requireJson,
    json,
    async (req: AuthenticatedRequest, res) => {
      const id = idSchema.parse(req.params.id);
      const { confirmationCode } = installationApproveSchema.parse(req.body);
      const user = await prisma.user.findUnique({
        where: { id: req.userId! },
        select: { id: true, email: true },
      });
      if (!user)
        throw new ApiError(503, 'DATABASE_UNAVAILABLE', 'The account is unavailable.', true);
      if (res.destroyed) return;
      installations.approve(id, confirmationCode, user);
      res.json({ status: 'approved' });
    },
  );

  // This returns offline activation, not a Clerk session or a credential for online APIs.
  app.post('/v1/installations/:id/exchange', beginRequest, requireJson, json, (req, res) => {
    const id = idSchema.parse(req.params.id);
    const { codeVerifier } = installationExchangeSchema.parse(req.body);
    const result = installations.exchange(id, codeVerifier);
    if (result.status === 'pending') {
      res.setHeader('Retry-After', String(INSTALLATION_POLL_SECONDS));
      res.status(202).json(result);
    } else {
      res.json(result);
    }
  });
}
