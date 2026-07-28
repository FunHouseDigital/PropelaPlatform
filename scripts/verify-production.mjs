#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

export const DEFAULT_TIMEOUT_MS = 10_000;
export const MAX_HTML_BYTES = 512 * 1024;
export const MAX_SPA_REDIRECTS = 5;
export const SPA_PATHS = Object.freeze(['/', '/nurses']);

const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const REQUIRED_HEADERS = Object.freeze({
  'x-content-type-options': (value) => value.toLowerCase() === 'nosniff',
  'x-frame-options': (value) => ['deny', 'sameorigin'].includes(value.toLowerCase()),
  'referrer-policy': (value) => value.trim().length > 0,
  'permissions-policy': (value) => value.trim().length > 0,
});

export class VerificationError extends Error {
  constructor(message, code = 'VERIFICATION_FAILED') {
    super(message);
    this.name = 'VerificationError';
    this.code = code;
  }
}

function fail(message, code) {
  throw new VerificationError(message, code);
}

export function parseProductionUrl(argv = process.argv.slice(2), env = process.env) {
  let optionValue;
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (typeof argument !== 'string') {
      fail('Provide exactly one production URL.', 'INVALID_URL_ARGUMENT');
    }
    if (argument === '--url') {
      if (optionValue !== undefined || index + 1 >= argv.length) {
        fail('Provide exactly one production URL.', 'INVALID_URL_ARGUMENT');
      }
      optionValue = argv[index + 1];
      index += 1;
    } else if (argument.startsWith('--url=')) {
      if (optionValue !== undefined) {
        fail('Provide exactly one production URL.', 'INVALID_URL_ARGUMENT');
      }
      optionValue = argument.slice('--url='.length);
    } else if (argument.startsWith('-')) {
      fail('Unknown verifier option.', 'INVALID_URL_ARGUMENT');
    } else {
      positional.push(argument);
    }
  }

  if (positional.length > 1 || (optionValue !== undefined && positional.length > 0)) {
    fail('Provide exactly one production URL.', 'INVALID_URL_ARGUMENT');
  }

  const rawValue = optionValue ?? positional[0] ?? env.PRODUCTION_URL;
  if (typeof rawValue !== 'string' || rawValue.trim() === '') {
    fail(
      'A production URL is required via --url, a positional argument, or PRODUCTION_URL.',
      'MISSING_URL',
    );
  }

  let parsed;
  try {
    parsed = new URL(rawValue.trim());
  } catch {
    fail('The production URL is invalid.', 'INVALID_URL');
  }

  if (parsed.protocol !== 'https:') {
    fail('The production URL must use HTTPS.', 'INSECURE_URL');
  }
  if (parsed.username || parsed.password) {
    fail('The production URL must not contain credentials.', 'UNSAFE_URL');
  }
  if (parsed.search || parsed.hash) {
    fail('The production URL must not contain a query string or fragment.', 'UNSAFE_URL');
  }
  if (parsed.pathname !== '/' && parsed.pathname !== '') {
    fail('The production URL must identify the site origin, without a path.', 'UNSAFE_URL');
  }

  return new URL(`${parsed.origin}/`);
}

export function parseCsp(value) {
  const directives = new Map();
  for (const segment of String(value ?? '').split(';')) {
    const tokens = segment.trim().split(/\s+/).filter(Boolean);
    if (tokens.length === 0) continue;
    const [name, ...sources] = tokens;
    const normalizedName = name.toLowerCase();
    if (directives.has(normalizedName)) {
      fail('Content-Security-Policy contains a duplicate directive.', 'INVALID_CSP');
    }
    directives.set(normalizedName, sources);
  }
  return directives;
}

function requireExactDirective(directives, name, expected) {
  const actual = directives.get(name);
  if (!actual || actual.length !== expected.length || expected.some((item) => !actual.includes(item))) {
    fail(`Content-Security-Policy has an unsafe ${name} directive.`, 'INVALID_CSP');
  }
}

export function validateCsp(value) {
  const directives = parseCsp(value);
  requireExactDirective(directives, 'default-src', ["'self'"]);
  requireExactDirective(directives, 'script-src', ["'self'"]);
  requireExactDirective(directives, 'object-src', ["'none'"]);
  requireExactDirective(directives, 'base-uri', ["'self'"]);
  requireExactDirective(directives, 'form-action', ["'self'"]);

  const frameAncestors = directives.get('frame-ancestors');
  if (
    !frameAncestors ||
    frameAncestors.length !== 1 ||
    !["'self'", "'none'"].includes(frameAncestors[0])
  ) {
    fail('Content-Security-Policy has an unsafe frame-ancestors directive.', 'INVALID_CSP');
  }

  const forbiddenBroadSources = new Set(['*', 'http:', 'https:', 'ws:', 'wss:']);
  for (const sources of directives.values()) {
    if (sources.some((source) => forbiddenBroadSources.has(source.toLowerCase()))) {
      fail('Content-Security-Policy contains a broad network source.', 'INVALID_CSP');
    }
  }

  const connectSources = directives.get('connect-src') ?? [];
  for (const required of ["'self'", 'https://*.supabase.co', 'wss://*.supabase.co']) {
    if (!connectSources.includes(required)) {
      fail('Content-Security-Policy is missing a scoped Supabase connection source.', 'INVALID_CSP');
    }
  }

  return directives;
}

export function validateSecurityHeaders(headers) {
  for (const [name, validator] of Object.entries(REQUIRED_HEADERS)) {
    const value = headers.get(name);
    if (!value || !validator(value)) {
      fail(`Required security header ${name} is missing or invalid.`, 'INVALID_HEADERS');
    }
  }

  const hsts = headers.get('strict-transport-security') ?? '';
  const maxAge = hsts.match(/(?:^|;)\s*max-age=(\d+)/i);
  if (!maxAge || Number(maxAge[1]) < 31_536_000 || !/includeSubDomains/i.test(hsts)) {
    fail('Strict-Transport-Security is missing or too weak.', 'INVALID_HEADERS');
  }

  const csp = headers.get('content-security-policy');
  if (!csp) {
    fail('Content-Security-Policy is missing.', 'INVALID_HEADERS');
  }
  validateCsp(csp);
}

export function validateSpaResponse(response, html, route = '/') {
  if (!response.ok) {
    fail(`SPA check failed for ${route}: expected a successful response.`, 'INVALID_RESPONSE');
  }

  const contentType = response.headers.get('content-type') ?? '';
  if (!/^text\/html(?:\s*;|$)/i.test(contentType)) {
    fail(`SPA check failed for ${route}: expected HTML.`, 'INVALID_RESPONSE');
  }

  const cacheControl = (response.headers.get('cache-control') ?? '').toLowerCase();
  for (const directive of ['no-cache', 'no-store', 'must-revalidate']) {
    if (!cacheControl.split(',').some((part) => part.trim().startsWith(directive))) {
      fail(`SPA check failed for ${route}: HTML caching is not disabled.`, 'INVALID_CACHE');
    }
  }

  if (!/<html(?:\s|>)/i.test(html) || !/<div\s+[^>]*id=["']root["'][^>]*>/i.test(html)) {
    fail(`SPA check failed for ${route}: response is not the application shell.`, 'INVALID_HTML');
  }

  validateSecurityHeaders(response.headers);
}

export function resolveSpaRedirect(response, currentUrl, productionUrl) {
  const location = response.headers.get('location');
  if (!location) {
    fail('SPA redirect is missing its destination.', 'INVALID_REDIRECT');
  }

  let destination;
  try {
    destination = new URL(location, currentUrl);
  } catch {
    fail('SPA redirect destination is invalid.', 'INVALID_REDIRECT');
  }

  if (
    destination.protocol !== 'https:' ||
    destination.origin !== productionUrl.origin ||
    destination.username ||
    destination.password
  ) {
    fail('SPA redirect must stay on the production HTTPS origin.', 'INVALID_REDIRECT');
  }

  // Fragments are not sent in HTTP requests and must not provide a way to
  // evade loop detection.
  destination.hash = '';
  return destination;
}

export async function fetchSpaWithRedirects(
  fetchImpl,
  routeUrl,
  productionUrl,
  {
    timeoutMs = DEFAULT_TIMEOUT_MS,
    maxHtmlBytes = MAX_HTML_BYTES,
    maxRedirects = MAX_SPA_REDIRECTS,
    route = routeUrl.pathname,
  } = {},
) {
  let currentUrl = new URL(routeUrl);
  const visited = new Set([currentUrl.href]);

  for (let redirectCount = 0; ; redirectCount += 1) {
    const result = await fetchWithTimeout(fetchImpl, currentUrl, {
      timeoutMs,
      init: {
        method: 'GET',
        redirect: 'manual',
        credentials: 'omit',
        headers: { accept: 'text/html' },
      },
      consume: async (response) => {
        if (!REDIRECT_STATUSES.has(response.status)) {
          const html = await readBodyLimited(response, maxHtmlBytes);
          validateSpaResponse(response, html, route);
          return { response };
        }

        if (redirectCount >= maxRedirects) {
          await response.body?.cancel();
          fail('SPA redirect limit exceeded.', 'INVALID_REDIRECT');
        }

        const destination = resolveSpaRedirect(response, currentUrl, productionUrl);
        await response.body?.cancel();
        return { destination };
      },
    });

    if (result.response) return result.response;
    if (visited.has(result.destination.href)) {
      fail('SPA redirect loop detected.', 'INVALID_REDIRECT');
    }

    visited.add(result.destination.href);
    currentUrl = result.destination;
  }
}

export function validateRedirectResponse(response, productionUrl) {
  if (!REDIRECT_STATUSES.has(response.status)) {
    fail('HTTP check did not return a permanent or temporary redirect.', 'INVALID_REDIRECT');
  }

  const location = response.headers.get('location');
  if (!location) {
    fail('HTTP redirect is missing its destination.', 'INVALID_REDIRECT');
  }

  let destination;
  try {
    destination = new URL(location, productionUrl);
  } catch {
    fail('HTTP redirect destination is invalid.', 'INVALID_REDIRECT');
  }

  if (
    destination.protocol !== 'https:' ||
    destination.host !== productionUrl.host ||
    destination.username ||
    destination.password
  ) {
    fail('HTTP redirect does not safely target the production HTTPS origin.', 'INVALID_REDIRECT');
  }
}

export async function readBodyLimited(response, maxBytes = MAX_HTML_BYTES) {
  if (!response.body || typeof response.body.getReader !== 'function') {
    const body = await response.text();
    if (Buffer.byteLength(body, 'utf8') > maxBytes) {
      fail('HTML response exceeded the verifier size limit.', 'BODY_TOO_LARGE');
    }
    return body;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let body = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel();
        fail('HTML response exceeded the verifier size limit.', 'BODY_TOO_LARGE');
      }
      body += decoder.decode(value, { stream: true });
    }
    body += decoder.decode();
    return body;
  } finally {
    reader.releaseLock();
  }
}

export async function fetchWithTimeout(
  fetchImpl,
  url,
  { timeoutMs = DEFAULT_TIMEOUT_MS, init = {}, consume = async (response) => response } = {},
) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, { ...init, signal: controller.signal });
    return await consume(response);
  } catch (error) {
    if (controller.signal.aborted) {
      fail('Production verification timed out.', 'TIMEOUT');
    }
    if (error instanceof VerificationError) throw error;
    fail('Production verification request failed.', 'REQUEST_FAILED');
  } finally {
    clearTimeout(timer);
  }
}

export function safeFailureMessage(error) {
  return error instanceof VerificationError
    ? error.message
    : 'Production verification failed unexpectedly.';
}

export async function runProductionVerification({
  productionUrl,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxHtmlBytes = MAX_HTML_BYTES,
  logger = console,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    fail('This Node.js runtime does not provide fetch.', 'FETCH_UNAVAILABLE');
  }

  if (typeof productionUrl !== 'string' && !(productionUrl instanceof URL)) {
    fail('A production URL is required.', 'MISSING_URL');
  }
  const baseUrl = parseProductionUrl(
    [productionUrl instanceof URL ? productionUrl.href : productionUrl],
    {},
  );

  for (const route of SPA_PATHS) {
    const routeUrl = new URL(route, baseUrl);
    await fetchSpaWithRedirects(fetchImpl, routeUrl, baseUrl, {
      timeoutMs,
      maxHtmlBytes,
      route,
    });
    logger.log(`PASS ${route} returned the secured, non-cacheable SPA shell.`);
  }

  const httpUrl = new URL(baseUrl);
  httpUrl.protocol = 'http:';
  await fetchWithTimeout(fetchImpl, httpUrl, {
    timeoutMs,
    init: { method: 'GET', redirect: 'manual', credentials: 'omit' },
    consume: async (response) => validateRedirectResponse(response, baseUrl),
  });
  logger.log('PASS HTTP redirects safely to the HTTPS origin.');
  logger.log(`Production verification passed for ${baseUrl.origin}.`);

  return { ok: true, origin: baseUrl.origin, checks: SPA_PATHS.length + 1 };
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  try {
    const productionUrl = parseProductionUrl(argv, env);
    await runProductionVerification({ productionUrl });
    return 0;
  } catch (error) {
    console.error(`Production verification failed: ${safeFailureMessage(error)}`);
    return 1;
  }
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectExecution) {
  process.exitCode = await main();
}
