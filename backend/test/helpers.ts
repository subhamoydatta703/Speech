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
  HF_TOKEN: 'hf_test_only',
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

export function wav(seconds = 0.2, amplitude = 10000): Buffer {
  const length = Math.round(seconds * 16000) * 2;
  const buffer = Buffer.alloc(44 + length);
  buffer.write('RIFF');
  buffer.writeUInt32LE(36 + length, 4);
  buffer.write('WAVEfmt ', 8);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(1, 22);
  buffer.writeUInt32LE(16000, 24);
  buffer.writeUInt32LE(32000, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(length, 40);
  for (let i = 0; i < length; i += 2)
    buffer.writeInt16LE(Math.round(Math.sin(i / 20) * amplitude), 44 + i);
  return buffer;
}

export function upload(audio = wav(), fields: Record<string, string> = {}) {
  const boundary = 'speech-test-boundary';
  const parts: Buffer[] = [];
  for (const [key, value] of Object.entries(fields)) {
    parts.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${key}"\r\n\r\n${value}\r\n`,
      ),
    );
  }
  parts.push(
    Buffer.from(
      `--${boundary}\r\nContent-Disposition: form-data; name="audio"; filename="voice.wav"\r\nContent-Type: audio/wav\r\n\r\n`,
    ),
    audio,
    Buffer.from(`\r\n--${boundary}--\r\n`),
  );
  return {
    payload: Buffer.concat(parts),
    contentType: `multipart/form-data; boundary=${boundary}`,
  };
}
