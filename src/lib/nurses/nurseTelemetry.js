export const NURSE_OPERATION_EVENT_NAME = 'propela:nurse-operation';

export const NURSE_OPERATION_EVENT_KEYS = Object.freeze([
  'operation',
  'outcome',
  'backend',
  'durationMs',
  'retryCount',
  'requestId',
]);

export const NURSE_OPERATION_NAMES = Object.freeze([
  'list',
  'detail',
  'create',
  'update',
  'delete',
]);

export const NURSE_OPERATION_OUTCOMES = Object.freeze([
  'success',
  'empty',
  'validation',
  'auth',
  'forbidden',
  'network',
  'conflict',
  'notFound',
  'unknown',
]);

export const NURSE_OPERATION_BACKENDS = Object.freeze(['supabase', 'legacy']);

const OPERATION_NAMES = new Set(NURSE_OPERATION_NAMES);
const OPERATION_OUTCOMES = new Set(NURSE_OPERATION_OUTCOMES);
const OPERATION_BACKENDS = new Set(NURSE_OPERATION_BACKENDS);
const SAFE_REQUEST_ID = /^[A-Za-z0-9._:-]{1,128}$/;

function safeNonNegativeInteger(value) {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.round(value)));
}

/**
 * Build the only telemetry shape nurse workflows may emit. Unknown keys are
 * discarded by construction, so payloads, identities, tokens, raw errors, and
 * clinical content cannot cross this boundary.
 */
export function createNurseOperationEvent(candidate = {}) {
  const operation = OPERATION_NAMES.has(candidate.operation)
    ? candidate.operation
    : 'list';
  const outcome = OPERATION_OUTCOMES.has(candidate.outcome)
    ? candidate.outcome
    : 'unknown';
  const backend = OPERATION_BACKENDS.has(candidate.backend)
    ? candidate.backend
    : 'legacy';

  const event = {
    operation,
    outcome,
    backend,
    durationMs: safeNonNegativeInteger(candidate.durationMs),
    retryCount:
      Number.isInteger(candidate.retryCount) && candidate.retryCount >= 0
        ? Math.min(Number.MAX_SAFE_INTEGER, candidate.retryCount)
        : 0,
  };

  if (
    typeof candidate.requestId === 'string' &&
    SAFE_REQUEST_ID.test(candidate.requestId)
  ) {
    event.requestId = candidate.requestId;
  }

  return Object.freeze(event);
}

/**
 * Browser observability hook. Dispatching is best-effort and intentionally has
 * no effect on the operation result. Integrations can subscribe to the named
 * event without gaining access to nurse command inputs or backend errors.
 */
export function emitNurseOperationEvent(candidate) {
  const event = createNurseOperationEvent(candidate);
  if (
    typeof globalThis.dispatchEvent === 'function' &&
    typeof globalThis.CustomEvent === 'function'
  ) {
    globalThis.dispatchEvent(
      new globalThis.CustomEvent(NURSE_OPERATION_EVENT_NAME, { detail: event }),
    );
  }
  return event;
}
