import { verifyToken } from '@clerk/backend';
import type { FastifyRequest } from 'fastify';
import { z } from 'zod';
import type { Config } from '../config/env';
import { ApiError } from '../lib/errors';
import { syncUser, type User, type UserRepository } from '../services/user.service';

declare module 'fastify' {
  interface FastifyRequest {
    userId: string | null;
    user: User | null;
  }
}

export function createAuthMiddleware(config: Config, users: UserRepository) {
  return async function authMiddleware(request: FastifyRequest): Promise<void> {
    const header = request.headers.authorization;
    if (!header || header.length > 16384 || !/^Bearer \S+$/i.test(header)) {
      throw new ApiError(401, 'AUTH_REQUIRED', 'A valid Clerk session token is required.');
    }
    let claims;
    try {
      claims = await verifyToken(header.slice(7), {
        jwtKey: config.CLERK_JWT_KEY,
        issuer: config.CLERK_ISSUER,
        authorizedParties: config.authorizedParties,
        clockSkewInMs: 0,
      });
      // Only completed user sessions from our Clerk instance and authorized frontend.
      if (
        typeof claims.sub !== 'string' ||
        !claims.sub.startsWith('user_') ||
        claims.sub.length > 191 ||
        typeof claims.sid !== 'string' ||
        !claims.sid.startsWith('sess_') ||
        typeof claims.azp !== 'string' ||
        !config.authorizedParties.includes(claims.azp) ||
        claims.iss !== config.CLERK_ISSUER ||
        claims.sts === 'pending'
      ) {
        throw new Error('Invalid session');
      }
    } catch {
      throw new ApiError(
        401,
        'AUTH_REQUIRED',
        'The Clerk session is invalid or expired. Sign in again.',
      );
    }
    const email = z.string().email().max(254).safeParse(claims.email);
    if (!email.success) {
      throw new ApiError(
        400,
        'EMAIL_CLAIM_REQUIRED',
        'The session token must include a valid email claim. Configure it in Clerk and refresh your session.',
      );
    }
    request.user = await syncUser(users, { id: claims.sub, email: email.data });
    request.userId = claims.sub;
  };
}
