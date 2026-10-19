import { ApiError } from '../lib/errors';

import type { User } from '@speech/contracts';
export type { User } from '@speech/contracts';
export interface UserRepository {
  find(id: string): Promise<User | null>;
  upsert(user: User): Promise<User>;
  ready(): Promise<void>;
  close(): Promise<void>;
}

/** Database fast path; writes only for first sign-in or a changed verified email. */
export async function syncUser(repository: UserRepository, user: User): Promise<User> {
  try {
    const existing = await repository.find(user.id);
    if (existing?.email === user.email) return existing;
    try {
      return await repository.upsert(user);
    } catch (error) {
      // Only a unique-key race is recoverable by reading the winning row.
      if (error && typeof error === 'object' && 'code' in error && error.code === 'P2002') {
        const winner = await repository.find(user.id);
        if (winner?.email === user.email) return winner;
      }
      throw error;
    }
  } catch {
    throw new ApiError(
      503,
      'DATABASE_UNAVAILABLE',
      'The user profile service is temporarily unavailable.',
      true,
    );
  }
}
