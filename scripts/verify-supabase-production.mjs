#!/usr/bin/env node

import { pathToFileURL } from 'node:url';

export const DEFAULT_TIMEOUT_MS = 5_000;
export const MAX_JSON_BYTES = 32 * 1024;

const CHECKS = Object.freeze([
  {
    id: 'auth-settings',
    path: '/auth/v1/settings',
    validate: validateSignupSettings,
    pass: 'PASS auth settings are reachable and public signups are disabled.',
  },
  {
    id: 'nurses-anonymous',
    path: '/rest/v1/nurses?select=id,owner_id,version&limit=1',
    validate: (value) => validateAnonymousEmptyResult(value, 'nurses'),
    pass: 'PASS nurses columns are reachable; no anonymous rows observed.',
  },
  {
    id: 'profiles-anonymous',
    path: '/rest/v1/profiles?select=user_id,role&limit=1',
    validate: (value) => validateAnonymousEmptyResult(value, 'profiles'),
    pass: 'PASS profiles columns are reachable; no anonymous rows observed.',
  },
]);

export class SupabaseVerificationError extends Error {
  constructor(message, code = 'VERIFICATION_FAILED') {
    super(message);
    this.name = 'SupabaseVerificationError';
    this.code = code;
  }
}

function fail(message, code) {
  throw new SupabaseVerificationError(message, code);
}

export function parseSupabaseOrigin(rawValue) {
  if (typeof rawValue !== 'string' || rawValue.trim() === '') {
    fail('A Supabase verification URL is required.', 'MISSING_URL');
  }

  let parsed;
  try {
    parsed = new URL(rawValue.trim());
  } catch {
    fail('The Supabase verification URL is invalid.', 'INVALID_URL');
  }

  if (parsed.protocol !== 'https:') {
    fail('The Supabase verification URL must use HTTPS.', 'INSECURE_URL');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    fail('The Supabase verification URL must be a credential-free origin.', 'UNSAFE_URL');
  }
  if ((parsed.pathname !== '' && parsed.pathname !== '/') || parsed.port) {
    fail('The Supabase verification URL must not contain a path or custom port.', 'UNSAFE_URL');
  }
  if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.supabase\.co$/i.test(parsed.hostname)) {
    fail('The Supabase verification URL must be an HTTPS *.supabase.co origin.', 'UNSAFE_HOST');
  }

  return new URL(`${parsed.origin}/`);
}

export function parseVerificationInputs(argv = process.argv.slice(2), env = process.env) {
  let cliUrl;
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (typeof argument !== 'string') {
      fail('Provide exactly one Supabase verification URL.', 'INVALID_ARGUMENT');
    }
    if (argument === '--url') {
      if (cliUrl !== undefined || index + 1 >= argv.length) {
        fail('Provide exactly one Supabase verification URL.', 'INVALID_ARGUMENT');
      }
      cliUrl = argv[index + 1];
      index += 1;
    } else if (argument.startsWith('--url=')) {
      if (cliUrl !== undefined) {
        fail('Provide exactly one Supabase verification URL.', 'INVALID_ARGUMENT');
      }
      cliUrl = argument.slice('--url='.length);
    } else if (argument.startsWith('-')) {
      fail('Unknown Supabase verifier option.', 'INVALID_ARGUMENT');
    } else {
      positional.push(argument);
    }
  }

  if (positional.length > 1 || (cliUrl !== undefined && positional.length > 0)) {
    fail('Provide exactly one Supabase verification URL.', 'INVALID_ARGUMENT');
  }

  const url = parseSupabaseOrigin(cliUrl ?? positional[0] ?? env.SUPABASE_VERIFY_URL);
  const anonKey = env.SUPABASE_VERIFY_ANON_KEY;
  if (typeof anonKey !== 'string' || anonKey.trim() === '') {
    fail('SUPABASE_VERIFY_ANON_KEY is required.', 'MISSING_ANON_KEY');
  }
  if (/\s/.test(anonKey)) {
    fail('SUPABASE_VERIFY_ANON_KEY is invalid.', 'INVALID_ANON_KEY');
  }

  return { url, anonKey };
}

export function validateSignupSettings(value) {
  if (!value || Array.isArray(value) || typeof value !== 'object') {
    fail('Supabase auth settings returned an unexpected shape.', 'INVALID_SETTINGS');
  }
  if (value.disable_signup !== true) {
    fail('Public Supabase signups are not confirmed disabled.', 'SIGNUPS_NOT_DISABLED');
  }
  return true;
}

export function validateAnonymousEmptyResult(value, resource = 'resource') {
  if (!Array.isArray(value)) {
    fail(`The ${resource} verification response was not an array.`, 'INVALID_TABLE_RESPONSE');
  }
  if (value.length !== 0) {
    fail(`Anonymous ${resource} access returned rows.`, 'ANONYMOUS_ROWS_VISIBLE');
  }
  return true;
}

export async function readBodyLimited(response, maxBytes = MAX_JSON_BYTES) {
  const contentLength = response.headers.get('content-length');
  if (contentLength && Number(contentLength) > maxBytes) {
    await response.body?.cancel();
    fail('A Supabase verification response exceeded the size limit.', 'BODY_TOO_LARGE');
  }

  if (!response.body || typeof response.body.getReader !== 'function') {
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) {
      fail('A Supabase verification response exceeded the size limit.', 'BODY_TOO_LARGE');
    }
    return text;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let bytesRead = 0;
  let text = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > maxBytes) {
        await reader.cancel();
        fail('A Supabase verification response exceeded the size limit.', 'BODY_TOO_LARGE');
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return text;
  } finally {
    reader.releaseLock();
  }
}

function categorizeHttpFailure(status, checkId) {
  if (status === 400 || status === 404) {
    const subject = checkId === 'auth-settings' ? 'endpoint' : 'required table or columns';
    fail(`The Supabase ${subject} is unavailable.`, 'SCHEMA_UNAVAILABLE');
  }
  if (status === 401 || status === 403) {
    fail('The public Supabase verification request was rejected.', 'PUBLIC_ACCESS_REJECTED');
  }
  if (status === 408 || status === 429 || status >= 500) {
    fail('The Supabase service is temporarily unavailable.', 'SERVICE_UNAVAILABLE');
  }
  fail('The Supabase verification request returned an unexpected status.', 'UNEXPECTED_STATUS');
}

export async function requestBoundedJson({
  fetchImpl,
  url,
  anonKey,
  checkId,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxBytes = MAX_JSON_BYTES,
}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      redirect: 'error',
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      headers: {
        accept: 'application/json',
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      await response.body?.cancel();
      categorizeHttpFailure(response.status, checkId);
    }

    const text = await readBodyLimited(response, maxBytes);
    try {
      return JSON.parse(text);
    } catch {
      fail('A Supabase verification response was not valid JSON.', 'INVALID_JSON');
    }
  } catch (error) {
    if (controller.signal.aborted) {
      fail('Supabase production verification timed out.', 'TIMEOUT');
    }
    if (error instanceof SupabaseVerificationError) throw error;
    fail('Supabase production verification request failed.', 'REQUEST_FAILED');
  } finally {
    clearTimeout(timer);
  }
}

export function safeFailureMessage(error) {
  return error instanceof SupabaseVerificationError
    ? error.message
    : 'Supabase production verification failed unexpectedly.';
}

export async function runSupabaseProductionVerification({
  supabaseUrl,
  anonKey,
  fetchImpl = globalThis.fetch,
  timeoutMs = DEFAULT_TIMEOUT_MS,
  maxBytes = MAX_JSON_BYTES,
  logger = console,
} = {}) {
  if (typeof fetchImpl !== 'function') {
    fail('This Node.js runtime does not provide fetch.', 'FETCH_UNAVAILABLE');
  }
  const baseUrl = parseSupabaseOrigin(supabaseUrl instanceof URL ? supabaseUrl.href : supabaseUrl);
  if (typeof anonKey !== 'string' || anonKey.trim() === '' || /\s/.test(anonKey)) {
    fail('A valid Supabase anonymous key is required.', 'INVALID_ANON_KEY');
  }

  for (const check of CHECKS) {
    const value = await requestBoundedJson({
      fetchImpl,
      url: new URL(check.path, baseUrl),
      anonKey,
      checkId: check.id,
      timeoutMs,
      maxBytes,
    });
    check.validate(value);
    logger.log(check.pass);
  }

  logger.log(
    'LIMITATION "No anonymous rows observed" does not prove RLS denial because the tables may be empty. RLS enforcement requires an authorized test with known existing or disposable rows.'
  );
  logger.log(
    'LIMITATION This operational probe cannot establish requirements involving authenticated sessions, application failure handling, telemetry, store isolation, migration 0008, authenticated policies, or nurse CRUD/concurrency/delete behavior.'
  );
  logger.log('Supabase production verification passed.');

  return { ok: true, checks: CHECKS.length, origin: baseUrl.origin };
}

export async function main(argv = process.argv.slice(2), env = process.env) {
  try {
    const { url, anonKey } = parseVerificationInputs(argv, env);
    await runSupabaseProductionVerification({ supabaseUrl: url, anonKey });
    return 0;
  } catch (error) {
    console.error(`Supabase production verification failed: ${safeFailureMessage(error)}`);
    return 1;
  }
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectExecution) {
  process.exitCode = await main();
}
