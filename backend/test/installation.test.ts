import { afterEach, beforeEach, describe, expect, test } from 'bun:test';
import { createHash, randomBytes } from 'node:crypto';
import { InstallationService } from '../src/services/installation.service';

describe('Single-use installation handoff', () => {
  let now: number;
  let service: InstallationService;
  const user = { id: 'user_alice', email: 'alice@example.com' };
  const verifier = randomBytes(32).toString('base64url');
  const challenge = createHash('sha256').update(verifier).digest('base64url');
  beforeEach(() => {
    now = 1000;
    service = new InstallationService(() => now, 2);
  });
  afterEach(() => service.dispose());

  test('requires approval and consumes the approved identity once', () => {
    const installation = service.start(challenge);
    expect(service.exchange(installation.id, verifier)).toEqual({ status: 'pending' });
    service.approve(installation.id, installation.confirmationCode, user);
    expect(service.exchange(installation.id, verifier)).toEqual({
      status: 'activated',
      user,
      activatedAt: now,
    });
    expect(() => service.exchange(installation.id, verifier)).toThrow(
      'expired or was already used',
    );
  });
  test('wrong proof cannot redeem or destroy the legitimate request', () => {
    const installation = service.start(challenge);
    service.approve(installation.id, installation.confirmationCode, user);
    expect(() => service.exchange(installation.id, 'wrong verifier')).toThrow('proof is invalid');
    expect(service.exchange(installation.id, verifier).status).toBe('activated');
  });
  test('expired approvals cannot activate an installation', () => {
    const installation = service.start(challenge);
    service.approve(installation.id, installation.confirmationCode, user);
    now += 300000;
    expect(() => service.exchange(installation.id, verifier)).toThrow('expired');
    expect(() => service.inspect(installation.id)).toThrow('expired');
  });
  test('confirmation must match and another user cannot replace approval', () => {
    const installation = service.start(challenge);
    expect(() => service.approve(installation.id, '0000-0000', user)).toThrow('does not match');
    service.approve(installation.id, installation.confirmationCode, user);
    expect(() =>
      service.approve(installation.id, installation.confirmationCode, {
        id: 'user_other',
        email: 'other@example.com',
      }),
    ).toThrow('another account');
    expect(service.inspect(installation.id)).not.toHaveProperty('user');
  });
  test('bounded storage frees expired slots and shutdown invalidates requests', () => {
    service.start(challenge);
    service.start(challenge);
    expect(() => service.start(challenge)).toThrow('Too many installations');
    now += 300000;
    const installation = service.start(challenge);
    service.dispose();
    expect(() => service.inspect(installation.id)).toThrow('expired');
  });
});
