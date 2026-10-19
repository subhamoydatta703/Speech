import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { buildApp } from '../src/app';
import { testConfig, TestUsers, token } from './helpers';
import { capabilitiesSchema, currentUserSchema } from '@speech/contracts';

describe('Account HTTP API', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let users: TestUsers;
  let authorization: string;
  beforeEach(async () => {
    users = new TestUsers();
    app = await buildApp(testConfig, { users });
    authorization = `Bearer ${await token()}`;
  });
  afterEach(async () => {
    await app.close();
  });

  test('starts without HF credentials or an inference provider', async () => {
    expect(testConfig).not.toHaveProperty('HF_TOKEN');
    expect((await app.inject('/v1/health')).json()).toEqual({ status: 'ok' });
    expect(users.reads).toBe(0);
    const response = await app.inject('/v1/capabilities');
    expect(capabilitiesSchema.parse(response.json())).toEqual({
      sttMode: 'local',
      cloudTranscription: false,
      storage: { audio: false, transcripts: false, userFields: ['id', 'email'] },
    });
    expect(response.json()).not.toHaveProperty('maxUploadBytes');
  });

  test('returns only the authenticated account with no-store headers', async () => {
    const response = await app.inject({ url: '/v1/me', headers: { authorization } });
    expect(response.statusCode).toBe(200);
    expect(currentUserSchema.parse(response.json())).toEqual({
      user: { id: 'user_alice', email: 'alice@example.com' },
    });
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-request-id']).toBeTruthy();
  });

  test.each(['/v1/transcriptions', '/v1/webhooks/clerk'])(
    'removed endpoint %s returns structured 404',
    async (url) => {
      const response = await app.inject({ method: 'POST', url, payload: {} });
      expect(response.statusCode).toBe(404);
      expect(response.json().error.code).toBe('NOT_FOUND');
      expect(users.reads).toBe(0);
    },
  );

  test('multipart audio cannot reach a transcription handler', async () => {
    const response = await app.inject({
      method: 'POST',
      url: '/v1/transcriptions',
      headers: { authorization, 'content-type': 'multipart/form-data; boundary=test' },
      payload: '--test--\r\n',
    });
    // Fastify rejects an unsupported body before its not-found handler runs.
    expect([404, 415]).toContain(response.statusCode);
    expect(users.reads).toBe(0);
  });

  test('enforces browser origins and allows account preflight', async () => {
    expect(
      (await app.inject({ url: '/v1/health', headers: { origin: 'https://evil.example' } }))
        .statusCode,
    ).toBe(403);
    const response = await app.inject({
      method: 'OPTIONS',
      url: '/v1/me',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'GET',
        'access-control-request-headers': 'authorization',
      },
    });
    expect(response.statusCode).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
    expect(response.headers['access-control-allow-methods']).not.toContain('POST');
  });

  test('readiness reports database failure without exposing details', async () => {
    expect((await app.inject('/v1/ready')).statusCode).toBe(200);
    users.ready = async () => {
      throw new Error('private database password');
    };
    const response = await app.inject('/v1/ready');
    expect(response.statusCode).toBe(503);
    expect(response.json().error.code).toBe('DATABASE_UNAVAILABLE');
    expect(response.body).not.toContain('password');
    expect((await app.inject('/v1/health')).statusCode).toBe(200);
  });

  test('bounds account work and releases a timed-out request slot', async () => {
    await app.close();
    let announceStart!: () => void;
    let finishLookup!: (value: null) => void;
    const started = new Promise<void>((resolve) => {
      announceStart = resolve;
    });
    users.find = async () => {
      announceStart();
      return new Promise<null>((resolve) => {
        finishLookup = resolve;
      });
    };
    app = await buildApp(
      { ...testConfig, MAX_CONCURRENT_REQUESTS: 1, REQUEST_TIMEOUT_MS: 100 },
      { users },
    );
    const first = app.inject({ url: '/v1/me', headers: { authorization } });
    await started;
    const busy = await app.inject({ url: '/v1/me', headers: { authorization } });
    expect(busy.statusCode).toBe(503);
    expect(busy.json().error.code).toBe('BUSY');
    const timedOut = await first;
    expect(timedOut.statusCode).toBe(504);
    expect(timedOut.json().error.code).toBe('REQUEST_TIMEOUT');
    finishLookup(null);
    users.find = TestUsers.prototype.find;
    expect((await app.inject({ url: '/v1/me', headers: { authorization } })).statusCode).toBe(200);
  });

  test('readiness timeout uses a generic request error', async () => {
    await app.close();
    users.ready = () => new Promise<void>(() => {});
    app = await buildApp({ ...testConfig, REQUEST_TIMEOUT_MS: 30 }, { users });
    const response = await app.inject('/v1/ready');
    expect(response.statusCode).toBe(504);
    expect(response.json().error.code).toBe('REQUEST_TIMEOUT');
  });

  test('rate limits authentication attempts without saving user/IP records', async () => {
    await app.close();
    app = await buildApp({ ...testConfig, REQUESTS_PER_MINUTE: 1 }, { users });
    await app.inject('/v1/me');
    const response = await app.inject('/v1/me');
    expect(response.statusCode).toBe(429);
    expect(response.headers['retry-after']).toBe('60');
    expect(users.rows.size).toBe(0);
  });

  test('shutdown closes the shared database client', async () => {
    let closed = false;
    users.close = async () => {
      closed = true;
    };
    await app.close();
    expect(closed).toBe(true);
  });
});
