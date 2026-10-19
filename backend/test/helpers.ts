import { exportSPKI, generateKeyPair, SignJWT, type JWTPayload } from 'jose';
import { readConfig, type Config } from '../src/config/env';
import type { User, UserRepository } from '../src/services/user.service';

const keys = await generateKeyPair('RS256', { extractable: true });
const publicKey = await exportSPKI(keys.publicKey);
export const testConfig: Config = readConfig({
  NODE_ENV: 'test',
  DATABASE_URL: 'postgresql://test:test@ep-test.neon.tech/test?sslmode=require',
  CLERK_JWT_KEY: publicKey,
  CLERK_ISSUER: 'https://speech-test.clerk.accounts.dev',
  CLERK_AUTHORIZED_PARTIES: 'http://localhost:3000',
});

export async function token(overrides: JWTPayload = {}) {
  const now = Math.floor(Date.now() / 1000);
  return new SignJWT({
    sub: 'user_alice',
    sid: 'sess_alice',
    azp: 'http://localhost:3000',
    iss: testConfig.CLERK_ISSUER,
    iat: now,
    nbf: now - 1,
    exp: now + 60,
    email: 'alice@example.com',
    ...overrides,
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: 'test-key' })
    .sign(keys.privateKey);
}

export class TestUsers implements UserRepository {
  rows = new Map<string, User>();
  reads = 0;
  writes = 0;
  async find(id: string) {
    this.reads++;
    return this.rows.get(id) ?? null;
  }
  async upsert(user: User) {
    this.writes++;
    this.rows.set(user.id, { ...user });
    return { ...user };
  }
  async ready() {}
  async close() {}
}
