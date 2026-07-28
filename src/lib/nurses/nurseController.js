import { calculateReadinessStatus } from '../calculations';
import { DataError, DataErrorCode } from '../dataLayer/errors';
import nurseRepository from './nurseRepository';
import {
  createBlankNurseDraft,
  createNurseDraftId,
  rebaseNurseDraft,
  validateNurseDraft,
} from './nurseWorkflow';

export const NurseAsyncState = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error',
  NOT_FOUND: 'notFound',
});

const RECOVERABLE_CODES = new Set([
  DataErrorCode.NETWORK,
  DataErrorCode.UNKNOWN,
  DataErrorCode.STORAGE,
  'LIST_CONSISTENCY',
]);

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function clone(value) {
  if (Array.isArray(value)) return value.map(clone);
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, clone(item)]));
  }
  return value;
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
      leftKeys.every(
        (key) =>
          Object.prototype.hasOwnProperty.call(right, key) && valuesEqual(left[key], right[key])
      )
    );
  }
  return false;
}

function isRecoverable(error) {
  return RECOVERABLE_CODES.has(error?.code);
}

function replaceItem(items, nurse) {
  const index = items.findIndex((item) => item.id === nurse.id);
  if (index < 0) return [...items, clone(nurse)];
  return items.map((item, itemIndex) => (itemIndex === index ? clone(nurse) : item));
}

function removeItem(items, id) {
  return items.filter((item) => item.id !== id);
}

function validationFailure(message) {
  return new DataError(DataErrorCode.VALIDATION, message);
}

function unknownFailure(message) {
  return new DataError(DataErrorCode.UNKNOWN, message);
}

export function createInitialNurseState() {
  return {
    items: [],
    total: 0,
    hasAcceptedList: false,
    listState: NurseAsyncState.IDLE,
    listError: null,
    staleWarning: false,

    selectedId: null,
    selected: null,
    detailState: NurseAsyncState.IDLE,
    detailError: null,
    detailGeneration: 0,
    originalBase: null,
    draft: null,
    baseVersion: null,
    orphanedDraft: null,

    createDraft: null,
    createState: NurseAsyncState.IDLE,
    createError: null,
    createValidation: null,
    createDecision: null,
    createRetryCount: 0,

    saveState: NurseAsyncState.IDLE,
    saveError: null,
    saveValidation: null,
    saveDecision: null,
    saveRetryCount: 0,

    pipeline: {},

    deleteState: NurseAsyncState.IDLE,
    deleteError: null,
    deleteDecision: null,
    deleteRetryCount: 0,

    discardDecision: null,
    notice: null,
  };
}

/**
 * Pure state transition function used by the imperative controller and React integration.
 * Repository results enter committed list/detail state only through explicit success actions.
 */
export function nurseControllerReducer(state, action) {
  switch (action.type) {
    case 'LIST_STARTED':
      return { ...state, listState: NurseAsyncState.LOADING, listError: null };
    case 'LIST_SUCCEEDED': {
      const items = clone(action.nurses);
      const selectedStillExists =
        state.selectedId === null || items.some((item) => item.id === state.selectedId);
      return {
        ...state,
        items,
        total: action.total,
        hasAcceptedList: true,
        listState: NurseAsyncState.SUCCESS,
        listError: null,
        staleWarning: false,
        ...(selectedStillExists
          ? {}
          : {
              selected: null,
              detailState: NurseAsyncState.NOT_FOUND,
              detailError: null,
              orphanedDraft: state.draft,
              notice: { type: 'notFound', message: 'This nurse no longer exists.' },
            }),
      };
    }
    case 'LIST_FAILED':
      return {
        ...state,
        listState: NurseAsyncState.ERROR,
        listError: action.error,
        staleWarning: state.hasAcceptedList,
      };

    case 'DETAIL_STARTED':
      return {
        ...state,
        selectedId: action.id,
        selected: action.preserveSession ? state.selected : null,
        detailState: NurseAsyncState.LOADING,
        detailError: null,
        detailGeneration: action.generation,
        originalBase: action.preserveSession ? state.originalBase : null,
        draft: action.preserveSession ? state.draft : null,
        baseVersion: action.preserveSession ? state.baseVersion : null,
        orphanedDraft: null,
        saveState: NurseAsyncState.IDLE,
        saveError: null,
        saveValidation: null,
        saveDecision: null,
        discardDecision: null,
      };
    case 'DETAIL_SUCCEEDED': {
      const nurse = clone(action.nurse);
      return {
        ...state,
        selectedId: nurse.id,
        selected: nurse,
        detailState: NurseAsyncState.SUCCESS,
        detailError: null,
        originalBase: clone(nurse),
        draft: clone(nurse),
        baseVersion: nurse.version,
        orphanedDraft: null,
        saveState: NurseAsyncState.IDLE,
        saveError: null,
        saveValidation: null,
        saveDecision: null,
        discardDecision: null,
      };
    }
    case 'DETAIL_FAILED':
      return {
        ...state,
        detailState: NurseAsyncState.ERROR,
        detailError: action.error,
      };
    case 'DETAIL_NOT_FOUND': {
      const existed = state.items.some((item) => item.id === action.id);
      return {
        ...state,
        items: removeItem(state.items, action.id),
        total: existed ? Math.max(0, state.total - 1) : state.total,
        selected: null,
        detailState: NurseAsyncState.NOT_FOUND,
        detailError: null,
        originalBase: null,
        baseVersion: null,
        orphanedDraft: action.preserveDraft ? clone(state.draft) : null,
        draft: action.preserveDraft ? state.draft : null,
        saveState: NurseAsyncState.IDLE,
        deleteState: NurseAsyncState.IDLE,
        deleteDecision: null,
        notice: {
          type: action.alreadyDeleted ? 'alreadyDeleted' : 'notFound',
          message: action.alreadyDeleted
            ? 'This nurse was already deleted.'
            : 'This nurse no longer exists.',
        },
      };
    }
    case 'DETAIL_CLOSED':
      return {
        ...state,
        selectedId: null,
        selected: null,
        detailState: NurseAsyncState.IDLE,
        detailError: null,
        detailGeneration: action.generation,
        originalBase: null,
        draft: null,
        baseVersion: null,
        orphanedDraft: null,
        saveState: NurseAsyncState.IDLE,
        saveError: null,
        saveValidation: null,
        saveDecision: null,
        deleteState: NurseAsyncState.IDLE,
        deleteError: null,
        deleteDecision: null,
        discardDecision: null,
      };
    case 'DRAFT_CHANGED':
      return {
        ...state,
        draft: clone(action.draft),
        saveError: null,
        saveValidation: null,
      };
    case 'DISCARD_REQUESTED':
      return { ...state, discardDecision: clone(action.decision) };
    case 'DISCARD_DECLINED':
      return { ...state, discardDecision: null };
    case 'DISCARD_CONFLICT_CONFIRMED': {
      const latest = clone(action.latest);
      return {
        ...state,
        items: replaceItem(state.items, latest),
        selected: latest,
        originalBase: clone(latest),
        draft: clone(latest),
        baseVersion: latest.version,
        saveState: NurseAsyncState.IDLE,
        saveError: null,
        saveDecision: null,
        discardDecision: null,
      };
    }

    case 'CREATE_OPENED':
      return {
        ...state,
        createDraft: clone(action.draft),
        createState: NurseAsyncState.IDLE,
        createError: null,
        createValidation: null,
        createDecision: null,
        createRetryCount: 0,
      };
    case 'CREATE_DRAFT_CHANGED':
      return {
        ...state,
        createDraft: clone(action.draft),
        createError: null,
        createValidation: null,
      };
    case 'CREATE_STARTED':
      return {
        ...state,
        createState: NurseAsyncState.LOADING,
        createError: null,
        createValidation: null,
        createDecision: null,
      };
    case 'CREATE_SUCCEEDED': {
      const existed = state.items.some((item) => item.id === action.nurse.id);
      return {
        ...state,
        items: replaceItem(state.items, action.nurse),
        total: existed ? state.total : state.total + 1,
        createDraft: null,
        createState: NurseAsyncState.SUCCESS,
        createError: null,
        createValidation: null,
        createDecision: null,
        createRetryCount: 0,
        notice: { type: 'created', message: 'Nurse created.' },
      };
    }
    case 'CREATE_FAILED':
      return {
        ...state,
        createState: NurseAsyncState.ERROR,
        createError: action.error,
        createValidation: action.validation ?? null,
        createDecision: {
          type: 'createFailure',
          retryAvailable: isRecoverable(action.error),
        },
        createRetryCount: action.retryCount,
      };
    case 'CREATE_COLLISION':
      return {
        ...state,
        createState: NurseAsyncState.ERROR,
        createError: action.error,
        createDecision: {
          type: 'createCollision',
          current: clone(action.current),
          retryAvailable: true,
        },
      };
    case 'CREATE_CLOSED':
      return {
        ...state,
        createDraft: null,
        createState: NurseAsyncState.IDLE,
        createError: null,
        createValidation: null,
        createDecision: null,
        createRetryCount: 0,
      };

    case 'SAVE_STARTED':
      return {
        ...state,
        saveState: NurseAsyncState.LOADING,
        saveError: null,
        saveValidation: null,
        saveDecision: null,
      };
    case 'SAVE_SUCCEEDED': {
      const nurse = clone(action.nurse);
      return {
        ...state,
        items: replaceItem(state.items, nurse),
        selected: state.selectedId === nurse.id ? nurse : state.selected,
        originalBase: state.selectedId === nurse.id ? clone(nurse) : state.originalBase,
        draft: state.selectedId === nurse.id ? clone(nurse) : state.draft,
        baseVersion: state.selectedId === nurse.id ? nurse.version : state.baseVersion,
        saveState: NurseAsyncState.SUCCESS,
        saveError: null,
        saveValidation: null,
        saveDecision: null,
        saveRetryCount: 0,
        notice: { type: 'saved', message: 'Nurse saved.' },
      };
    }
    case 'SAVE_FAILED':
      return {
        ...state,
        saveState: NurseAsyncState.ERROR,
        saveError: action.error,
        saveValidation: action.validation ?? null,
        saveDecision: {
          type: 'saveFailure',
          retryAvailable: isRecoverable(action.error),
        },
        saveRetryCount: action.retryCount,
      };
    case 'SAVE_CONFLICT':
      return {
        ...state,
        saveState: NurseAsyncState.ERROR,
        saveError: null,
        saveDecision: {
          type: 'saveConflict',
          latest: clone(action.current),
          retryAvailable: false,
        },
      };
    case 'SAVE_CONFLICT_CLOSED':
      return {
        ...state,
        saveState: NurseAsyncState.IDLE,
        saveError: null,
        saveDecision: null,
        discardDecision: null,
      };
    case 'SAVE_REBASED':
      return {
        ...state,
        originalBase: clone(action.latest),
        draft: clone(action.draft),
        baseVersion: action.latest.version,
        saveState: NurseAsyncState.IDLE,
        saveError: null,
        saveValidation: null,
        saveDecision: null,
        discardDecision: null,
      };

    case 'PIPELINE_STARTED':
      return {
        ...state,
        pipeline: {
          ...state.pipeline,
          [action.id]: {
            state: NurseAsyncState.LOADING,
            error: null,
            decision: null,
            previous: clone(action.previous),
            proposed: clone(action.proposed),
            baseVersion: action.baseVersion,
            retryCount: action.retryCount,
          },
        },
      };
    case 'PIPELINE_SUCCEEDED': {
      const nurse = clone(action.nurse);
      return {
        ...state,
        items: replaceItem(state.items, nurse),
        selected: state.selectedId === nurse.id ? nurse : state.selected,
        originalBase: state.selectedId === nurse.id ? clone(nurse) : state.originalBase,
        draft: state.selectedId === nurse.id ? clone(nurse) : state.draft,
        baseVersion: state.selectedId === nurse.id ? nurse.version : state.baseVersion,
        pipeline: {
          ...state.pipeline,
          [nurse.id]: {
            state: NurseAsyncState.SUCCESS,
            error: null,
            decision: null,
            previous: null,
            proposed: null,
            baseVersion: nurse.version,
            retryCount: 0,
          },
        },
      };
    }
    case 'PIPELINE_FAILED':
      return {
        ...state,
        pipeline: {
          ...state.pipeline,
          [action.id]: {
            ...state.pipeline[action.id],
            state: NurseAsyncState.ERROR,
            error: action.error,
            decision: {
              type: 'pipelineFailure',
              retryAvailable: isRecoverable(action.error),
            },
            retryCount: action.retryCount,
          },
        },
      };
    case 'PIPELINE_CONFLICT':
      return {
        ...state,
        pipeline: {
          ...state.pipeline,
          [action.id]: {
            ...state.pipeline[action.id],
            state: NurseAsyncState.ERROR,
            error: null,
            decision: {
              type: 'pipelineConflict',
              latest: clone(action.current),
              retryAvailable: false,
              requiresReload: true,
            },
          },
        },
      };
    case 'PIPELINE_RESOLUTION_STARTED':
      return {
        ...state,
        pipeline: {
          ...state.pipeline,
          [action.id]: {
            ...state.pipeline[action.id],
            state: NurseAsyncState.LOADING,
            error: null,
            resolution: action.resolution,
          },
        },
      };
    case 'PIPELINE_RESOLVED': {
      const nurse = clone(action.nurse);
      return {
        ...state,
        items: replaceItem(state.items, nurse),
        selected: state.selectedId === nurse.id ? nurse : state.selected,
        originalBase: state.selectedId === nurse.id ? clone(nurse) : state.originalBase,
        draft: state.selectedId === nurse.id ? clone(nurse) : state.draft,
        baseVersion: state.selectedId === nurse.id ? nurse.version : state.baseVersion,
        pipeline: {
          ...state.pipeline,
          [nurse.id]: {
            state: NurseAsyncState.SUCCESS,
            error: null,
            decision: null,
            previous: null,
            proposed: null,
            baseVersion: nurse.version,
            retryCount: 0,
            resolution: action.resolution,
          },
        },
      };
    }
    case 'PIPELINE_RELOAD_FAILED':
      return {
        ...state,
        pipeline: {
          ...state.pipeline,
          [action.id]: {
            ...state.pipeline[action.id],
            state: NurseAsyncState.ERROR,
            error: action.error,
            resolution: null,
          },
        },
      };
    case 'PIPELINE_NOT_FOUND': {
      const existed = state.items.some((item) => item.id === action.id);
      const isSelected = state.selectedId === action.id;
      return {
        ...state,
        items: removeItem(state.items, action.id),
        total: existed ? Math.max(0, state.total - 1) : state.total,
        ...(isSelected
          ? {
              selected: null,
              detailState: NurseAsyncState.NOT_FOUND,
              detailError: null,
              originalBase: null,
              baseVersion: null,
              orphanedDraft: clone(state.draft),
            }
          : {}),
        pipeline: {
          ...state.pipeline,
          [action.id]: {
            state: NurseAsyncState.NOT_FOUND,
            error: null,
            decision: null,
            previous: null,
            proposed: null,
            baseVersion: null,
            retryCount: 0,
            resolution: null,
          },
        },
        notice: { type: 'notFound', message: 'This nurse no longer exists.' },
      };
    }

    case 'DELETE_CONFIRM_REQUESTED':
      return {
        ...state,
        deleteState: NurseAsyncState.IDLE,
        deleteError: null,
        deleteDecision: {
          type: 'confirmDelete',
          id: action.id,
          baseVersion: action.baseVersion,
          nurseName: action.nurseName,
        },
        deleteRetryCount: 0,
      };
    case 'DELETE_STARTED':
      return { ...state, deleteState: NurseAsyncState.LOADING, deleteError: null };
    case 'DELETE_FAILED':
      return {
        ...state,
        deleteState: NurseAsyncState.ERROR,
        deleteError: action.error,
        deleteDecision: {
          ...state.deleteDecision,
          type: 'deleteFailure',
          retryAvailable: isRecoverable(action.error),
        },
        deleteRetryCount: action.retryCount,
      };
    case 'DELETE_CONFLICT':
      return {
        ...state,
        deleteState: NurseAsyncState.ERROR,
        deleteError: null,
        deleteDecision: {
          type: 'deleteConflict',
          id: action.id,
          current: clone(action.current),
          retryAvailable: false,
          requiresReload: true,
        },
      };
    case 'DELETE_CONVERGED': {
      const existed = state.items.some((item) => item.id === action.id);
      return {
        ...state,
        items: removeItem(state.items, action.id),
        total: existed ? Math.max(0, state.total - 1) : state.total,
        selectedId: null,
        selected: null,
        detailState: NurseAsyncState.IDLE,
        detailError: null,
        originalBase: null,
        draft: null,
        baseVersion: null,
        deleteState: NurseAsyncState.SUCCESS,
        deleteError: null,
        deleteDecision: null,
        deleteRetryCount: 0,
        notice: {
          type: action.alreadyDeleted ? 'alreadyDeleted' : 'deleted',
          message: action.alreadyDeleted ? 'This nurse was already deleted.' : 'Nurse deleted.',
        },
      };
    }
    case 'DELETE_CANCELLED':
      return {
        ...state,
        deleteState: NurseAsyncState.IDLE,
        deleteError: null,
        deleteDecision: null,
        deleteRetryCount: 0,
      };
    case 'DELETE_RELOAD_STARTED':
      return {
        ...state,
        deleteState: NurseAsyncState.IDLE,
        deleteError: null,
        deleteDecision: null,
      };

    case 'NOTICE_CLEARED':
      return { ...state, notice: null };
    default:
      return state;
  }
}

/**
 * Stateful nurse workflow controller. It intentionally has no React dependency;
 * AppContext can subscribe to it in the following integration task.
 */
export function createNurseController({
  repository = nurseRepository,
  makeCreateDraft = createBlankNurseDraft,
  makeDraftId = createNurseDraftId,
  initialState = null,
} = {}) {
  let state = initialState
    ? { ...createInitialNurseState(), ...clone(initialState) }
    : createInitialNurseState();
  let detailGeneration = 0;
  const listeners = new Set();
  let listRequest = null;
  let createRequest = null;
  let saveRequest = null;
  let deleteRequest = null;
  const pipelineRequests = new Map();

  function dispatch(action) {
    const next = nurseControllerReducer(state, action);
    if (next !== state) {
      state = next;
      for (const listener of listeners) listener(state);
    }
    return state;
  }

  function getState() {
    return state;
  }

  function subscribe(listener) {
    if (typeof listener !== 'function') throw new TypeError('listener must be a function.');
    listeners.add(listener);
    return () => listeners.delete(listener);
  }

  function refreshNurses(options = {}) {
    if (listRequest) return listRequest;
    dispatch({ type: 'LIST_STARTED' });
    listRequest = repository
      .listAll(options)
      .then((result) => {
        if (result.status === 'ok') {
          dispatch({ type: 'LIST_SUCCEEDED', nurses: result.nurses, total: result.total });
        } else {
          dispatch({ type: 'LIST_FAILED', error: result.error });
        }
        return result;
      })
      .finally(() => {
        listRequest = null;
      });
    return listRequest;
  }

  function retryNurses(options = {}) {
    if (state.listState !== NurseAsyncState.ERROR || !isRecoverable(state.listError)) {
      return Promise.resolve({ status: 'error', error: state.listError });
    }
    return refreshNurses({ ...options, retryCount: (options.retryCount ?? 0) + 1 });
  }

  function acceptLegacyCollection(nurses) {
    const items = Array.isArray(nurses) ? nurses : [];
    dispatch({ type: 'LIST_SUCCEEDED', nurses: items, total: items.length });
    return state;
  }

  function loadDetail(id, { preserveSession = false, options = {} } = {}) {
    detailGeneration += 1;
    const generation = detailGeneration;
    dispatch({ type: 'DETAIL_STARTED', id, generation, preserveSession });

    return repository.get(id, options).then((result) => {
      if (generation !== detailGeneration || state.selectedId !== id) return result;
      if (result.status === 'ok') {
        dispatch({ type: 'DETAIL_SUCCEEDED', nurse: result.nurse });
      } else if (result.status === 'notFound') {
        dispatch({ type: 'DETAIL_NOT_FOUND', id, preserveDraft: preserveSession });
      } else {
        dispatch({ type: 'DETAIL_FAILED', error: result.error });
      }
      return result;
    });
  }

  function openNurse(id, options = {}) {
    return loadDetail(id, { options });
  }

  function retryDetail(options = {}) {
    if (!state.selectedId || state.detailState !== NurseAsyncState.ERROR) {
      return Promise.resolve({ status: 'error', error: state.detailError });
    }
    return loadDetail(state.selectedId, {
      preserveSession: true,
      options: { ...options, retryCount: (options.retryCount ?? 0) + 1 },
    });
  }

  function closeDetail() {
    detailGeneration += 1;
    dispatch({ type: 'DETAIL_CLOSED', generation: detailGeneration });
  }

  function updateDraft(changes) {
    if (state.detailState !== NurseAsyncState.SUCCESS || !state.draft) return state.draft;
    const draft =
      typeof changes === 'function' ? changes(clone(state.draft)) : { ...state.draft, ...changes };
    dispatch({ type: 'DRAFT_CHANGED', draft });
    return state.draft;
  }

  function requestCancelEdit() {
    if (!state.draft || valuesEqual(state.draft, state.originalBase)) {
      closeDetail();
      return { status: 'closed' };
    }
    dispatch({ type: 'DISCARD_REQUESTED', decision: { type: 'discardEdit' } });
    return { status: 'confirmationRequired' };
  }

  function resolveDiscard(confirm) {
    const decision = state.discardDecision;
    if (!decision) return { status: 'idle' };
    if (!confirm) {
      dispatch({ type: 'DISCARD_DECLINED' });
      return { status: 'kept' };
    }
    if (decision.type === 'discardConflict') {
      dispatch({ type: 'DISCARD_CONFLICT_CONFIRMED', latest: decision.latest });
      return { status: 'discarded' };
    }
    closeDetail();
    return { status: 'discarded' };
  }

  function openCreate(options) {
    const draft = makeCreateDraft(options);
    dispatch({ type: 'CREATE_OPENED', draft });
    return clone(draft);
  }

  function updateCreateDraft(changes) {
    if (!state.createDraft || state.createState === NurseAsyncState.LOADING)
      return state.createDraft;
    const draft =
      typeof changes === 'function'
        ? changes(clone(state.createDraft))
        : { ...state.createDraft, ...changes };
    dispatch({ type: 'CREATE_DRAFT_CHANGED', draft });
    return state.createDraft;
  }

  function closeCreate() {
    if (state.createState === NurseAsyncState.LOADING) return false;
    dispatch({ type: 'CREATE_CLOSED' });
    return true;
  }

  function runCreate({ retry = false } = {}) {
    if (createRequest) return createRequest;
    if (!state.createDraft) {
      return Promise.resolve({
        status: 'error',
        error: validationFailure('No create draft is open.'),
      });
    }
    const submitted = clone(state.createDraft);
    const retryCount = retry ? state.createRetryCount + 1 : state.createRetryCount;
    dispatch({ type: 'CREATE_STARTED' });
    createRequest = repository
      .create(submitted, { retry, retryCount })
      .then((result) => {
        if (result.status === 'saved') {
          dispatch({ type: 'CREATE_SUCCEEDED', nurse: result.nurse });
        } else if (result.status === 'collision') {
          dispatch({
            type: 'CREATE_COLLISION',
            error: result.error,
            current: result.current,
          });
        } else {
          dispatch({
            type: 'CREATE_FAILED',
            error: result.error,
            validation: result.validation,
            retryCount,
          });
        }
        return result;
      })
      .finally(() => {
        createRequest = null;
      });
    return createRequest;
  }

  function createNurse() {
    return runCreate();
  }

  function retryCreate() {
    if (state.createDecision?.type !== 'createFailure' || !state.createDecision.retryAvailable) {
      return Promise.resolve({ status: 'error', error: state.createError });
    }
    return runCreate({ retry: true });
  }

  function retryCreateAfterCollision() {
    if (state.createDecision?.type !== 'createCollision' || !state.createDraft) {
      return Promise.resolve({ status: 'error', error: state.createError });
    }
    const draft = { ...state.createDraft, id: makeDraftId() };
    dispatch({ type: 'CREATE_DRAFT_CHANGED', draft });
    return runCreate({ retry: true });
  }

  function runSave({ retry = false } = {}) {
    if (saveRequest) return saveRequest;
    if (!state.selectedId || !state.draft || !state.originalBase) {
      return Promise.resolve({
        status: 'error',
        error: validationFailure('No edit draft is open.'),
      });
    }

    const validation = validateNurseDraft(state.draft, {
      mode: 'update',
      originalBase: state.originalBase,
    });
    if (!validation.valid) {
      const error = validationFailure('The nurse edit draft is invalid.');
      dispatch({
        type: 'SAVE_FAILED',
        error,
        validation,
        retryCount: state.saveRetryCount,
      });
      return Promise.resolve({ status: 'error', error, validation });
    }

    const id = state.selectedId;
    const baseVersion = state.baseVersion;
    const submitted = clone(validation.value);
    const retryCount = retry ? state.saveRetryCount + 1 : state.saveRetryCount;
    dispatch({ type: 'SAVE_STARTED' });
    saveRequest = repository
      .save(id, submitted, baseVersion, { retryCount })
      .then((result) => {
        if (result.status === 'saved') {
          if (!Number.isInteger(result.nurse?.version) || result.nurse.version <= baseVersion) {
            const error = unknownFailure('The saved nurse did not include an advanced version.');
            dispatch({ type: 'SAVE_FAILED', error, retryCount });
            return { status: 'error', error };
          }
          dispatch({ type: 'SAVE_SUCCEEDED', nurse: result.nurse });
        } else if (result.status === 'conflict') {
          dispatch({ type: 'SAVE_CONFLICT', current: result.current });
        } else if (result.status === 'notFound') {
          dispatch({ type: 'DETAIL_NOT_FOUND', id, preserveDraft: true });
        } else {
          dispatch({ type: 'SAVE_FAILED', error: result.error, retryCount });
        }
        return result;
      })
      .finally(() => {
        saveRequest = null;
      });
    return saveRequest;
  }

  function saveNurse() {
    return runSave();
  }

  function retrySave() {
    if (state.saveDecision?.type !== 'saveFailure' || !state.saveDecision.retryAvailable) {
      return Promise.resolve({ status: 'error', error: state.saveError });
    }
    return runSave({ retry: true });
  }

  function applyConflictToLatest() {
    const latest = state.saveDecision?.latest;
    if (state.saveDecision?.type !== 'saveConflict' || !latest) return false;
    const rebased = rebaseNurseDraft(state.originalBase, state.draft, latest);
    dispatch({ type: 'SAVE_REBASED', latest, draft: rebased });
    return true;
  }

  function requestDiscardConflict() {
    const latest = state.saveDecision?.latest;
    if (state.saveDecision?.type !== 'saveConflict' || !latest) return false;
    dispatch({
      type: 'DISCARD_REQUESTED',
      decision: { type: 'discardConflict', latest },
    });
    return true;
  }

  function keepEditingAfterConflict() {
    if (state.saveDecision?.type !== 'saveConflict') return false;
    dispatch({ type: 'SAVE_CONFLICT_CLOSED' });
    return true;
  }

  function runPipeline(id, pipelineStage, baseVersion, readinessStatus, { retry = false } = {}) {
    if (pipelineRequests.has(id)) return pipelineRequests.get(id);
    const committed = state.items.find((nurse) => nurse.id === id);
    if (!committed) {
      return Promise.resolve({ status: 'notFound' });
    }
    if (!Number.isInteger(baseVersion) || baseVersion <= 0) {
      return Promise.resolve({
        status: 'error',
        error: validationFailure('A valid base version is required for a pipeline change.'),
      });
    }
    if (state.pipeline[id]?.decision && !retry) {
      return Promise.resolve({
        status: 'blocked',
        error: validationFailure(
          'Resolve the previous pipeline result before moving this nurse again.'
        ),
      });
    }

    const derivedReadiness = calculateReadinessStatus(pipelineStage);
    if (readinessStatus !== undefined && readinessStatus !== derivedReadiness) {
      return Promise.resolve({
        status: 'error',
        error: validationFailure('Pipeline readiness must match the selected stage.'),
      });
    }

    const previous = {
      pipelineStage: committed.pipelineStage,
      readinessStatus: committed.readinessStatus,
    };
    const proposed = {
      pipelineStage,
      readinessStatus: readinessStatus ?? derivedReadiness,
    };
    const previousProgress = state.pipeline[id];
    const retryCount = retry ? (previousProgress?.retryCount ?? 0) + 1 : 0;
    dispatch({
      type: 'PIPELINE_STARTED',
      id,
      previous,
      proposed,
      baseVersion,
      retryCount,
    });

    const request = repository
      .save(id, proposed, baseVersion, { retryCount })
      .then((result) => {
        if (result.status === 'saved') {
          if (!Number.isInteger(result.nurse?.version) || result.nurse.version <= baseVersion) {
            const error = unknownFailure(
              'The pipeline update did not include an advanced version.'
            );
            dispatch({ type: 'PIPELINE_FAILED', id, error, retryCount });
            return { status: 'error', error };
          }
          dispatch({ type: 'PIPELINE_SUCCEEDED', nurse: result.nurse });
        } else if (result.status === 'conflict') {
          dispatch({ type: 'PIPELINE_CONFLICT', id, current: result.current });
        } else if (result.status === 'notFound') {
          dispatch({ type: 'PIPELINE_NOT_FOUND', id });
        } else {
          dispatch({ type: 'PIPELINE_FAILED', id, error: result.error, retryCount });
        }
        return result;
      })
      .finally(() => pipelineRequests.delete(id));
    pipelineRequests.set(id, request);
    return request;
  }

  function changeNursePipeline(idOrCommand, pipelineStage, baseVersion, readinessStatus) {
    if (isPlainObject(idOrCommand)) {
      return runPipeline(
        idOrCommand.id,
        idOrCommand.pipelineStage,
        idOrCommand.baseVersion,
        idOrCommand.readinessStatus
      );
    }
    return runPipeline(idOrCommand, pipelineStage, baseVersion, readinessStatus);
  }

  function retryPipeline(id) {
    const progress = state.pipeline[id];
    if (progress?.decision?.type !== 'pipelineFailure' || !progress.decision.retryAvailable) {
      return Promise.resolve({ status: 'error', error: progress?.error ?? null });
    }
    return runPipeline(
      id,
      progress.proposed.pipelineStage,
      progress.baseVersion,
      progress.proposed.readinessStatus,
      { retry: true }
    );
  }

  function reloadPipeline(id, options = {}) {
    const progress = state.pipeline[id];
    if (!['pipelineFailure', 'pipelineConflict'].includes(progress?.decision?.type)) {
      return Promise.resolve({ status: 'error', error: progress?.error ?? null });
    }
    if (pipelineRequests.has(id)) return pipelineRequests.get(id);

    dispatch({ type: 'PIPELINE_RESOLUTION_STARTED', id, resolution: 'reload' });
    const request = repository
      .get(id, {
        ...options,
        retryCount: (options.retryCount ?? 0) + 1,
      })
      .then((result) => {
        if (result.status === 'ok') {
          dispatch({
            type: 'PIPELINE_RESOLVED',
            nurse: result.nurse,
            resolution: 'reload',
          });
        } else if (result.status === 'notFound') {
          dispatch({ type: 'PIPELINE_NOT_FOUND', id });
        } else {
          dispatch({ type: 'PIPELINE_RELOAD_FAILED', id, error: result.error });
        }
        return result;
      })
      .finally(() => pipelineRequests.delete(id));
    pipelineRequests.set(id, request);
    return request;
  }

  function rebasePipeline(id) {
    const progress = state.pipeline[id];
    const latest = progress?.decision?.latest;
    if (
      progress?.decision?.type !== 'pipelineConflict' ||
      !latest ||
      latest.id !== id ||
      !Number.isInteger(latest.version)
    ) {
      return false;
    }
    dispatch({ type: 'PIPELINE_RESOLVED', nurse: latest, resolution: 'rebase' });
    return true;
  }

  function requestDelete(id = state.selectedId) {
    if (state.deleteState === NurseAsyncState.LOADING) return false;
    const nurse =
      state.selectedId === id ? state.selected : state.items.find((item) => item.id === id);
    if (!nurse || !Number.isInteger(nurse.version) || nurse.version <= 0) return false;
    dispatch({
      type: 'DELETE_CONFIRM_REQUESTED',
      id,
      baseVersion: nurse.version,
      nurseName: nurse.fullName || 'this nurse',
    });
    return true;
  }

  function cancelDelete() {
    if (state.deleteState === NurseAsyncState.LOADING) return false;
    dispatch({ type: 'DELETE_CANCELLED' });
    return true;
  }

  function runDelete({ retry = false } = {}) {
    if (deleteRequest) return deleteRequest;
    const decision = state.deleteDecision;
    if (!decision || !['confirmDelete', 'deleteFailure'].includes(decision.type)) {
      return Promise.resolve({
        status: 'error',
        error: validationFailure('Delete confirmation is required.'),
      });
    }
    const { id, baseVersion } = decision;
    const retryCount = retry ? state.deleteRetryCount + 1 : state.deleteRetryCount;
    dispatch({ type: 'DELETE_STARTED' });
    deleteRequest = repository
      .remove(id, baseVersion, { retryCount })
      .then((result) => {
        if (result.status === 'deleted') {
          dispatch({ type: 'DELETE_CONVERGED', id, alreadyDeleted: false });
        } else if (result.status === 'alreadyDeleted') {
          dispatch({ type: 'DELETE_CONVERGED', id, alreadyDeleted: true });
        } else if (result.status === 'conflict') {
          dispatch({ type: 'DELETE_CONFLICT', id, current: result.current });
        } else {
          dispatch({ type: 'DELETE_FAILED', error: result.error, retryCount });
        }
        return result;
      })
      .finally(() => {
        deleteRequest = null;
      });
    return deleteRequest;
  }

  function confirmDelete() {
    return runDelete();
  }

  function retryDelete() {
    if (state.deleteDecision?.type !== 'deleteFailure' || !state.deleteDecision.retryAvailable) {
      return Promise.resolve({ status: 'error', error: state.deleteError });
    }
    return runDelete({ retry: true });
  }

  function reloadAfterDeleteConflict(options = {}) {
    const decision = state.deleteDecision;
    if (decision?.type !== 'deleteConflict') {
      return Promise.resolve({ status: 'error', error: state.deleteError });
    }
    const id = decision.id;
    dispatch({ type: 'DELETE_RELOAD_STARTED' });
    detailGeneration += 1;
    const generation = detailGeneration;
    dispatch({ type: 'DETAIL_STARTED', id, generation, preserveSession: true });
    return repository
      .get(id, { ...options, retryCount: (options.retryCount ?? 0) + 1 })
      .then((result) => {
        if (generation !== detailGeneration || state.selectedId !== id) return result;
        if (result.status === 'ok') {
          dispatch({ type: 'DETAIL_SUCCEEDED', nurse: result.nurse });
        } else if (result.status === 'notFound') {
          dispatch({ type: 'DELETE_CONVERGED', id, alreadyDeleted: true });
        } else {
          dispatch({ type: 'DETAIL_FAILED', error: result.error });
        }
        return result;
      });
  }

  function clearNotice() {
    dispatch({ type: 'NOTICE_CLEARED' });
  }

  return Object.freeze({
    getState,
    subscribe,
    refreshNurses,
    retryNurses,
    acceptLegacyCollection,
    openNurse,
    retryDetail,
    closeDetail,
    updateDraft,
    requestCancelEdit,
    resolveDiscard,
    openCreate,
    updateCreateDraft,
    closeCreate,
    createNurse,
    retryCreate,
    retryCreateAfterCollision,
    saveNurse,
    retrySave,
    applyConflictToLatest,
    requestDiscardConflict,
    keepEditingAfterConflict,
    changeNursePipeline,
    retryPipeline,
    reloadPipeline,
    rebasePipeline,
    requestDelete,
    cancelDelete,
    confirmDelete,
    retryDelete,
    reloadAfterDeleteConflict,
    clearNotice,
  });
}

export default createNurseController;
