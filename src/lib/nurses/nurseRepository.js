import { isSessionExpired } from '../auth';
import { isSupabaseBackend, nurseOps } from '../dataLayer';
import { DataError, DataErrorCode, mapError } from '../dataLayer/errors';
import {
  createNurseOperationEvent,
  emitNurseOperationEvent,
  NURSE_OPERATION_EVENT_KEYS,
} from './nurseTelemetry';
import { normalizeNurseCreateDraft, NURSE_BUSINESS_FIELDS } from './nurseWorkflow';

export { NURSE_OPERATION_EVENT_KEYS };

export const NURSE_REPOSITORY_PAGE_SIZE = 100;
export const LIST_CONSISTENCY_ERROR = 'LIST_CONSISTENCY';
const RECOVERABLE_CREATE_CODES = new Set([DataErrorCode.NETWORK, DataErrorCode.UNKNOWN]);
const CATEGORIZED_DATA_ERROR_CODES = new Set(Object.values(DataErrorCode));

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(value, key) {
  return Object.prototype.hasOwnProperty.call(value, key);
}

function valuesEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return (
      left.length === right.length && left.every((item, index) => valuesEqual(item, right[index]))
    );
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every((key) => hasOwn(right, key) && valuesEqual(left[key], right[key]))
    );
  }
  return false;
}

function validationError(message) {
  return new DataError(DataErrorCode.VALIDATION, message);
}

function authenticationError(cause) {
  return new DataError(
    DataErrorCode.AUTH,
    'Your session has expired. Please sign in again.',
    cause
  );
}

function unknownError(cause) {
  return new DataError(DataErrorCode.UNKNOWN, undefined, cause);
}

function listConsistencyError() {
  return Object.freeze({
    code: LIST_CONSISTENCY_ERROR,
    message: 'The complete nurse list could not be verified. Please retry.',
  });
}

function collisionResult(current = null) {
  return {
    status: 'collision',
    current,
    error: new DataError(DataErrorCode.CONFLICT, 'This create draft identifier is already in use.'),
  };
}

function validateIdentifier(id) {
  return typeof id === 'string' && id.trim().length > 0
    ? null
    : validationError('Nurse identifier must be a non-empty string.');
}

function validateBaseVersion(baseVersion) {
  return Number.isInteger(baseVersion) && baseVersion > 0
    ? null
    : validationError('Nurse base version must be a positive integer.');
}

function businessValuesEqual(nurse, normalizedDraft) {
  return NURSE_BUSINESS_FIELDS.every((field) =>
    valuesEqual(nurse?.[field], normalizedDraft[field])
  );
}

function toBusinessPatch(id, draft, baseVersion) {
  if (!isPlainObject(draft)) {
    return { error: validationError('Nurse draft must be an object.'), patch: null };
  }
  if (hasOwn(draft, 'id') && draft.id !== id) {
    return {
      error: validationError('Nurse draft identifier does not match the save target.'),
      patch: null,
    };
  }
  if (hasOwn(draft, 'version') && draft.version !== baseVersion) {
    return {
      error: validationError('Nurse draft version does not match the base version.'),
      patch: null,
    };
  }

  return {
    error: null,
    patch: Object.fromEntries(
      NURSE_BUSINESS_FIELDS.filter((field) => hasOwn(draft, field)).map((field) => [
        field,
        draft[field],
      ])
    ),
  };
}

function errorOutcome(error) {
  switch (error?.code) {
    case DataErrorCode.VALIDATION:
      return 'validation';
    case DataErrorCode.AUTH:
      return 'auth';
    case DataErrorCode.FORBIDDEN:
      return 'forbidden';
    case DataErrorCode.NETWORK:
      return 'network';
    case DataErrorCode.CONFLICT:
      return 'conflict';
    default:
      return 'unknown';
  }
}

function resultOutcome(result) {
  switch (result?.status) {
    case 'ok':
      return result.total === 0 ? 'empty' : 'success';
    case 'saved':
    case 'deleted':
      return 'success';
    case 'notFound':
    case 'alreadyDeleted':
      return 'notFound';
    case 'conflict':
    case 'collision':
      return 'conflict';
    case 'error':
      return errorOutcome(result.error);
    default:
      return 'unknown';
  }
}

function safeOptions(options) {
  if (!isPlainObject(options)) return {};
  return options;
}

function safeDurationMs(startedAt, finishedAt) {
  const duration = finishedAt - startedAt;
  return Number.isFinite(duration) ? Math.max(0, Math.round(duration)) : 0;
}

/**
 * Construct a nurse repository over the already selected data-layer facade.
 * Dependencies are injectable for focused tests; production uses the immutable
 * facade selection and the active Supabase session wrapper.
 */
export function createNurseRepository({
  operations = nurseOps,
  supabase = isSupabaseBackend,
  requireActiveSession = async () => ({
    session: null,
    userId: null,
    authEpoch: 0,
    error: new Error('Authentication required.'),
  }),
  invalidateSession = () => false,
  sessionExpired = isSessionExpired,
  emitOperation = emitNurseOperationEvent,
  now = () => globalThis.performance?.now?.() ?? Date.now(),
} = {}) {
  const createAttempts = new Map();
  const backend = supabase ? 'supabase' : 'legacy';

  function emit(operation, result, startedAt, options) {
    const settings = safeOptions(options);
    const candidate = {
      operation,
      outcome: resultOutcome(result),
      backend,
      durationMs: safeDurationMs(startedAt, now()),
      retryCount:
        Number.isInteger(settings.retryCount) && settings.retryCount >= 0 ? settings.retryCount : 0,
      requestId: settings.requestId,
    };
    try {
      emitOperation(createNurseOperationEvent(candidate));
    } catch {
      // Observability must never change an operation's authoritative result.
    }
  }

  async function run(operation, options, work) {
    const startedAt = now();
    let result;
    try {
      result = await work();
    } catch (error) {
      result = { status: 'error', error: mapError(error) };
    }
    emit(operation, result, startedAt, options);
    return result;
  }

  async function activeUser() {
    if (!supabase) return { error: null, userId: null, authEpoch: 0 };

    let sessionResult;
    try {
      sessionResult = await requireActiveSession();
    } catch (error) {
      return { error: authenticationError(error), userId: null, authEpoch: 0 };
    }
    if (sessionResult?.error) {
      return {
        error: authenticationError(sessionResult.error),
        userId: null,
        authEpoch: Number.isInteger(sessionResult.authEpoch) ? sessionResult.authEpoch : 0,
      };
    }

    const session = sessionResult?.session ?? null;
    const userId = sessionResult?.userId ?? session?.user?.id;
    const authEpoch = Number.isInteger(sessionResult?.authEpoch) ? sessionResult.authEpoch : 0;
    if (
      !session ||
      sessionExpired(session) ||
      typeof userId !== 'string' ||
      userId.trim().length === 0
    ) {
      return { error: authenticationError(), userId: null, authEpoch };
    }
    return { error: null, userId, authEpoch };
  }

  async function serverError(error, auth) {
    const categorized =
      error &&
      typeof error === 'object' &&
      CATEGORIZED_DATA_ERROR_CODES.has(error.code)
        ? error
        : mapError(error);
    if (categorized.code === DataErrorCode.AUTH) {
      try {
        await invalidateSession({ userId: auth.userId, authEpoch: auth.authEpoch });
      } catch {
        // Invalidating shared readiness is fail-closed and must not replace the
        // authoritative server error returned to the controller.
      }
    }
    return categorized;
  }

  async function authorize() {
    const auth = await activeUser();
    return auth.error ? { status: 'error', error: auth.error } : auth;
  }

  async function readCreateCandidate(id, normalizedDraft, auth) {
    const response = await operations.get(id);
    if (response?.error) {
      return { status: 'error', error: await serverError(response.error, auth) };
    }
    if (response?.notFound || !response?.data) return { status: 'notFound' };

    const ownerMatches = !supabase || response.data.ownerId === auth.userId;
    if (ownerMatches && businessValuesEqual(response.data, normalizedDraft)) {
      return { status: 'saved', nurse: response.data };
    }
    return collisionResult(response.data);
  }

  async function listAll(options = {}) {
    return run('list', options, async () => {
      const auth = await authorize();
      if (auth.status === 'error') return auth;

      const aggregate = [];
      const identifiers = new Set();
      let reportedTotal = null;
      let page = 1;
      let expectedPages = 1;

      while (page <= expectedPages) {
        const response = await operations.list({
          page,
          pageSize: NURSE_REPOSITORY_PAGE_SIZE,
        });
        if (response?.error) {
          return { status: 'error', error: await serverError(response.error, auth) };
        }
        if (!Array.isArray(response?.data)) {
          return { status: 'error', error: listConsistencyError() };
        }
        if (response.data.length > NURSE_REPOSITORY_PAGE_SIZE) {
          return { status: 'error', error: listConsistencyError() };
        }
        if (!Number.isInteger(response.total) || response.total < 0) {
          return { status: 'error', error: listConsistencyError() };
        }

        if (reportedTotal === null) {
          reportedTotal = response.total;
          expectedPages = Math.max(1, Math.ceil(reportedTotal / NURSE_REPOSITORY_PAGE_SIZE));
        } else if (response.total !== reportedTotal) {
          return { status: 'error', error: listConsistencyError() };
        }

        for (const nurse of response.data) {
          if (
            !isPlainObject(nurse) ||
            typeof nurse.id !== 'string' ||
            nurse.id.length === 0 ||
            identifiers.has(nurse.id)
          ) {
            return { status: 'error', error: listConsistencyError() };
          }
          identifiers.add(nurse.id);
          aggregate.push(nurse);
        }

        if (aggregate.length > reportedTotal) {
          return { status: 'error', error: listConsistencyError() };
        }
        page += 1;
      }

      if (identifiers.size !== reportedTotal || aggregate.length !== reportedTotal) {
        return { status: 'error', error: listConsistencyError() };
      }
      return { status: 'ok', nurses: aggregate, total: reportedTotal };
    });
  }

  async function get(id, options = {}) {
    return run('detail', options, async () => {
      const inputError = validateIdentifier(id);
      if (inputError) return { status: 'error', error: inputError };

      const auth = await authorize();
      if (auth.status === 'error') return auth;

      const response = await operations.get(id);
      if (response?.error) {
        return { status: 'error', error: await serverError(response.error, auth) };
      }
      if (response?.notFound || !response?.data) return { status: 'notFound' };
      return { status: 'ok', nurse: response.data };
    });
  }

  async function create(input, options = {}) {
    const settings = safeOptions(options);
    return run('create', settings, async () => {
      const normalized = normalizeNurseCreateDraft(input);
      if (!normalized.valid) {
        return {
          status: 'error',
          error: validationError('The nurse create draft is invalid.'),
          validation: normalized,
        };
      }

      const auth = await authorize();
      if (auth.status === 'error') return auth;

      const draft = normalized.value;
      const id = draft.id;
      const previous = createAttempts.get(id);
      const retryCount = previous?.attempts ?? 0;
      const mustReadBeforeInsert =
        previous?.ambiguous === true || settings.retry === true || settings.retryCount > 0;

      if (mustReadBeforeInsert) {
        const existing = await readCreateCandidate(id, draft, auth);
        if (existing.status !== 'notFound') return existing;
      }

      const response = await operations.create(draft, {
        id,
        ownerId: auth.userId,
      });

      if (response?.error || response?.conflict) {
        const error = response.error ? await serverError(response.error, auth) : null;
        const isCollision = response?.conflict || error?.code === DataErrorCode.CONFLICT;
        if (isCollision) {
          const verified = await readCreateCandidate(id, draft, auth);
          if (verified.status === 'notFound') {
            createAttempts.set(id, { ambiguous: false, attempts: retryCount + 1 });
            return collisionResult(response?.conflict?.current ?? null);
          }
          if (verified.status === 'error') {
            createAttempts.set(id, { ambiguous: true, attempts: retryCount + 1 });
          }
          return verified;
        }

        const mapped = error ? mapError(error) : unknownError();
        createAttempts.set(id, {
          ambiguous: RECOVERABLE_CREATE_CODES.has(mapped.code),
          attempts: retryCount + 1,
        });
        return { status: 'error', error: mapped };
      }

      if (!response?.data) {
        createAttempts.set(id, { ambiguous: true, attempts: retryCount + 1 });
        return { status: 'error', error: unknownError() };
      }

      createAttempts.delete(id);
      return { status: 'saved', nurse: response.data };
    });
  }

  async function save(id, draft, baseVersion, options = {}) {
    return run('update', options, async () => {
      const inputError = validateIdentifier(id) || validateBaseVersion(baseVersion);
      if (inputError) return { status: 'error', error: inputError };

      const { error, patch } = toBusinessPatch(id, draft, baseVersion);
      if (error) return { status: 'error', error };

      const auth = await authorize();
      if (auth.status === 'error') return auth;

      const response = await operations.update(id, patch, baseVersion);
      if (response?.error) {
        return { status: 'error', error: await serverError(response.error, auth) };
      }
      if (response?.notFound) return { status: 'notFound' };
      if (response?.conflict) {
        return { status: 'conflict', current: response.conflict.current ?? null };
      }
      if (!response?.data) return { status: 'error', error: unknownError() };
      return { status: 'saved', nurse: response.data };
    });
  }

  async function remove(id, baseVersion, options = {}) {
    return run('delete', options, async () => {
      const inputError = validateIdentifier(id) || validateBaseVersion(baseVersion);
      if (inputError) return { status: 'error', error: inputError };

      const auth = await authorize();
      if (auth.status === 'error') return auth;

      const response = await operations.remove(id, baseVersion);
      if (response?.error) {
        return { status: 'error', error: await serverError(response.error, auth) };
      }
      if (response?.conflict) {
        return { status: 'conflict', current: response.conflict.current ?? null };
      }
      if (response?.alreadyDeleted || response?.outcome === 'alreadyDeleted') {
        return { status: 'alreadyDeleted' };
      }
      if (response?.deleted || response?.outcome === 'deleted') {
        return { status: 'deleted' };
      }
      return { status: 'error', error: unknownError() };
    });
  }

  return Object.freeze({ listAll, get, create, save, remove });
}

const nurseRepository = createNurseRepository();

export const listAllNurses = (...args) => nurseRepository.listAll(...args);
export const readNurse = (...args) => nurseRepository.get(...args);
export const createNurseRecord = (...args) => nurseRepository.create(...args);
export const saveNurseRecord = (...args) => nurseRepository.save(...args);
export const removeNurseRecord = (...args) => nurseRepository.remove(...args);

export default nurseRepository;
