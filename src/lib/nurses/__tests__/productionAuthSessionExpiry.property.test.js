import { describe, expect, it, vi } from 'vitest';

import { assertAsyncProperty, fc } from '../../../test/pbt';
import { createNurseRepository } from '../nurseRepository';

const { independentGetSession } = vi.hoisted(() => ({
  independentGetSession: vi.fn(),
}));

vi.mock('../../auth', () => ({
  getSession: (...args) => independentGetSession(...args),
  isSessionExpired: (session) =>
    !session ||
    (typeof session.expires_at === 'number' && Date.now() >= session.expires_at * 1000),
}));

const activeReadinessArbitrary = fc.record({
  authEpoch: fc.integer({ min: 1, max: 10_000 }),
  userId: fc.uuid(),
  token: fc
    .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz0123456789._-'), {
      minLength: 16,
      maxLength: 48,
    })
    .map((characters) => characters.join('')),
  repeatedSignIn: fc.boolean(),
});

describe('production auth session expiry readiness property', () => {
  /**
   * Property 1: Bug Condition - Shared Readiness Authorizes First and Repeated Sign-In
   *
   * **Validates: Requirements 2.1, 2.2, 2.3**
   */
  it('authorizes every active clean or repeated sign-in epoch without an independent session read', async () => {
    await assertAsyncProperty(activeReadinessArbitrary, async (generated) => {
      independentGetSession.mockClear();
      const epoch = generated.authEpoch + (generated.repeatedSignIn ? 1 : 0);
      const session = {
        access_token: generated.token,
        expires_at: Math.floor(Date.now() / 1000) + 3600,
        user: { id: generated.userId },
      };
      const requireActiveSession = vi.fn(async () => ({
        session,
        userId: generated.userId,
        authEpoch: epoch,
        error: null,
      }));
      const list = vi.fn(async () => ({
        data: [{ id: 'server-confirmed', version: 2 }],
        error: null,
        total: 1,
      }));
      const repository = createNurseRepository({
        operations: { list },
        supabase: true,
        requireActiveSession,
      });

      const result = await repository.listAll();

      expect(result).toEqual({
        status: 'ok',
        nurses: [{ id: 'server-confirmed', version: 2 }],
        total: 1,
      });
      expect(requireActiveSession).toHaveBeenCalledTimes(1);
      expect(list).toHaveBeenCalledTimes(1);
      expect(independentGetSession).not.toHaveBeenCalled();
      expect(JSON.stringify(result)).not.toContain(generated.token);
    });
  });
});
