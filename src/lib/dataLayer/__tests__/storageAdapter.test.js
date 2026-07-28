import { beforeEach, describe, expect, it, vi } from 'vitest';

import * as storage from '../../storage';
import { STORAGE_PREFIX } from '../../storageKeys';
import * as adapter from '../storageAdapter';

/**
 * Task 2.3 — Legacy localStorage adapter.
 *
 * Verifies the async envelope wrapper over storage.js: retrieval/persistence per
 * domain, empty-list contract, pagination clamping, eq-filtering, sort, and
 * optimistic-concurrency conflict surfacing. (Req 6.1, 6.3, 9.1)
 */

const SEED = [
  { id: 'nurse-001', tier: 'A', pipeline_stage: 'screening', version: 1 },
  { id: 'nurse-002', tier: 'B', pipeline_stage: 'screening', version: 1 },
  { id: 'nurse-003', tier: 'A', pipeline_stage: 'offer', version: 3 },
];

beforeEach(() => {
  localStorage.clear();
  storage.saveNurses(SEED.map((n) => ({ ...n })));
});

describe('storageAdapter retrieval', () => {
  it('getCollection returns the whole array', async () => {
    const { data, error } = await adapter.getCollection('nurses');
    expect(error).toBeNull();
    expect(data).toHaveLength(3);
  });

  it('list returns an empty array (never null) when nothing matches (Req 6.3)', async () => {
    const { data, error } = await adapter.list('nurses', {
      filters: { tier: 'Z' },
    });
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('list applies eq filters', async () => {
    const { data, total } = await adapter.list('nurses', {
      filters: { tier: 'A' },
    });
    expect(total).toBe(2);
    expect(data.every((n) => n.tier === 'A')).toBe(true);
  });

  it('list clamps page size to the [1,100] range', async () => {
    const tooBig = await adapter.list('nurses', { pageSize: 5000 });
    expect(tooBig.pageSize).toBe(100);
    const tooSmall = await adapter.list('nurses', { pageSize: 0 });
    expect(tooSmall.pageSize).toBe(1);
    expect(tooSmall.data).toHaveLength(1);
  });

  it('getById finds a record and returns null when absent', async () => {
    const found = await adapter.getById('nurses', 'nurse-002');
    expect(found.data?.id).toBe('nurse-002');
    const missing = await adapter.getById('nurses', 'nope');
    expect(missing.data).toBeNull();
  });

  it('returns a VALIDATION error for an unknown domain', async () => {
    const { error } = await adapter.list('not-a-domain');
    expect(error?.code).toBe('VALIDATION');
  });
});

describe('storageAdapter persistence', () => {
  it('create appends and persists the record', async () => {
    const { data, error } = await adapter.create('nurses', {
      id: 'nurse-004',
      tier: 'C',
      version: 1,
    });
    expect(error).toBeNull();
    expect(data.id).toBe('nurse-004');
    expect(storage.getNurses()).toHaveLength(4);
  });

  it('update applies changes and bumps version', async () => {
    const { data, error } = await adapter.update(
      'nurses',
      'nurse-001',
      { tier: 'S' },
      1,
    );
    expect(error).toBeNull();
    expect(data.tier).toBe('S');
    expect(data.version).toBe(2);
  });

  it('update returns a conflict on stale baseVersion, leaving data unchanged', async () => {
    const { data, conflict } = await adapter.update(
      'nurses',
      'nurse-003',
      { tier: 'S' },
      1, // stale: committed version is 3
    );
    expect(data).toBeNull();
    expect(conflict.current.version).toBe(3);
    expect(storage.getNurses().find((n) => n.id === 'nurse-003').tier).toBe('A');
  });

  it('remove deletes a record', async () => {
    const { error } = await adapter.remove('nurses', 'nurse-002', 1);
    expect(error).toBeNull();
    expect(storage.getNurses().some((n) => n.id === 'nurse-002')).toBe(false);
  });

  it('remove returns a conflict on stale baseVersion', async () => {
    const { conflict } = await adapter.remove('nurses', 'nurse-003', 1);
    expect(conflict.current.version).toBe(3);
    expect(storage.getNurses()).toHaveLength(3);
  });

  it('bulkUpsert creates and updates by primary key', async () => {
    const { error } = await adapter.bulkUpsert('nurses', [
      { id: 'nurse-001', tier: 'X', version: 9 },
      { id: 'nurse-999', tier: 'new', version: 1 },
    ]);
    expect(error).toBeNull();
    const rows = storage.getNurses();
    expect(rows).toHaveLength(4);
    expect(rows.find((n) => n.id === 'nurse-001').tier).toBe('X');
  });

  it('saveCollection persists the whole array', async () => {
    await adapter.saveCollection('nurses', []);
    expect(storage.getNurses()).toEqual([]);
  });

  it('reports write failures without changing persisted nurses or the submitted draft', async () => {
    const persistedBefore = structuredClone(storage.getNurses());
    const draft = persistedBefore.map((nurse) => ({ ...nurse, tier: 'unsaved' }));
    const draftBefore = structuredClone(draft);
    const originalSetItem = localStorage.setItem.bind(localStorage);
    const setItemFailure = vi
      .spyOn(localStorage, 'setItem')
      .mockImplementation((key, value) => {
        if (key === `${STORAGE_PREFIX}nurses`) {
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        }
        return originalSetItem(key, value);
      });

    const result = await adapter.saveCollection('nurses', draft);
    setItemFailure.mockRestore();

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('STORAGE');
    expect(draft).toEqual(draftBefore);
    expect(storage.getNurses()).toEqual(persistedBefore);
  });

  it('reports read failures without replacing the last accepted nurse collection', async () => {
    const acceptedBefore = structuredClone(storage.getNurses());
    const originalGetItem = localStorage.getItem.bind(localStorage);
    const getItemFailure = vi
      .spyOn(localStorage, 'getItem')
      .mockImplementation((key) => {
        if (key === `${STORAGE_PREFIX}nurses`) {
          throw new DOMException('Storage access denied', 'SecurityError');
        }
        return originalGetItem(key);
      });

    const result = await adapter.getCollection('nurses');
    getItemFailure.mockRestore();

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('STORAGE');
    expect(storage.getNurses()).toEqual(acceptedBefore);
  });
});

describe('storageAdapter bulkUpdate (atomic all-or-none)', () => {
  it('applies every change and bumps versions on success', async () => {
    const { data, error, conflict } = await adapter.bulkUpdate('nurses', [
      { id: 'nurse-001', version: 1, tier: 'X' },
      { id: 'nurse-002', version: 1, tier: 'Y' },
    ]);
    expect(error).toBeNull();
    expect(conflict).toBeUndefined();
    expect(data).toHaveLength(2);

    const rows = storage.getNurses();
    expect(rows.find((n) => n.id === 'nurse-001').tier).toBe('X');
    expect(rows.find((n) => n.id === 'nurse-001').version).toBe(2);
    expect(rows.find((n) => n.id === 'nurse-002').tier).toBe('Y');
  });

  it('commits NOTHING when any element has a stale version (rollback)', async () => {
    const before = storage.getNurses();
    const { data, error, conflict } = await adapter.bulkUpdate('nurses', [
      { id: 'nurse-001', version: 1, tier: 'X' }, // valid
      { id: 'nurse-003', version: 1, tier: 'Y' }, // stale: committed version is 3
    ]);
    expect(data).toBeNull();
    expect(error).toBeNull();
    expect(conflict.ids).toContain('nurse-003');
    // No partial application — the store is unchanged.
    expect(storage.getNurses()).toEqual(before);
  });

  it('rejects a batch targeting a missing row as a conflict, committing nothing', async () => {
    const before = storage.getNurses();
    const { conflict } = await adapter.bulkUpdate('nurses', [
      { id: 'nurse-001', version: 1, tier: 'X' },
      { id: 'ghost', version: 1, tier: 'Z' },
    ]);
    expect(conflict.ids).toContain('ghost');
    expect(storage.getNurses()).toEqual(before);
  });

  it('treats an empty batch as a successful no-op', async () => {
    const before = storage.getNurses();
    const { data, error } = await adapter.bulkUpdate('nurses', []);
    expect(error).toBeNull();
    expect(data).toEqual([]);
    expect(storage.getNurses()).toEqual(before);
  });
});
