import { describe, expect, it, vi } from 'vitest';

import {
  createNurseOperationEvent,
  emitNurseOperationEvent,
  NURSE_OPERATION_EVENT_KEYS,
  NURSE_OPERATION_EVENT_NAME,
} from '../nurseTelemetry';

describe('nurse operation telemetry helper', () => {
  it('constructs a frozen allowlisted event and drops sensitive command data', () => {
    const event = createNurseOperationEvent({
      operation: 'update',
      outcome: 'forbidden',
      backend: 'supabase',
      durationMs: 12.6,
      retryCount: 2,
      requestId: 'request:123',
      payload: { fullName: 'Private Name' },
      ownerId: 'private-owner',
      token: 'secret-token',
      error: new Error('raw database failure'),
      clinicalContent: 'private',
    });

    expect(event).toEqual({
      operation: 'update',
      outcome: 'forbidden',
      backend: 'supabase',
      durationMs: 13,
      retryCount: 2,
      requestId: 'request:123',
    });
    expect(Object.keys(event).every((key) => NURSE_OPERATION_EVENT_KEYS.includes(key))).toBe(true);
    expect(Object.isFrozen(event)).toBe(true);
  });

  it('sanitizes invalid metadata rather than forwarding it', () => {
    expect(
      createNurseOperationEvent({
        operation: 'raw-operation',
        outcome: 'raw-outcome',
        backend: 'raw-backend',
        durationMs: Number.POSITIVE_INFINITY,
        retryCount: -1,
        requestId: 'unsafe/request@id',
      }),
    ).toEqual({
      operation: 'list',
      outcome: 'unknown',
      backend: 'legacy',
      durationMs: 0,
      retryCount: 0,
    });
  });

  it('publishes only the sanitized event through the browser observability hook', () => {
    const listener = vi.fn();
    globalThis.addEventListener(NURSE_OPERATION_EVENT_NAME, listener);

    try {
      const event = emitNurseOperationEvent({
        operation: 'delete',
        outcome: 'success',
        backend: 'legacy',
        durationMs: 4,
        retryCount: 0,
        fullName: 'Must not be emitted',
      });

      expect(listener).toHaveBeenCalledTimes(1);
      expect(listener.mock.calls[0][0].detail).toBe(event);
      expect(listener.mock.calls[0][0].detail).not.toHaveProperty('fullName');
    } finally {
      globalThis.removeEventListener(NURSE_OPERATION_EVENT_NAME, listener);
    }
  });
});
