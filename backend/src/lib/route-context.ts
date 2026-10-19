import type { FastifyReply, FastifyRequest } from 'fastify';
import type { Config } from '../config/env';
import type { SttProvider } from '../services/transcription.service';
import type { UserRepository } from '../services/user.service';

export type RouteContext = {
  config: Config;
  users: UserRepository;
  provider: SttProvider;
  beginRequest: (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
  requireUser: (request: FastifyRequest) => Promise<void>;
  getRequestSignal: (request: FastifyRequest) => AbortSignal;
};
