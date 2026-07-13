import { describe, expect, it } from 'vitest';

import {
  DataError,
  DataErrorCode,
  mapError,
  secureConnectionError,
} from '../errors';

/**
 * Task 2.2 — Data_Layer error mapping.
 *
 * Verifies mapError classifies each Supabase/PostgREST/fetch error shape into a
 * stable DataError code, preserves the original error under `cause`, and that
 * DataError is a proper Error subclass. (Req 6.7, 4.5, 10.2)
 */
describe('dataLayer/errors', () => {
  describe('DataError', () => {
    it('is an Error subclass carrying code, message, and cause', () => {
      const cause = new Error('boom');
      const err = new DataError(DataErrorCode.NETWORK, 'nope', cause);
      expect(err).toBeInstanceOf(Error);
      expect(err).toBeInstanceOf(DataError);
      expect(err.name).toBe('DataError');
      expect(err.code).toBe('NETWORK');
      expect(err.message).toBe('nope');
      expect(err.cause).toBe(cause);
    });

    it('falls back to a safe default message and UNKNOWN for bad codes', () => {
      const err = new DataError('NOT_A_CODE');
      expect(err.code).toBe(DataErrorCode.UNKNOWN);
      expect(err.message).toBeTruthy();
    });
  });

  describe('mapError network / transport failures', () => {
    it('maps fetch "Failed to fetch" TypeError to NETWORK', () => {
      const cause = new TypeError('Failed to fetch');
      const err = mapError(cause);
      expect(err.code).toBe(DataErrorCode.NETWORK);
      expect(err.cause).toBe(cause);
    });

    it('maps AbortError (timeout/abort) to NETWORK', () => {
      const cause = Object.assign(new Error('aborted'), { name: 'AbortError' });
      expect(mapError(cause).code).toBe(DataErrorCode.NETWORK);
    });

    it('maps a timeout message to NETWORK', () => {
      expect(mapError(new Error('Request timed out')).code).toBe(
        DataErrorCode.NETWORK,
      );
    });

    it('maps TLS/secure-connection failures to NETWORK (Req 10.2)', () => {
      const err = mapError(new Error('SSL handshake failed: certificate error'));
      expect(err.code).toBe(DataErrorCode.NETWORK);
    });

    it('secureConnectionError() produces a NETWORK DataError with cause', () => {
      const cause = new Error('tls');
      const err = secureConnectionError(cause);
      expect(err.code).toBe(DataErrorCode.NETWORK);
      expect(err.cause).toBe(cause);
      expect(err.message).toMatch(/secure connection/i);
    });

    it('honours the secureConnectionFailed context hint', () => {
      const err = mapError(new Error('anything'), { secureConnectionFailed: true });
      expect(err.code).toBe(DataErrorCode.NETWORK);
      expect(err.message).toMatch(/secure connection/i);
    });
  });

  describe('mapError auth failures', () => {
    it('maps HTTP 401 to AUTH', () => {
      expect(mapError({ status: 401, message: 'Unauthorized' }).code).toBe(
        DataErrorCode.AUTH,
      );
    });

    it('maps an expired-JWT message to AUTH', () => {
      expect(mapError({ message: 'JWT expired' }).code).toBe(DataErrorCode.AUTH);
    });
  });

  describe('mapError authorization failures (FORBIDDEN)', () => {
    it('maps HTTP 403 to FORBIDDEN (Req 4.5)', () => {
      expect(mapError({ status: 403, message: 'forbidden' }).code).toBe(
        DataErrorCode.FORBIDDEN,
      );
    });

    it('maps Postgres 42501 (RLS / insufficient_privilege) to FORBIDDEN', () => {
      const err = mapError({ code: '42501', message: 'permission denied for table nurses' });
      expect(err.code).toBe(DataErrorCode.FORBIDDEN);
    });
  });

  describe('mapError validation failures', () => {
    it('maps Postgres 23502 (not-null) to VALIDATION', () => {
      expect(mapError({ code: '23502', message: 'null value' }).code).toBe(
        DataErrorCode.VALIDATION,
      );
    });

    it('maps Postgres 23514 (check constraint) to VALIDATION', () => {
      expect(mapError({ code: '23514', message: 'check violation' }).code).toBe(
        DataErrorCode.VALIDATION,
      );
    });

    it('maps Postgres 23503 (foreign key) to VALIDATION', () => {
      expect(mapError({ code: '23503', message: 'fk violation' }).code).toBe(
        DataErrorCode.VALIDATION,
      );
    });

    it('maps HTTP 422 to VALIDATION', () => {
      expect(mapError({ status: 422, message: 'unprocessable' }).code).toBe(
        DataErrorCode.VALIDATION,
      );
    });
  });

  describe('mapError conflict detection', () => {
    it('maps Postgres 23505 (unique_violation) to CONFLICT', () => {
      const err = mapError({ code: '23505', message: 'duplicate key value' });
      expect(err.code).toBe(DataErrorCode.CONFLICT);
    });

    it('maps HTTP 409 to CONFLICT', () => {
      expect(mapError({ status: 409, message: 'conflict' }).code).toBe(
        DataErrorCode.CONFLICT,
      );
    });

    it('maps an explicit conflict marker to CONFLICT', () => {
      expect(mapError({ conflict: { current: {} } }).code).toBe(
        DataErrorCode.CONFLICT,
      );
    });
  });

  describe('mapError unknown / passthrough', () => {
    it('maps an unrecognized error to UNKNOWN and preserves cause', () => {
      const cause = { weird: true };
      const err = mapError(cause);
      expect(err.code).toBe(DataErrorCode.UNKNOWN);
      expect(err.cause).toBe(cause);
    });

    it('is idempotent for an already-mapped DataError', () => {
      const original = new DataError(DataErrorCode.FORBIDDEN, 'x', null);
      expect(mapError(original)).toBe(original);
    });

    it('does not leak the raw driver message into the user-facing message', () => {
      const err = mapError({ code: '23505', message: 'duplicate key value violates unique constraint "nurses_pkey"' });
      expect(err.message).not.toMatch(/nurses_pkey/);
    });
  });
});
