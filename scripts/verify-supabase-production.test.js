import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it, vi } from 'vitest';

import {
  parseSupabaseOrigin,
  parseVerificationInputs,
  requestBoundedJson,
  runSupabaseProductionVerification,
  safeFailureMessage,
  SupabaseVerificationError,
  validateAnonymousEmptyResult,
  validateSignupSettings,
} from './verify-supabase-production.mjs';

const SUPABASE_URL = 'https://project-ref.supabase.co';
const ANON_KEY = 'public-anon-key-for-tests';
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const RUNBOOKS = ['DEPLOYMENT.md', 'docs/GO_LIVE.md'].map((path) => ({
  path,
  content: readFileSync(resolve(ROOT, path), 'utf8'),
}));

function jsonResponse(value, init = {}) {
  return new Response(JSON.stringify(value), {
    status: 200,
    headers: { 'content-type': 'application/json' },
    ...init,
  });
}

function successfulFetch() {
  return vi.fn(async (url) => {
    if (url.pathname === '/auth/v1/settings') {
      return jsonResponse({ disable_signup: true, unrelated: 'ignored' });
    }
    return jsonResponse([]);
  });
}

describe('Supabase verification input safety', () => {
  it.each([
    ['https://abc.supabase.co', 'https://abc.supabase.co/'],
    ['https://project-ref.supabase.co/', 'https://project-ref.supabase.co/'],
  ])('accepts a strict Supabase HTTPS origin', (value, expected) => {
    expect(parseSupabaseOrigin(value).href).toBe(expected);
  });

  it.each([
    'http://abc.supabase.co',
    'https://supabase.co',
    'https://abc.supabase.com',
    'https://user:password@abc.supabase.co',
    'https://abc.supabase.co/rest/v1',
    'https://abc.supabase.co?key=secret-query',
    'https://abc.supabase.co#secret-fragment',
    'https://abc.supabase.co:8443',
    'https://abc.supabase.co.evil.example',
  ])('rejects an unsafe origin without echoing it', (value) => {
    let failure;
    try {
      parseSupabaseOrigin(value);
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(SupabaseVerificationError);
    expect(failure.message).not.toContain(value);
    expect(failure.message).not.toMatch(/secret-query|secret-fragment|password/);
  });

  it('accepts URL input from the environment or CLI and keeps the key environment-only', () => {
    expect(
      parseVerificationInputs([], {
        SUPABASE_VERIFY_URL: SUPABASE_URL,
        SUPABASE_VERIFY_ANON_KEY: ANON_KEY,
      })
    ).toMatchObject({ anonKey: ANON_KEY });
    expect(
      parseVerificationInputs(['--url', SUPABASE_URL], {
        SUPABASE_VERIFY_ANON_KEY: ANON_KEY,
      }).url.href
    ).toBe(`${SUPABASE_URL}/`);
  });

  it('rejects missing, whitespace, ambiguous, and unknown inputs', () => {
    expect(() => parseVerificationInputs([], {})).toThrow('verification URL is required');
    expect(() =>
      parseVerificationInputs([SUPABASE_URL], { SUPABASE_VERIFY_ANON_KEY: ' ' })
    ).toThrow('SUPABASE_VERIFY_ANON_KEY is required');
    expect(() =>
      parseVerificationInputs(['--url', SUPABASE_URL, SUPABASE_URL], {
        SUPABASE_VERIFY_ANON_KEY: ANON_KEY,
      })
    ).toThrow('exactly one');
    expect(() =>
      parseVerificationInputs(['--key=unsafe'], {
        SUPABASE_VERIFY_URL: SUPABASE_URL,
        SUPABASE_VERIFY_ANON_KEY: ANON_KEY,
      })
    ).toThrow('Unknown Supabase verifier option');
  });
});

describe('read-only response validation', () => {
  it('confirms only an explicit disabled-signup setting', () => {
    expect(validateSignupSettings({ disable_signup: true })).toBe(true);
    expect(() => validateSignupSettings({ disable_signup: false })).toThrow(
      'not confirmed disabled'
    );
    expect(() => validateSignupSettings([])).toThrow('unexpected shape');
  });

  it('observes empty anonymous table results and rejects visible rows', () => {
    expect(validateAnonymousEmptyResult([], 'nurses')).toBe(true);
    expect(() => validateAnonymousEmptyResult([{ id: 'must-not-be-logged' }], 'nurses')).toThrow(
      'Anonymous nurses access returned rows.'
    );
    expect(() => validateAnonymousEmptyResult({}, 'profiles')).toThrow('was not an array');
  });

  it('verifies auth settings, nurses, and profiles without outputting bodies or keys', async () => {
    const fetchImpl = successfulFetch();
    const logger = { log: vi.fn() };

    await expect(
      runSupabaseProductionVerification({
        supabaseUrl: SUPABASE_URL,
        anonKey: ANON_KEY,
        fetchImpl,
        logger,
      })
    ).resolves.toEqual({ ok: true, checks: 3, origin: SUPABASE_URL });

    const output = logger.log.mock.calls.flat().join('\n');
    expect(output).toContain('public signups are disabled');
    expect(output).toContain('no anonymous rows observed');
    expect(output).toContain('"No anonymous rows observed" does not prove RLS denial');
    expect(output).toContain('authenticated sessions');
    expect(output).toContain('application failure handling');
    expect(output).toContain('telemetry');
    expect(output).toContain('store isolation');
    expect(output).toContain('migration 0008');
    expect(output).toContain('authenticated policies');
    expect(output).not.toContain('Nurse Requirements');
    expect(output).not.toContain(ANON_KEY);
    expect(output).not.toContain('unrelated');
    expect(output).not.toContain('?select=');
  });

  it('fails when either anonymous query returns a non-empty result without logging rows', async () => {
    const rowMarker = 'private-row-value';
    const fetchImpl = vi.fn(async (url) => {
      if (url.pathname === '/auth/v1/settings') return jsonResponse({ disable_signup: true });
      if (url.pathname === '/rest/v1/nurses') return jsonResponse([{ id: rowMarker }]);
      return jsonResponse([]);
    });
    const logger = { log: vi.fn() };

    let failure;
    try {
      await runSupabaseProductionVerification({
        supabaseUrl: SUPABASE_URL,
        anonKey: ANON_KEY,
        fetchImpl,
        logger,
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toMatchObject({ code: 'ANONYMOUS_ROWS_VISIBLE' });
    expect(safeFailureMessage(failure)).not.toContain(rowMarker);
    expect(logger.log.mock.calls.flat().join('\n')).not.toContain(rowMarker);
  });

  it.each([
    [400, 'SCHEMA_UNAVAILABLE'],
    [404, 'SCHEMA_UNAVAILABLE'],
  ])('normalizes missing table/column status %s', async (status, code) => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response('{"message":"raw backend table detail"}', {
        status,
        headers: { 'content-type': 'application/json' },
      })
    );

    await expect(
      requestBoundedJson({
        fetchImpl,
        url: new URL('/rest/v1/nurses?select=missing', SUPABASE_URL),
        anonKey: ANON_KEY,
        checkId: 'nurses-anonymous',
      })
    ).rejects.toMatchObject({ code });
  });
});

describe('bounded request and redaction guarantees', () => {
  it('uses only credential-free GET with the two in-memory anon headers', async () => {
    const fetchImpl = successfulFetch();

    await runSupabaseProductionVerification({
      supabaseUrl: SUPABASE_URL,
      anonKey: ANON_KEY,
      fetchImpl,
      logger: { log: vi.fn() },
    });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls.map(([url]) => url.pathname)).toEqual([
      '/auth/v1/settings',
      '/rest/v1/nurses',
      '/rest/v1/profiles',
    ]);
    for (const [, init] of fetchImpl.mock.calls) {
      expect(init).toMatchObject({
        method: 'GET',
        redirect: 'error',
        credentials: 'omit',
        referrerPolicy: 'no-referrer',
        headers: {
          accept: 'application/json',
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
        },
      });
      expect(init.body).toBeUndefined();
      expect(init.headers.cookie).toBeUndefined();
    }
  });

  it('aborts a request after the configured timeout', async () => {
    const fetchImpl = vi.fn(
      (_url, { signal }) =>
        new Promise((_resolve, reject) => {
          signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
        })
    );

    await expect(
      requestBoundedJson({
        fetchImpl,
        url: new URL('/auth/v1/settings', SUPABASE_URL),
        anonKey: ANON_KEY,
        checkId: 'auth-settings',
        timeoutMs: 5,
      })
    ).rejects.toMatchObject({ code: 'TIMEOUT' });
  });

  it('rejects oversized bodies before parsing them', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ disable_signup: true, padding: 'x'.repeat(100) }), {
        headers: { 'content-length': '140', 'content-type': 'application/json' },
      })
    );

    await expect(
      requestBoundedJson({
        fetchImpl,
        url: new URL('/auth/v1/settings', SUPABASE_URL),
        anonKey: ANON_KEY,
        checkId: 'auth-settings',
        maxBytes: 32,
      })
    ).rejects.toMatchObject({ code: 'BODY_TOO_LARGE' });
  });

  it('redacts raw backend, URL query, key, header, and unexpected error details', async () => {
    const sensitive = `${ANON_KEY} raw-row Authorization Bearer ?select=id`;
    const fetchImpl = vi.fn(async () => {
      throw new Error(sensitive);
    });

    let failure;
    try {
      await runSupabaseProductionVerification({
        supabaseUrl: SUPABASE_URL,
        anonKey: ANON_KEY,
        fetchImpl,
        logger: { log: vi.fn() },
      });
    } catch (error) {
      failure = error;
    }

    expect(safeFailureMessage(failure)).toBe('Supabase production verification request failed.');
    expect(safeFailureMessage(failure)).not.toContain(sensitive);
    expect(safeFailureMessage(new Error(sensitive))).toBe(
      'Supabase production verification failed unexpectedly.'
    );
  });
});

describe('Supabase production runbook safety', () => {
  it.each(RUNBOOKS)('$path does not show an inline anon-key assignment', ({ content }) => {
    expect(content).not.toMatch(/SUPABASE_VERIFY_ANON_KEY\s*=\s*["']?<[^>\n]+>["']?/);
  });

  it.each(RUNBOOKS)('$path does not claim an empty anonymous result proves RLS', ({ content }) => {
    expect(content).not.toMatch(
      /(?:empty (?:anonymous )?(?:arrays?|responses?|results?)|no anonymous rows observed)[^.\n]*(?<!not )(?<!does not )(?:proves?|confirms?|establishes?)\s+(?:that\s+)?RLS/i
    );
    expect(content).not.toContain('Nurse Management Requirements');
  });
});
