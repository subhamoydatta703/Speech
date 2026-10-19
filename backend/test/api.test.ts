import { beforeEach, afterEach, describe, expect, mock, test } from 'bun:test';
import { createHash, randomBytes } from 'node:crypto';
import request from 'supertest';
import { fileURLToPath } from 'node:url';

// Replace the module before loading the app; never open a real test database connection.
const prisma = {
  user: {
    findUnique: mock(async (_args: any): Promise<{ id: string; email: string } | null> => null),
    upsert: mock(async (_args: any): Promise<{ id: string; email: string }> => ({
      id: '',
      email: '',
    })),
  },
  $queryRaw: mock(async (): Promise<unknown[]> => []),
};
mock.module('../src/config/db', () => ({ prisma }));
const { testApp, token } = await import('./helpers');

describe('Express API with the supplied auth middleware', () => {
  let rows: Map<string, { id: string; email: string }>;
  const find = prisma.user.findUnique;
  const upsert = prisma.user.upsert;
  const ready = prisma.$queryRaw;
  let app: ReturnType<typeof testApp>;
  beforeEach(() => {
    rows = new Map();
    find.mockReset().mockImplementation(async (args: any) => rows.get(args.where.id) ?? null);
    upsert.mockReset().mockImplementation(async (args: any) => {
      const user = { id: args.create.id, email: args.create.email };
      rows.set(user.id, user);
      return user;
    });
    ready.mockReset().mockResolvedValue([{ value: 1 }]);
    app = testApp();
  });
  afterEach(() => {
    app.emit('shutdown');
  });

  test('public health and local capabilities need no account or model token', async () => {
    expect((await request(app).get('/v1/health')).body).toEqual({ status: 'ok' });
    const response = await request(app).get('/v1/capabilities');
    expect(response.body).toEqual({
      sttMode: 'local',
      cloudTranscription: false,
      storage: { audio: false, transcripts: false, userFields: ['id', 'email'] },
    });
    expect(find).not.toHaveBeenCalled();
  });
  test('missing authentication returns the supplied middleware response', async () => {
    const response = await request(app).get('/v1/me');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      success: false,
      message: 'Unauthorized: Missing authentication credentials',
    });
    expect(find).not.toHaveBeenCalled();
  });
  test('Clerk verifies a signed JWT before the middleware creates the profile', async () => {
    const response = await request(app)
      .get('/v1/me')
      .set('Authorization', `Bearer ${await token()}`);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ user: { id: 'user_alice', email: 'alice@example.com' } });
    expect(upsert).toHaveBeenCalledTimes(1);
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-request-id']).toBeTruthy();
  });
  test('existing user takes the supplied fast path even without an email claim', async () => {
    rows.set('user_alice', { id: 'user_alice', email: 'saved@example.com' });
    const response = await request(app)
      .get('/v1/me')
      .set('Authorization', `Bearer ${await token({ email: undefined })}`);
    expect(response.status).toBe(200);
    expect(response.body.user.email).toBe('saved@example.com');
    expect(upsert).not.toHaveBeenCalled();
  });
  test('first-time user with no email receives the supplied 400', async () => {
    const response = await request(app)
      .get('/v1/me')
      .set('Authorization', `Bearer ${await token({ email: undefined })}`);
    expect(response.status).toBe(400);
    expect(response.body.success).toBe(false);
    expect(upsert).not.toHaveBeenCalled();
  });
  test.each([
    { exp: 1 },
    { nbf: Math.floor(Date.now() / 1000) + 3600 },
    { azp: 'https://evil.example' },
  ])('Clerk rejects invalid token claims %j', async (claims) => {
    const response = await request(app)
      .get('/v1/me')
      .set('Authorization', `Bearer ${await token(claims)}`);
    expect(response.status).toBe(401);
    expect(find).not.toHaveBeenCalled();
  });
  test('Clerk rejects tampered signatures', async () => {
    const parts = (await token()).split('.');
    parts[2] = 'A'.repeat(parts[2]!.length);
    const response = await request(app)
      .get('/v1/me')
      .set('Authorization', `Bearer ${parts.join('.')}`);
    expect(response.status).toBe(401);
    expect(find).not.toHaveBeenCalled();
  });
  test('raced insert is recovered using the supplied second lookup', async () => {
    upsert.mockImplementation(async () => {
      rows.set('user_alice', { id: 'user_alice', email: 'alice@example.com' });
      throw new Error('simulated race');
    });
    const response = await request(app)
      .get('/v1/me')
      .set('Authorization', `Bearer ${await token()}`);
    expect(response.status).toBe(200);
  });
  test('request query cannot select another account', async () => {
    const response = await request(app)
      .get('/v1/me?userId=user_other')
      .set('Authorization', `Bearer ${await token()}`);
    expect(response.body.user.id).toBe('user_alice');
  });
  test.each(['/v1/transcriptions', '/v1/webhooks/clerk'])(
    'removed route %s returns 404',
    async (path) => {
      const response = await request(app).post(path).send({});
      expect(response.status).toBe(404);
    },
  );
  test('browser origin is checked and account preflight works', async () => {
    expect(
      (await request(app).get('/v1/health').set('Origin', 'https://evil.example')).status,
    ).toBe(403);
    const response = await request(app)
      .options('/v1/me')
      .set('Origin', 'http://localhost:3000')
      .set('Access-Control-Request-Method', 'GET');
    expect(response.status).toBe(204);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });
  test('readiness failures do not expose database errors', async () => {
    ready.mockRejectedValue(new Error('private connection details'));
    const response = await request(app).get('/v1/ready');
    expect(response.status).toBe(503);
    expect(response.text).not.toContain('private connection details');
  });
  test('authentication attempts are rate limited', async () => {
    app = testApp({ REQUESTS_PER_MINUTE: 1 });
    await request(app).get('/v1/me');
    const response = await request(app).get('/v1/me');
    expect(response.status).toBe(429);
    expect(response.headers['retry-after']).toBe('60');
  });

  test('download requires authentication even when an installer exists', async () => {
    app = testApp({
      WINDOWS_INSTALLER_PATH: fileURLToPath(new URL('./fixtures/installer.txt', import.meta.url)),
    });
    const response = await request(app).get('/v1/downloads/windows');
    expect(response.status).toBe(401);
    expect(response.headers['content-disposition']).toBeUndefined();
    expect(find).not.toHaveBeenCalled();
  });

  test('expired credentials cannot download a release', async () => {
    const response = await request(app)
      .get('/v1/downloads/windows')
      .set('Authorization', `Bearer ${await token({ exp: 1 })}`);
    expect(response.status).toBe(401);
  });

  test('authenticated download streams the configured private file only', async () => {
    const filePath = fileURLToPath(new URL('./fixtures/installer.txt', import.meta.url));
    app = testApp({ WINDOWS_INSTALLER_PATH: filePath });
    const response = await request(app)
      .get('/v1/downloads/windows?path=../../.env')
      .set('Authorization', `Bearer ${await token()}`);
    expect(response.status).toBe(200);
    expect(response.headers['content-disposition']).toContain('Speech-Setup.exe');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(Buffer.from(response.body).toString()).toBe(await Bun.file(filePath).text());
  });

  test.each([undefined, 'missing-private-installer.exe'])(
    'missing release %s returns 503 without exposing paths',
    async (path) => {
      app = testApp({ WINDOWS_INSTALLER_PATH: path });
      const response = await request(app)
        .get('/v1/downloads/windows')
        .set('Authorization', `Bearer ${await token()}`);
      expect(response.status).toBe(503);
      expect(response.body.error.code).toBe('RELEASE_UNAVAILABLE');
      expect(response.text).not.toContain('missing-private-installer.exe');
    },
  );

  test('private fixture is not exposed through static URLs', async () => {
    expect((await request(app).get('/test/fixtures/installer.txt')).status).toBe(404);
    expect((await request(app).get('/Speech-Setup.exe')).status).toBe(404);
  });

  async function startInstallation() {
    const verifier = randomBytes(32).toString('base64url');
    const response = await request(app)
      .post('/v1/installations')
      .send({
        codeChallenge: createHash('sha256').update(verifier).digest('base64url'),
      });
    expect(response.status).toBe(201);
    return { verifier, ...response.body };
  }

  test('website sign-in activates setup without giving the installer a Clerk token', async () => {
    const installation = await startInstallation();
    const exchangePath = `/v1/installations/${installation.id}/exchange`;
    const pending = await request(app)
      .post(exchangePath)
      .send({ codeVerifier: installation.verifier });
    expect(pending.status).toBe(202);
    expect(pending.body).toEqual({ status: 'pending' });
    expect(pending.headers['retry-after']).toBe('3');
    const authorization = `Bearer ${await token()}`;
    const inspection = await request(app)
      .get(`/v1/installations/${installation.id}`)
      .set('Authorization', authorization);
    expect(inspection.body.confirmationCode).toBe(installation.confirmationCode);
    expect(inspection.body).not.toHaveProperty('user');
    const approval = await request(app)
      .post(`/v1/installations/${installation.id}/approve`)
      .set('Authorization', authorization)
      .send({ confirmationCode: installation.confirmationCode });
    expect(approval.status).toBe(200);
    const result = await request(app)
      .post(exchangePath)
      .send({ codeVerifier: installation.verifier });
    expect(result.status).toBe(200);
    expect(result.body).toMatchObject({
      status: 'activated',
      user: { id: 'user_alice', email: 'alice@example.com' },
    });
    expect(result.body).not.toHaveProperty('token');
    expect(result.headers['cache-control']).toBe('no-store');
    expect(
      (await request(app).post(exchangePath).send({ codeVerifier: installation.verifier })).status,
    ).toBe(410);
    expect((await request(app).get('/v1/me')).status).toBe(401);
  });

  test('approval requires login and cannot take an identity from the request body', async () => {
    const installation = await startInstallation();
    const path = `/v1/installations/${installation.id}/approve`;
    expect(
      (await request(app).post(path).send({ confirmationCode: installation.confirmationCode }))
        .status,
    ).toBe(401);
    expect((await request(app).get(`/v1/installations/${installation.id}`)).status).toBe(401);
    const response = await request(app)
      .post(path)
      .set('Authorization', `Bearer ${await token()}`)
      .send({ confirmationCode: installation.confirmationCode, userId: 'user_other' });
    expect(response.status).toBe(400);
    expect(
      (
        await request(app)
          .post(`/v1/installations/${installation.id}/exchange`)
          .send({ codeVerifier: installation.verifier })
      ).status,
    ).toBe(202);
  });

  test('another verifier and expired browser credentials cannot authorize setup', async () => {
    const installation = await startInstallation();
    const response = await request(app)
      .post(`/v1/installations/${installation.id}/exchange`)
      .send({ codeVerifier: randomBytes(32).toString('base64url') });
    expect(response.status).toBe(401);
    expect(
      (
        await request(app)
          .post(`/v1/installations/${installation.id}/approve`)
          .set('Authorization', `Bearer ${await token({ exp: 1 })}`)
          .send({ confirmationCode: installation.confirmationCode })
      ).status,
    ).toBe(401);
  });

  test('simultaneous exchanges can activate only once', async () => {
    const installation = await startInstallation();
    await request(app)
      .post(`/v1/installations/${installation.id}/approve`)
      .set('Authorization', `Bearer ${await token()}`)
      .send({ confirmationCode: installation.confirmationCode });
    const results = await Promise.all(
      [1, 2].map(() =>
        request(app)
          .post(`/v1/installations/${installation.id}/exchange`)
          .send({ codeVerifier: installation.verifier }),
      ),
    );
    expect(results.map((response) => response.status).sort()).toEqual([200, 410]);
  });

  test('handoff rejects malformed, oversized and cross-origin bodies', async () => {
    expect(
      (await request(app).post('/v1/installations').send({ codeChallenge: 'invalid' })).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/v1/installations')
          .set('Content-Type', 'application/json')
          .send('{')
      ).status,
    ).toBe(400);
    expect(
      (
        await request(app)
          .post('/v1/installations')
          .send({ codeChallenge: 'A'.repeat(3000) })
      ).status,
    ).toBe(413);
    expect(
      (await request(app).post('/v1/installations').type('form').send('codeChallenge=x')).status,
    ).toBe(415);
    expect(
      (await request(app).post('/v1/installations').set('Origin', 'https://evil.example').send({}))
        .status,
    ).toBe(403);
  });
});
