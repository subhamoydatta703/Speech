import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { request as httpRequest } from 'node:http';
import { buildApp } from '../src/app';
import type { SttProvider } from '../src/services/transcription.service';
import { ApiError } from '../src/lib/errors';
import { testConfig, TestUsers, token, upload, wav } from './helpers';

describe('HTTP API', () => {
  let app: Awaited<ReturnType<typeof buildApp>>;
  let users: TestUsers;
  let provider: SttProvider;
  let authorization: string;
  let calls: number;
  beforeEach(async () => {
    users = new TestUsers();
    calls = 0;
    provider = {
      model: 'test/asr',
      transcribe: async () => {
        calls++;
        return 'Hello world.';
      },
    };
    app = await buildApp(testConfig, { users, provider });
    authorization = `Bearer ${await token()}`;
  });
  afterEach(async () => {
    await app.close();
  });
  const request = (data = upload()) => ({
    method: 'POST' as const,
    url: '/v1/transcriptions',
    headers: { authorization, 'content-type': data.contentType },
    payload: data.payload,
  });

  test('returns transcription with correlation ID and no saved content', async () => {
    const sessionId = crypto.randomUUID();
    let held: Buffer | undefined;
    provider.transcribe = async (audio) => {
      held = audio;
      return 'Hello world.';
    };
    const result = await app.inject(request(upload(wav(), { sessionId })));
    expect(result.statusCode).toBe(200);
    expect(result.json()).toMatchObject({
      sessionId,
      text: 'Hello world.',
      audioDurationMs: 200,
      model: 'test/asr',
    });
    expect(result.json().requestId).toBe(result.headers['x-request-id']);
    expect(result.headers['cache-control']).toBe('no-store');
    expect(held?.every((byte) => byte === 0)).toBe(true);
    expect([...users.rows.values()]).toEqual([{ id: 'user_alice', email: 'alice@example.com' }]);
  });
  test('authenticates before accepting audio', async () => {
    const req = request();
    req.headers.authorization = '';
    expect((await app.inject(req)).statusCode).toBe(401);
    expect(calls).toBe(0);
  });
  test('rejects malformed audio, quiet audio and invalid fields before provider call', async () => {
    expect((await app.inject(request(upload(Buffer.from('invalid'))))).statusCode).toBe(400);
    expect((await app.inject(request(upload(wav(1, 0))))).statusCode).toBe(422);
    expect((await app.inject(request(upload(wav(), { sessionId: 'wrong' })))).statusCode).toBe(400);
    expect(
      (await app.inject(request(upload(wav(), { url: 'https://private.example' })))).statusCode,
    ).toBe(400);
    expect(calls).toBe(0);
  });
  test('rejects JSON instead of multipart and missing files', async () => {
    const result = await app.inject({
      method: 'POST',
      url: '/v1/transcriptions',
      headers: { authorization },
      payload: { audio: 'url' },
    });
    expect(result.statusCode).toBe(415);
    expect(calls).toBe(0);
  });
  test('enforces file byte limits', async () => {
    await app.close();
    app = await buildApp({ ...testConfig, MAX_UPLOAD_BYTES: 32044 }, { users, provider });
    expect((await app.inject(request(upload(wav(2))))).statusCode).toBe(413);
    expect(calls).toBe(0);
  });
  test('provider failures use safe structured errors', async () => {
    provider.transcribe = async () => {
      throw new ApiError(503, 'PROVIDER_UNAVAILABLE', 'Temporarily unavailable.', true);
    };
    const result = await app.inject(request());
    expect(result.statusCode).toBe(503);
    expect(result.json().error).toMatchObject({ code: 'PROVIDER_UNAVAILABLE', retryable: true });
  });
  test('enforces allowed origins and supports preflight', async () => {
    const rejected = await app.inject({
      url: '/v1/health',
      headers: { origin: 'https://evil.example' },
    });
    expect(rejected.statusCode).toBe(403);
    const preflight = await app.inject({
      method: 'OPTIONS',
      url: '/v1/transcriptions',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'authorization,content-type',
      },
    });
    expect(preflight.statusCode).toBe(204);
    expect(preflight.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });
  test('health and capabilities work without authentication; readiness checks DB', async () => {
    expect((await app.inject('/v1/health')).json()).toEqual({ status: 'ok' });
    expect((await app.inject('/v1/capabilities')).json().storage.userFields).toEqual([
      'id',
      'email',
    ]);
    users.ready = async () => {
      throw new Error('private details');
    };
    expect((await app.inject('/v1/ready')).statusCode).toBe(503);
  });
  test('bounds concurrency, cancels a timed-out request and releases its slot', async () => {
    await app.close();
    let started!: () => void;
    const entered = new Promise<void>((resolve) => {
      started = resolve;
    });
    provider.transcribe = async (_audio, signal) => {
      started();
      return new Promise((_, reject) =>
        signal.addEventListener('abort', () => reject(signal.reason), { once: true }),
      );
    };
    app = await buildApp(
      { ...testConfig, MAX_CONCURRENT_REQUESTS: 1, REQUEST_TIMEOUT_MS: 150 },
      { users, provider },
    );
    const first = app.inject(request());
    await entered;
    const second = await app.inject(request());
    expect(second.statusCode).toBe(503);
    expect(second.json().error.code).toBe('BUSY');
    expect((await first).statusCode).toBe(504);
    provider.transcribe = async () => 'Recovered';
    expect((await app.inject(request())).statusCode).toBe(200);
  });
  test('rate limits authentication attempts without keeping user/IP records', async () => {
    await app.close();
    app = await buildApp({ ...testConfig, REQUESTS_PER_MINUTE: 1 }, { users, provider });
    await app.inject('/v1/me');
    const result = await app.inject('/v1/me');
    expect(result.statusCode).toBe(429);
    expect(result.headers['retry-after']).toBe('60');
  });

  test('removed webhook endpoint returns 404', async () => {
    const response = await app.inject({ method: 'POST', url: '/v1/webhooks/clerk', payload: {} });
    expect(response.statusCode).toBe(404);
    expect(response.json().error.code).toBe('NOT_FOUND');
  });

  test('real HTTP disconnect is bounded by the deadline and frees the request slot', async () => {
    await app.close();
    let announceStart!: () => void;
    let announceCancellation!: () => void;
    const started = new Promise<void>((resolve) => {
      announceStart = resolve;
    });
    const cancelled = new Promise<void>((resolve) => {
      announceCancellation = resolve;
    });
    provider.transcribe = async (_audio, signal) => {
      announceStart();
      return new Promise((_resolve, reject) =>
        signal.addEventListener(
          'abort',
          () => {
            announceCancellation();
            reject(signal.reason);
          },
          { once: true },
        ),
      );
    };
    app = await buildApp(
      { ...testConfig, MAX_CONCURRENT_REQUESTS: 1, REQUEST_TIMEOUT_MS: 250 },
      { users, provider },
    );
    const address = await app.listen({ host: '127.0.0.1', port: 0 });
    const data = upload();
    const client = httpRequest(`${address}/v1/transcriptions`, {
      method: 'POST',
      headers: {
        authorization,
        'content-type': data.contentType,
        'content-length': data.payload.length,
      },
      agent: false,
    });
    client.on('error', () => {});
    client.end(data.payload);
    await started;
    client.destroy();
    await cancelled;
    provider.transcribe = async () => 'Ready again';
    const response = await app.inject(request());
    expect(response.statusCode).toBe(200);
  });
});
