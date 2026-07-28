/**
 * Data_Layer error mapping (Task 2.2).
 *
 * Translates the many error shapes returned by `supabase-js` / PostgREST /
 * `fetch` into a small, stable `DataError { code, message, cause }` that the UI
 * can branch on deterministically (Req 6.7 — errors are surfaced to the caller,
 * never silently discarded).
 *
 * Design references (see design.md "Error mapping" and the "Error Handling"
 * table):
 *   - NETWORK    connectivity / timeout / abort / TLS-handshake failures
 *   - AUTH       HTTP 401, expired or invalid JWT (Req 3.9)
 *   - FORBIDDEN  HTTP 403 or Postgres 42501 (RLS / insufficient_privilege) —
 *                the authorization-denied path (Req 4.5)
 *   - VALIDATION HTTP 400/422 or Postgres integrity/data constraint classes
 *                (23xxx except unique_violation, 22xxx) (Req 6.5)
 *   - CONFLICT   Postgres 23505 unique_violation used as an optimistic-
 *                concurrency signal, HTTP 409, or an explicit conflict marker
 *                (Req 2.5, 11.3)
 *   - UNKNOWN    anything unrecognized
 *
 * Messages are intentionally generic and user-safe: they never interpolate the
 * raw driver message (which can leak SQL, column names, or internal details).
 * The original error is always preserved under `cause` for logging/debugging.
 */

/**
 * Stable set of Data_Layer error codes. The UI branches on these values.
 * @readonly
 * @enum {string}
 */
export const DataErrorCode = Object.freeze({
  NETWORK: 'NETWORK',
  AUTH: 'AUTH',
  FORBIDDEN: 'FORBIDDEN',
  VALIDATION: 'VALIDATION',
  CONFLICT: 'CONFLICT',
  STORAGE: 'STORAGE',
  UNKNOWN: 'UNKNOWN',
});

/**
 * User-safe messages per code. Deliberately generic so no backend detail leaks
 * to the UI; the underlying error stays under `DataError.cause`.
 * @type {Record<string, string>}
 */
const DEFAULT_MESSAGES = Object.freeze({
  [DataErrorCode.NETWORK]:
    'Unable to reach the server. Check your connection and try again.',
  [DataErrorCode.AUTH]: 'Your session has expired. Please sign in again.',
  [DataErrorCode.FORBIDDEN]: 'You do not have permission to perform this action.',
  [DataErrorCode.VALIDATION]: 'The submitted data is invalid.',
  [DataErrorCode.CONFLICT]:
    'This record was changed since you last loaded it. Reload and try again.',
  [DataErrorCode.STORAGE]:
    'Browser storage is unavailable. Your changes were not saved.',
  [DataErrorCode.UNKNOWN]: 'Something went wrong. Please try again.',
});

/**
 * A stable, user-safe error the Data_Layer returns (never throws across the
 * async boundary — see the result-envelope pattern in design.md). Extends the
 * native `Error` so it interoperates with logging and `instanceof Error`.
 */
export class DataError extends Error {
  /**
   * @param {string} code    One of {@link DataErrorCode}.
   * @param {string} [message] User-safe message (defaults per code).
   * @param {unknown} [cause] The original error, preserved for debugging.
   */
  constructor(code, message, cause) {
    const resolvedCode = DataErrorCode[code] ? code : DataErrorCode.UNKNOWN;
    super(message || DEFAULT_MESSAGES[resolvedCode]);
    this.name = 'DataError';
    this.code = resolvedCode;
    // Keep the original error accessible without leaking it into `message`.
    this.cause = cause;
  }
}

/**
 * Build a DataError for the specific case where a secure (HTTPS/TLS) connection
 * to the Database could not be established (Req 10.2). Classified as NETWORK so
 * the UI treats it like any other connectivity failure while carrying a
 * connection-specific message.
 *
 * @param {unknown} [cause] The underlying transport error, if any.
 * @returns {DataError}
 */
export function secureConnectionError(cause) {
  return new DataError(
    DataErrorCode.NETWORK,
    'A secure connection to the server could not be established.',
    cause,
  );
}

/** Safely extract a lowercase string form of an error's message. */
function messageOf(error) {
  if (!error) return '';
  if (typeof error === 'string') return error.toLowerCase();
  const parts = [error.message, error.details, error.hint, error.name];
  return parts
    .filter((p) => typeof p === 'string')
    .join(' ')
    .toLowerCase();
}

/** Extract an HTTP-like status code from the common carrier fields. */
function httpStatusOf(error) {
  if (!error || typeof error !== 'object') return null;
  const raw = error.status ?? error.statusCode ?? error.httpStatus;
  const num = typeof raw === 'string' ? Number(raw) : raw;
  return Number.isInteger(num) ? num : null;
}

/**
 * Extract a Postgres SQLSTATE code (5-char alphanumeric like '23505', '42501').
 * PostgREST surfaces this on `error.code`; guard against HTTP statuses or
 * app-level string codes that also live on `.code`.
 */
function pgSqlStateOf(error) {
  if (!error || typeof error !== 'object') return null;
  const code = error.code;
  return typeof code === 'string' && /^[0-9A-Za-z]{5}$/.test(code) ? code : null;
}

/** Detect connectivity/abort/timeout/TLS failures from name and message. */
function looksLikeNetworkError(error, msg) {
  if (!error) return false;
  const name = typeof error.name === 'string' ? error.name : '';
  if (name === 'AbortError' || name === 'TimeoutError') return true;
  // A bare TypeError from fetch ("Failed to fetch") indicates a transport-level
  // failure with no HTTP response.
  if (name === 'TypeError' && /fetch|network/.test(msg)) return true;
  return /failed to fetch|network ?error|network request failed|fetch failed|load failed|connection (refused|reset|closed)|econnrefused|econnreset|etimedout|enotfound|socket hang up|timed? ?out|timeout/.test(
    msg,
  );
}

/** Detect TLS/secure-connection failures (Req 10.2). */
function looksLikeSecureConnectionError(msg) {
  return /\b(tls|ssl|certificate|cert_|err_ssl|handshake|secure connection|ssl error)\b/.test(
    msg,
  );
}

/** Detect auth/JWT failures from the message when no HTTP status is present. */
function looksLikeAuthError(error, msg) {
  const name = typeof error?.name === 'string' ? error.name : '';
  if (name === 'AuthApiError' || name === 'AuthSessionMissingError') return true;
  return /\bjwt\b|json web token|token (is )?expired|expired token|invalid token|not authenticated|no api key|invalid (login )?credentials|unauthorized/.test(
    msg,
  );
}

/**
 * Map an arbitrary Supabase/PostgREST/fetch error into a stable {@link DataError}.
 *
 * The original error is always retained under `DataError.cause`. `context` is an
 * optional hint (e.g. `{ secureConnectionFailed: true }` from the HTTPS guard)
 * that lets callers steer classification without inspecting the raw error.
 *
 * @param {unknown} error An error object/string thrown or returned by a driver.
 * @param {{ secureConnectionFailed?: boolean, code?: string }} [context]
 * @returns {DataError}
 */
export function mapError(error, context = {}) {
  // Idempotent: already-mapped errors pass through unchanged.
  if (error instanceof DataError) return error;

  // Explicit caller hints win — e.g. the HTTPS guard before any request.
  if (context.secureConnectionFailed) return secureConnectionError(error);
  if (context.code && DataErrorCode[context.code]) {
    return new DataError(context.code, undefined, error);
  }

  const msg = messageOf(error);

  // 1. Transport-level failures (no HTTP response): abort, timeout, DNS, TLS.
  if (looksLikeSecureConnectionError(msg)) return secureConnectionError(error);
  if (looksLikeNetworkError(error, msg)) {
    return new DataError(DataErrorCode.NETWORK, undefined, error);
  }

  // 2. Postgres SQLSTATE classification (PostgREST `error.code`).
  const sqlState = pgSqlStateOf(error);
  if (sqlState) {
    if (sqlState === '42501') {
      // insufficient_privilege — RLS denial (Req 4.5).
      return new DataError(DataErrorCode.FORBIDDEN, undefined, error);
    }
    if (sqlState === '23505') {
      // unique_violation — used as an optimistic-concurrency conflict signal.
      return new DataError(DataErrorCode.CONFLICT, undefined, error);
    }
    // Integrity (23xxx: not-null 23502, FK 23503, check 23514, …) and data
    // exceptions (22xxx) are validation failures (Req 6.5).
    if (sqlState.startsWith('23') || sqlState.startsWith('22')) {
      return new DataError(DataErrorCode.VALIDATION, undefined, error);
    }
  }

  // 3. HTTP status classification.
  const status = httpStatusOf(error);
  if (status !== null) {
    if (status === 401) return new DataError(DataErrorCode.AUTH, undefined, error);
    if (status === 403) {
      return new DataError(DataErrorCode.FORBIDDEN, undefined, error);
    }
    if (status === 409) {
      return new DataError(DataErrorCode.CONFLICT, undefined, error);
    }
    if (status === 400 || status === 422) {
      return new DataError(DataErrorCode.VALIDATION, undefined, error);
    }
  }

  // 4. Auth signals carried only in the message (expired/invalid JWT).
  if (looksLikeAuthError(error, msg)) {
    return new DataError(DataErrorCode.AUTH, undefined, error);
  }

  // 5. Explicit conflict markers (adapter-level or app-level).
  if (
    (error && typeof error === 'object' && error.conflict) ||
    (typeof error?.code === 'string' && error.code === 'CONFLICT') ||
    /\bconflict\b|version mismatch|stale (update|version)/.test(msg)
  ) {
    return new DataError(DataErrorCode.CONFLICT, undefined, error);
  }

  // 6. Anything else is unknown.
  return new DataError(DataErrorCode.UNKNOWN, undefined, error);
}

export default mapError;
