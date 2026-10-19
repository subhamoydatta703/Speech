import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import type { User } from '@speech/contracts';
import { ApiError } from '../lib/errors';

const LIFETIME_MS = 5 * 60 * 1000;
export const INSTALLATION_POLL_SECONDS = 3;

type PendingInstallation = {
  challenge: string;
  confirmationCode: string;
  expiresAt: number;
  user?: User;
  timer: ReturnType<typeof setTimeout>;
};

/** Short-lived setup transactions, not persistent device sessions or API credentials. */
export class InstallationService {
  private pending = new Map<string, PendingInstallation>();

  constructor(
    private now = Date.now,
    private capacity = 1000,
  ) {}

  start(challenge: string) {
    this.pruneExpired();
    if (this.pending.size >= this.capacity) {
      throw new ApiError(503, 'BUSY', 'Too many installations are pending. Try again later.', true);
    }
    const id = randomBytes(32).toString('base64url');
    const code = randomBytes(4).toString('hex').toUpperCase();
    const confirmationCode = `${code.slice(0, 4)}-${code.slice(4)}`;
    const expiresAt = this.now() + LIFETIME_MS;
    const timer = setTimeout(() => this.remove(id), LIFETIME_MS);
    timer.unref();
    this.pending.set(id, { challenge, confirmationCode, expiresAt, timer });
    return { id, confirmationCode, expiresAt, pollIntervalSeconds: INSTALLATION_POLL_SECONDS };
  }

  inspect(id: string) {
    const entry = this.get(id);
    // Do not disclose the approving account or the installer's verifier/challenge.
    return { id, confirmationCode: entry.confirmationCode, expiresAt: entry.expiresAt };
  }

  approve(id: string, confirmationCode: string, user: User) {
    const entry = this.get(id);
    if (entry.confirmationCode !== confirmationCode) {
      throw new ApiError(
        400,
        'INVALID_INSTALLATION_PROOF',
        'The installation confirmation code does not match.',
      );
    }
    if (entry.user && entry.user.id !== user.id) {
      throw new ApiError(
        409,
        'INSTALLATION_CONFLICT',
        'This installation was already approved by another account.',
      );
    }
    entry.user = { id: user.id, email: user.email };
  }

  exchange(id: string, verifier: string) {
    const entry = this.get(id);
    const challenge = createHash('sha256').update(verifier).digest('base64url');
    if (!timingSafeEqual(Buffer.from(challenge), Buffer.from(entry.challenge))) {
      throw new ApiError(401, 'INVALID_INSTALLATION_PROOF', 'The installation proof is invalid.');
    }
    if (!entry.user) return { status: 'pending' as const };

    // Consume synchronously before returning so simultaneous exchanges cannot both succeed.
    this.remove(id);
    return { status: 'activated' as const, user: entry.user, activatedAt: this.now() };
  }

  dispose() {
    for (const id of this.pending.keys()) this.remove(id);
  }

  private get(id: string) {
    const entry = this.pending.get(id);
    if (!entry || entry.expiresAt <= this.now()) {
      this.remove(id);
      throw new ApiError(
        410,
        'INSTALLATION_EXPIRED',
        'This installation request expired or was already used. Start setup again.',
        true,
      );
    }
    return entry;
  }

  private pruneExpired() {
    for (const [id, entry] of this.pending) {
      if (entry.expiresAt <= this.now()) this.remove(id);
    }
  }

  private remove(id: string) {
    const entry = this.pending.get(id);
    if (entry) clearTimeout(entry.timer);
    this.pending.delete(id);
  }
}
