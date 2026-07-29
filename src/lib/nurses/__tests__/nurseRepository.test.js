import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DataError, DataErrorCode } from '../../dataLayer/errors';
import { createNurseRepository, LIST_CONSISTENCY_ERROR } from '../nurseRepository';
import { createBlankNurseDraft, normalizeNurseCreateDraft } from '../nurseWorkflow';

const OWNER_ID = '2d7c6166-244a-4c75-9254-862913c71ba3';
const DRAFT_UUID = '11111111-1111-4111-8111-111111111111';

function validDraft(overrides = {}) {
  return {
    ...createBlankNurseDraft({
      now: new Date('2026-03-10T12:00:00.000Z'),
      randomUUID: () => DRAFT_UUID,
    }),
    fullName: 'Ada Nurse',
    ...overrides,
  };
}

function normalizedDraft(overrides = {}) {
  const result = normalizeNurseCreateDraft(validDraft(overrides));
  if (!result.valid) throw new Error('Test draft must be valid.');
  return result.value;
}

function committedNurse(overrides = {}) {
  return {
    ...normalizedDraft(overrides),
    ownerId: OWNER_ID,
    version: 1,
    createdAt: '2026-03-10T12:00:00.000Z',
    updatedAt: '2026-03-10T12:00:00.000Z',
  };
}

function operations(overrides = {}) {
  return {
    list: vi.fn(async () => ({ data: [], error: null, total: 0 })),
    get: vi.fn(async () => ({ data: null, error: null, notFound: true })),
    create: vi.fn(async (draft, identity) => ({
      data: {
        ...draft,
        ownerId: identity.ownerId ?? null,
        version: 1,
        createdAt: '2026-03-10T12:00:00.000Z',
        updatedAt: '2026-03-10T12:00:00.000Z',
      },
      error: null,
    })),
    update: vi.fn(async (id, patch, baseVersion) => ({
      data: { id, ...patch, version: baseVersion + 1 },
      error: null,
    })),
    remove: vi.fn(async () => ({ error: null, deleted: true, outcome: 'deleted' })),
    ...overrides,
  };
}

function activeSession() {
  return {
    session: {
      user: { id: OWNER_ID },
      access_token: 'test-session-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
    },
    userId: OWNER_ID,
    authEpoch: 1,
    error: null,
  };
}

function repository(ops, overrides = {}) {
  return createNurseRepository({
    operations: ops,
    supabase: true,
    requireActiveSession: vi.fn(async () => activeSession()),
    ...overrides,
  });
}

describe('nurseRepository complete pagination', () => {
  it('requests pages of 100 and returns only a complete, distinct aggregate', async () => {
    const nurses = Array.from({ length: 205 }, (_, index) => ({ id: `nurse-${index}` }));
    const ops = operations({
      list: vi.fn(async ({ page, pageSize }) => ({
        data: nurses.slice((page - 1) * pageSize, page * pageSize),
        error: null,
        total: nurses.length,
      })),
    });

    const result = await repository(ops).listAll();

    expect(result).toEqual({ status: 'ok', nurses, total: 205 });
    expect(ops.list.mock.calls).toEqual([
      [{ page: 1, pageSize: 100 }],
      [{ page: 2, pageSize: 100 }],
      [{ page: 3, pageSize: 100 }],
    ]);
  });

  it('discards partial pages and returns the categorized page failure', async () => {
    const pageFailure = new DataError(DataErrorCode.NETWORK);
    const ops = operations({
      list: vi
        .fn()
        .mockResolvedValueOnce({
          data: Array.from({ length: 100 }, (_, index) => ({ id: `nurse-${index}` })),
          error: null,
          total: 101,
        })
        .mockResolvedValueOnce({ data: [], error: pageFailure, total: 0 }),
    });

    const result = await repository(ops).listAll();

    expect(result).toEqual({ status: 'error', error: pageFailure });
    expect(result).not.toHaveProperty('nurses');
  });

  it('preserves a plain categorized NETWORK failure from page 2 by identity', async () => {
    const pageFailure = Object.freeze({
      code: DataErrorCode.NETWORK,
      message: 'Unable to load the next page.',
    });
    const invalidateSession = vi.fn();
    const ops = operations({
      list: vi
        .fn()
        .mockResolvedValueOnce({
          data: Array.from({ length: 100 }, (_, index) => ({ id: `nurse-${index}` })),
          error: null,
          total: 101,
        })
        .mockResolvedValueOnce({ data: [], error: pageFailure, total: 101 }),
    });

    const result = await repository(ops, { invalidateSession }).listAll();

    expect(result).toEqual({ status: 'error', error: pageFailure });
    expect(result.error).toBe(pageFailure);
    expect(result).not.toHaveProperty('nurses');
    expect(invalidateSession).not.toHaveBeenCalled();
  });

  it.each([
    {
      label: 'duplicate identifiers',
      pages: [{ data: [{ id: 'same' }, { id: 'same' }], error: null, total: 2 }],
    },
    {
      label: 'a changing total',
      pages: [
        {
          data: Array.from({ length: 100 }, (_, index) => ({ id: `nurse-${index}` })),
          error: null,
          total: 101,
        },
        { data: [{ id: 'nurse-100' }], error: null, total: 102 },
      ],
    },
    {
      label: 'a final distinct count below the total',
      pages: [{ data: [{ id: 'only-one' }], error: null, total: 2 }],
    },
    {
      label: 'an oversized page',
      pages: [
        {
          data: Array.from({ length: 101 }, (_, index) => ({ id: `nurse-${index}` })),
          error: null,
          total: 101,
        },
      ],
    },
  ])('rejects $label without exposing an aggregate', async ({ pages }) => {
    const ops = operations({
      list: vi.fn(async ({ page }) => pages[page - 1] ?? { data: [], error: null, total: 0 }),
    });

    const result = await repository(ops).listAll();

    expect(result.status).toBe('error');
    expect(result.error.code).toBe(LIST_CONSISTENCY_ERROR);
    expect(result).not.toHaveProperty('nurses');
  });
});

describe('nurseRepository authentication and mutations', () => {
  let ops;

  beforeEach(() => {
    ops = operations();
  });

  it('requires an active Supabase session before every persistence operation', async () => {
    const repo = repository(ops, {
      requireActiveSession: vi.fn(async () => ({ session: null, error: null })),
    });
    const draft = validDraft();

    const results = await Promise.all([
      repo.listAll(),
      repo.get('nurse-1'),
      repo.create(draft),
      repo.save('nurse-1', { fullName: 'Updated' }, 1),
      repo.remove('nurse-1', 1),
    ]);

    expect(results.every((result) => result.status === 'error')).toBe(true);
    expect(results.every((result) => result.error.code === DataErrorCode.AUTH)).toBe(true);
    expect(ops.list).not.toHaveBeenCalled();
    expect(ops.get).not.toHaveBeenCalled();
    expect(ops.create).not.toHaveBeenCalled();
    expect(ops.update).not.toHaveBeenCalled();
    expect(ops.remove).not.toHaveBeenCalled();
  });

  it('invalidates shared readiness only after a server AUTH response and blocks later requests', async () => {
    const serverAuth = new DataError(DataErrorCode.AUTH);
    ops.list.mockResolvedValueOnce({ data: [], error: serverAuth, total: 0 });
    let blocked = false;
    const requireActiveSession = vi.fn(async () =>
      blocked
        ? { session: null, userId: null, authEpoch: 1, error: new Error('blocked') }
        : activeSession()
    );
    const invalidateSession = vi.fn(({ userId, authEpoch }) => {
      expect({ userId, authEpoch }).toEqual({ userId: OWNER_ID, authEpoch: 1 });
      blocked = true;
      return true;
    });
    const repo = repository(ops, { requireActiveSession, invalidateSession });

    const rejected = await repo.listAll();
    const blockedResult = await repo.listAll();

    expect(rejected).toEqual({ status: 'error', error: serverAuth });
    expect(blockedResult).toMatchObject({ status: 'error', error: { code: DataErrorCode.AUTH } });
    expect(invalidateSession).toHaveBeenCalledTimes(1);
    expect(ops.list).toHaveBeenCalledTimes(1);
  });

  it('maps a server 401 to AUTH for the captured epoch but never invalidates local validation', async () => {
    const server401 = { status: 401, message: 'Unauthorized' };
    ops.get.mockResolvedValueOnce({ data: null, error: server401 });
    const invalidateSession = vi.fn(() => true);
    const repo = repository(ops, { invalidateSession });

    const localFailure = await repo.get('');
    expect(localFailure).toMatchObject({
      status: 'error',
      error: { code: DataErrorCode.VALIDATION },
    });
    expect(invalidateSession).not.toHaveBeenCalled();
    expect(ops.get).not.toHaveBeenCalled();

    const rejected = await repo.get('nurse-1');
    expect(rejected).toMatchObject({ status: 'error', error: { code: DataErrorCode.AUTH } });
    expect(rejected.error.cause).toBe(server401);
    expect(invalidateSession).toHaveBeenCalledWith({ userId: OWNER_ID, authEpoch: 1 });
  });

  it('does not invalidate shared readiness for a local gateway AUTH failure', async () => {
    const invalidateSession = vi.fn();
    const repo = repository(ops, {
      requireActiveSession: vi.fn(async () => ({
        session: null,
        userId: null,
        authEpoch: 4,
        error: new Error('Authentication required.'),
      })),
      invalidateSession,
    });

    const result = await repo.listAll();

    expect(result).toMatchObject({ status: 'error', error: { code: DataErrorCode.AUTH } });
    expect(invalidateSession).not.toHaveBeenCalled();
    expect(ops.list).not.toHaveBeenCalled();
  });

  it('assigns owner identity from the session and returns the authoritative create row', async () => {
    const committed = committedNurse();
    ops.create.mockResolvedValueOnce({ data: committed, error: null });
    const draft = validDraft();

    const result = await repository(ops).create(draft);

    expect(result).toEqual({ status: 'saved', nurse: committed });
    expect(ops.create).toHaveBeenCalledWith(normalizedDraft(), {
      id: draft.id,
      ownerId: OWNER_ID,
    });
    expect(result.nurse).toBe(committed);
  });

  it('reads the retained draft ID before retrying an ambiguous create', async () => {
    const committed = committedNurse();
    ops.create.mockResolvedValueOnce({
      data: null,
      error: new DataError(DataErrorCode.NETWORK),
    });
    ops.get.mockResolvedValueOnce({ data: committed, error: null });
    const repo = repository(ops);
    const draft = validDraft();

    const first = await repo.create(draft);
    const retried = await repo.create(draft);

    expect(first).toMatchObject({ status: 'error', error: { code: 'NETWORK' } });
    expect(retried).toEqual({ status: 'saved', nurse: committed });
    expect(ops.get).toHaveBeenCalledWith(draft.id);
    expect(ops.create).toHaveBeenCalledTimes(1);
  });

  it('reports a verified collision without reinserting and accepts a fresh explicit draft ID', async () => {
    const collision = committedNurse({ fullName: 'Different Nurse' });
    ops.create
      .mockResolvedValueOnce({
        data: null,
        error: new DataError(DataErrorCode.CONFLICT),
      })
      .mockImplementationOnce(async (draft, identity) => ({
        data: {
          ...draft,
          ownerId: identity.ownerId,
          version: 1,
          createdAt: '2026-03-10T12:00:00.000Z',
          updatedAt: '2026-03-10T12:00:00.000Z',
        },
        error: null,
      }));
    ops.get.mockResolvedValueOnce({ data: collision, error: null });
    const repo = repository(ops);
    const original = validDraft();

    const collided = await repo.create(original);
    const fresh = validDraft({
      id: 'nurse-22222222-2222-4222-8222-222222222222',
    });
    const saved = await repo.create(fresh);

    expect(collided).toMatchObject({
      status: 'collision',
      current: collision,
      error: { code: DataErrorCode.CONFLICT },
    });
    expect(saved).toMatchObject({ status: 'saved', nurse: { id: fresh.id } });
    expect(ops.create).toHaveBeenCalledTimes(2);
    expect(ops.create.mock.calls[1][1]).toEqual({ id: fresh.id, ownerId: OWNER_ID });
  });

  it('gates updates/deletes and maps authoritative outcomes', async () => {
    const committed = { id: 'nurse-1', fullName: 'Committed', version: 4 };
    ops.update.mockResolvedValueOnce({ data: committed, error: null });
    ops.remove.mockResolvedValueOnce({
      error: null,
      conflict: { current: committed },
      outcome: 'conflict',
    });
    const repo = repository(ops);

    const invalidSave = await repo.save('', { fullName: 'No write' }, 3);
    const saved = await repo.save('nurse-1', { id: 'nurse-1', fullName: 'Draft', version: 3 }, 3);
    const conflict = await repo.remove('nurse-1', 3);
    const invalidDelete = await repo.remove('nurse-1', undefined);

    expect(invalidSave).toMatchObject({ status: 'error', error: { code: 'VALIDATION' } });
    expect(saved).toEqual({ status: 'saved', nurse: committed });
    expect(ops.update).toHaveBeenCalledWith('nurse-1', { fullName: 'Draft' }, 3);
    expect(conflict).toEqual({ status: 'conflict', current: committed });
    expect(invalidDelete).toMatchObject({ status: 'error', error: { code: 'VALIDATION' } });
    expect(ops.remove).toHaveBeenCalledTimes(1);
  });
});

describe('nurseRepository privacy-safe operation metadata', () => {
  it('emits only the approved metadata allowlist', async () => {
    const events = [];
    const ops = operations({
      get: vi.fn(async () => ({ data: committedNurse(), error: null })),
    });
    const repo = repository(ops, {
      emitOperation: (event) => events.push(event),
      now: vi.fn().mockReturnValueOnce(100).mockReturnValueOnce(112.4),
    });

    await repo.get('nurse-sensitive', {
      retryCount: 2,
      requestId: 'request-123',
      fullName: 'Must not be emitted',
      email: 'private@example.test',
      accessToken: 'secret',
    });

    expect(events).toEqual([
      {
        operation: 'detail',
        outcome: 'success',
        backend: 'supabase',
        durationMs: 12,
        retryCount: 2,
        requestId: 'request-123',
      },
    ]);
    expect(Object.keys(events[0]).sort()).toEqual(
      ['operation', 'outcome', 'backend', 'durationMs', 'retryCount', 'requestId'].sort()
    );
  });
});
