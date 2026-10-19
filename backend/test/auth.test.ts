import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { buildApp } from '../src/app';
import { syncUser } from '../src/services/user.service';
import { testConfig, TestUsers, token } from './helpers';

describe('Clerk JWT authentication and profile sync', () => {
  let users: TestUsers;
  let app: Awaited<ReturnType<typeof buildApp>>;
  beforeEach(async () => {
    users = new TestUsers();
    app = await buildApp(testConfig, {
      users,
      provider: { model: 'test', transcribe: async () => 'hello' },
    });
  });
  afterEach(async () => {
    await app.close();
  });

  test('unauthenticated requests never query the database', async () => {
    const result = await app.inject('/v1/me');
    expect(result.statusCode).toBe(401);
    expect(users.reads).toBe(0);
  });
  test('verified JWT initializes only id/email; subsequent requests do not write', async () => {
    const headers = { authorization: `Bearer ${await token()}` };
    const first = await app.inject({ url: '/v1/me', headers });
    expect(first.statusCode).toBe(200);
    expect(first.json()).toEqual({ user: { id: 'user_alice', email: 'alice@example.com' } });
    await app.inject({ url: '/v1/me', headers });
    expect(users.writes).toBe(1);
    expect(users.reads).toBe(2);
  });
  test('updates email only from a verified changed claim', async () => {
    users.rows.set('user_alice', { id: 'user_alice', email: 'old@example.com' });
    const result = await app.inject({
      url: '/v1/me',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(result.statusCode).toBe(200);
    expect(users.rows.get('user_alice')?.email).toBe('alice@example.com');
  });
  test.each([
    { exp: 1 },
    { nbf: Math.floor(Date.now() / 1000) + 3600 },
    { iss: 'https://different.clerk.accounts.dev' },
    { azp: 'https://attacker.example' },
    { azp: undefined },
    { sid: undefined },
    { sts: 'pending' },
  ])('rejects invalid session claims %j', async (claims) => {
    const result = await app.inject({
      url: '/v1/me',
      headers: { authorization: `Bearer ${await token(claims)}` },
    });
    expect(result.statusCode).toBe(401);
    expect(users.reads).toBe(0);
  });
  test('rejects a tampered signature', async () => {
    const signed = await token();
    const parts = signed.split('.');
    parts[2] = 'A'.repeat(parts[2]!.length);
    const result = await app.inject({
      url: '/v1/me',
      headers: { authorization: `Bearer ${parts.join('.')}` },
    });
    expect(result.statusCode).toBe(401);
  });
  test.each([undefined, '', 123, 'not-an-email'])(
    'requires a valid email claim: %j',
    async (email) => {
      const result = await app.inject({
        url: '/v1/me',
        headers: { authorization: `Bearer ${await token({ email })}` },
      });
      expect(result.statusCode).toBe(400);
      expect(result.json().error.code).toBe('EMAIL_CLAIM_REQUIRED');
      expect(users.reads).toBe(0);
    },
  );
  test('database failures return a safe 503', async () => {
    users.find = async () => {
      throw new Error('postgresql://private:password@host');
    };
    const result = await app.inject({
      url: '/v1/me',
      headers: { authorization: `Bearer ${await token()}` },
    });
    expect(result.statusCode).toBe(503);
    expect(result.body).not.toContain('password');
  });
  test('recovers only the P2002 first-request race', async () => {
    const identity = { id: 'user_alice', email: 'alice@example.com' };
    users.upsert = async () => {
      users.rows.set(identity.id, identity);
      throw { code: 'P2002' };
    };
    expect(await syncUser(users, identity)).toEqual(identity);
    users.rows.clear();
    users.upsert = async () => {
      throw { code: 'P1001' };
    };
    await expect(syncUser(users, identity)).rejects.toMatchObject({ code: 'DATABASE_UNAVAILABLE' });
  });
  test('different users only receive their own profile', async () => {
    const result = await app.inject({
      url: '/v1/me?userId=user_alice',
      headers: {
        authorization: `Bearer ${await token({ sub: 'user_bob', email: 'bob@example.com' })}`,
      },
    });
    expect(result.json().user.id).toBe('user_bob');
  });
});
