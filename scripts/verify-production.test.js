import { describe, expect, it, vi } from 'vitest';

import {
  fetchSpaWithRedirects,
  fetchWithTimeout,
  parseProductionUrl,
  runProductionVerification,
  safeFailureMessage,
  validateRedirectResponse,
  validateSpaResponse,
  VerificationError,
} from './verify-production.mjs';

const CSP =
  "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://*.supabase.co wss://*.supabase.co; worker-src 'self'; frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'";

function secureHeaders(overrides = {}) {
  return {
    'cache-control': 'no-cache, no-store, must-revalidate',
    'content-type': 'text/html; charset=utf-8',
    'content-security-policy': CSP,
    'permissions-policy': 'camera=(), microphone=()',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'strict-transport-security': 'max-age=31536000; includeSubDomains',
    'x-content-type-options': 'nosniff',
    'x-frame-options': 'SAMEORIGIN',
    ...overrides,
  };
}

function spaResponse(overrides = {}) {
  return new Response('<!doctype html><html><body><div id="root"></div></body></html>', {
    status: 200,
    headers: secureHeaders(),
    ...overrides,
  });
}

describe('parseProductionUrl', () => {
  it.each([
    [['https://app.example.com'], {}, 'https://app.example.com/'],
    [['--url', 'https://app.example.com/'], {}, 'https://app.example.com/'],
    [['--url=https://app.example.com'], {}, 'https://app.example.com/'],
    [[], { PRODUCTION_URL: 'https://app.example.com' }, 'https://app.example.com/'],
  ])('accepts positional, --url, or environment input', (argv, env, expected) => {
    expect(parseProductionUrl(argv, env).href).toBe(expected);
  });

  it.each([
    ['http://app.example.com'],
    ['https://user:password@app.example.com'],
    ['https://app.example.com/?token=secret'],
    ['https://app.example.com/#private'],
    ['https://app.example.com/nested'],
  ])('rejects unsafe production URL input without echoing it', (value) => {
    expect(() => parseProductionUrl([value], {})).toThrow(VerificationError);
    try {
      parseProductionUrl([value], {});
    } catch (error) {
      expect(error.message).not.toContain(value);
      expect(error.message).not.toMatch(/password|token=secret|private/);
    }
  });

  it('rejects ambiguous and unknown arguments', () => {
    expect(() => parseProductionUrl(['--url', 'https://a.example', 'https://b.example'], {})).toThrow(
      'Provide exactly one production URL.',
    );
    expect(() => parseProductionUrl(['--verbose'], {})).toThrow('Unknown verifier option.');
  });
});

describe('SPA response and header validation', () => {
  it('accepts successful, non-cacheable SPA HTML with strict security headers', async () => {
    const response = spaResponse();
    const html = await response.clone().text();
    expect(() => validateSpaResponse(response, html, '/nurses')).not.toThrow();
  });

  it.each([
    ['missing no-cache HTML', { 'cache-control': 'public, max-age=60' }, 'caching'],
    ['missing HSTS', { 'strict-transport-security': '' }, 'Strict-Transport-Security'],
    [
      'broad CSP network access',
      { 'content-security-policy': CSP.replace('https://*.supabase.co', 'https:') },
      'broad network source',
    ],
    [
      'missing scoped realtime access',
      { 'content-security-policy': CSP.replace(' wss://*.supabase.co', '') },
      'scoped Supabase',
    ],
  ])('rejects %s', (_name, headerOverrides, expectedMessage) => {
    const response = spaResponse({ headers: secureHeaders(headerOverrides) });
    expect(() => validateSpaResponse(response, '<html><div id="root"></div></html>', '/')).toThrow(
      expectedMessage,
    );
  });

  it('rejects non-HTML and non-SPA responses', () => {
    const json = new Response('{}', {
      status: 200,
      headers: secureHeaders({ 'content-type': 'application/json' }),
    });
    expect(() => validateSpaResponse(json, '{}', '/')).toThrow('expected HTML');

    const plainHtml = spaResponse();
    expect(() => validateSpaResponse(plainHtml, '<html><body>not the app</body></html>', '/')).toThrow(
      'not the application shell',
    );
  });
});

describe('bounded same-origin SPA redirects', () => {
  const productionUrl = new URL('https://app.example.com/');

  it('follows a relative same-origin redirect manually and validates the final SPA', async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, { status: 302, headers: { location: '/signin?return=%2Fnurses' } }),
      )
      .mockResolvedValueOnce(spaResponse());

    await expect(
      fetchSpaWithRedirects(
        fetchImpl,
        new URL('/nurses', productionUrl),
        productionUrl,
      ),
    ).resolves.toBeInstanceOf(Response);
    expect(fetchImpl.mock.calls.map(([url]) => url.href)).toEqual([
      'https://app.example.com/nurses',
      'https://app.example.com/signin?return=%2Fnurses',
    ]);
    for (const [, init] of fetchImpl.mock.calls) {
      expect(init).toMatchObject({
        method: 'GET',
        redirect: 'manual',
        credentials: 'omit',
      });
      expect(init.body).toBeUndefined();
    }
  });

  it.each([
    ['cross-origin', 'https://evil.example/collect?token=unsafe-query'],
    ['HTTPS downgrade', 'http://app.example.com/?token=unsafe-query'],
    ['invalid', 'http://[invalid?token=unsafe-query'],
  ])('rejects a %s redirect without echoing its destination', async (_name, location) => {
    const fetchImpl = vi.fn().mockResolvedValue(
      new Response(null, { status: 302, headers: { location } }),
    );

    let failure;
    try {
      await fetchSpaWithRedirects(fetchImpl, productionUrl, productionUrl);
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(VerificationError);
    expect(failure.message).not.toContain(location);
    expect(failure.message).not.toContain('unsafe-query');
    expect(failure.message).not.toContain('token=');
  });

  it('rejects a redirect with no Location header', async () => {
    const fetchImpl = vi.fn().mockResolvedValue(new Response(null, { status: 302 }));
    await expect(
      fetchSpaWithRedirects(fetchImpl, productionUrl, productionUrl),
    ).rejects.toMatchObject({
      code: 'INVALID_REDIRECT',
      message: 'SPA redirect is missing its destination.',
    });
  });

  it('detects redirect loops', async () => {
    const fetchImpl = vi.fn(async (url) =>
      new Response(null, {
        status: 302,
        headers: { location: url.pathname === '/' ? '/next' : '/' },
      }),
    );
    await expect(
      fetchSpaWithRedirects(fetchImpl, productionUrl, productionUrl),
    ).rejects.toMatchObject({
      code: 'INVALID_REDIRECT',
      message: 'SPA redirect loop detected.',
    });
  });

  it('fails when the redirect hop limit is exceeded', async () => {
    const fetchImpl = vi.fn(async (url) =>
      new Response(null, {
        status: 302,
        headers: { location: `/hop-${Number(url.pathname.split('-')[1] ?? 0) + 1}` },
      }),
    );
    await expect(
      fetchSpaWithRedirects(fetchImpl, productionUrl, productionUrl, {
        maxRedirects: 2,
      }),
    ).rejects.toMatchObject({
      code: 'INVALID_REDIRECT',
      message: 'SPA redirect limit exceeded.',
    });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });
});

describe('HTTP redirect validation', () => {
  const productionUrl = new URL('https://app.example.com/');

  it('accepts an HTTP redirect to the same HTTPS origin', () => {
    const response = new Response(null, {
      status: 308,
      headers: { location: 'https://app.example.com/' },
    });
    expect(() => validateRedirectResponse(response, productionUrl)).not.toThrow();
  });

  it.each([
    [200, 'https://app.example.com/'],
    [302, 'http://app.example.com/'],
    [302, 'https://different.example.com/'],
  ])('rejects status %s redirecting to %s', (status, location) => {
    const response = new Response(null, { status, headers: { location } });
    expect(() => validateRedirectResponse(response, productionUrl)).toThrow(VerificationError);
  });
});

describe('bounded request behavior and safe failures', () => {
  it('aborts a request that exceeds the configured timeout', async () => {
    const fetchImpl = vi.fn((_url, { signal }) =>
      new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      }),
    );

    await expect(fetchWithTimeout(fetchImpl, new URL('https://app.example.com/'), { timeoutMs: 5 })).rejects.toMatchObject({
      code: 'TIMEOUT',
      message: 'Production verification timed out.',
    });
  });

  it('runs only bounded, manual, credential-free read-only GET checks', async () => {
    const fetchImpl = vi.fn(async (url, _init) => {
      if (url.protocol === 'http:') {
        return new Response(null, {
          status: 308,
          headers: { location: 'https://app.example.com/' },
        });
      }
      return spaResponse();
    });
    const logger = { log: vi.fn() };

    await expect(
      runProductionVerification({
        productionUrl: 'https://app.example.com',
        fetchImpl,
        logger,
      }),
    ).resolves.toEqual({ ok: true, origin: 'https://app.example.com', checks: 3 });

    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(fetchImpl.mock.calls.map(([url]) => url.href)).toEqual([
      'https://app.example.com/',
      'https://app.example.com/nurses',
      'http://app.example.com/',
    ]);
    for (const [, init] of fetchImpl.mock.calls) {
      expect(init.method).toBe('GET');
      expect(init.redirect).toBe('manual');
      expect(init.credentials).toBe('omit');
      expect(init.body).toBeUndefined();
    }
  });

  it('never exposes response bodies, request details, or unexpected error text', async () => {
    const secret = 'secret-token-and-query';
    const fetchImpl = vi.fn(async () => {
      throw new Error(`failed URL https://app.example.com/?token=${secret}`);
    });

    let failure;
    try {
      await runProductionVerification({
        productionUrl: 'https://app.example.com',
        fetchImpl,
        logger: { log: vi.fn() },
      });
    } catch (error) {
      failure = error;
    }

    const message = safeFailureMessage(failure);
    expect(message).toBe('Production verification request failed.');
    expect(message).not.toContain(secret);
    expect(message).not.toContain('?');
    expect(safeFailureMessage(new Error(secret))).toBe(
      'Production verification failed unexpectedly.',
    );
  });
});
