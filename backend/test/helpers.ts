import { exportSPKI, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { clerkMiddleware } from '@clerk/express';
import { buildApp } from '../src/app';
import type { Config } from '../src/types/app-config';

const keys = await generateKeyPair('RS256', { extractable: true });
const publicKey = await exportSPKI(keys.publicKey);
const issuer = 'https://speech-test.clerk.accounts.dev';
export const testConfig: Config = {
  HOST: '127.0.0.1',
  PORT: 4000,
  MAX_CONCURRENT_REQUESTS: 4,
  REQUESTS_PER_MINUTE: 60,
  REQUEST_TIMEOUT_MS: 10000,
  CLERK_PUBLISHABLE_KEY: `pk_test_${Buffer.from('speech-test.clerk.accounts.dev$').toString('base64')}`,
  CLERK_SECRET_KEY: 'sk_test_local_only',
  origins: ['http://localhost:3000'],
};

export function testApp(overrides: Partial<Config> = {}) {
  const config = { ...testConfig, ...overrides };
  return buildApp(config, {
    clerk: clerkMiddleware({
      publishableKey: config.CLERK_PUBLISHABLE_KEY,
      secretKey: config.CLERK_SECRET_KEY,
      jwtKey: publicKey,
      authorizedParties: config.origins,
      clockSkewInMs: 0,
    }),
  });
}

export async function token(overrides: JWTPayload = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    sub: 'user_alice',
    sid: 'sess_alice',
    azp: 'http://localhost:3000',
    iss: issuer,
    iat: now,
    nbf: now - 1,
    exp: now + 60,
    email: 'alice@example.com',
    ...overrides,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: 'test-key' })
    .sign(keys.privateKey);
}
