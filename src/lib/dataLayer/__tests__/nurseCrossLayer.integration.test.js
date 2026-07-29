import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createNurseController } from '../../nurses/nurseController';
import { createNurseRepository } from '../../nurses/nurseRepository';
import * as storage from '../../storage';
import * as storageAdapter from '../storageAdapter';
import * as supabaseAdapter from '../supabaseAdapter';
import { FailingSupabaseClient, FakeSupabaseClient } from './fakeSupabase';

const h = vi.hoisted(() => ({
  seedNurses: vi.fn(),
}));

vi.mock('../../../data/seedNurses', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    seedNurses: (...args) => {
      h.seedNurses(...args);
      return actual.seedNurses(...args);
    },
  };
});

/**
 * Deterministic adapter -> repository -> controller integration coverage.
 *
 * Validates: Requirements 1.3, 1.4, 1.5, 1.6, 1.8, 1.9, 1.10, 1.11,
 * 1.12, 2.12, 3.14, 4.8, 6.6, 6.8, 7.6, 7.7, 7.8, 9.13,
 * 10.2, 10.3, 10.4, 10.5, 10.6, 10.7
 */

const OWNER_ID = '2d7c6166-244a-4c75-9254-862913c71ba3';
const CREATED_AT = '2026-03-10T12:00:00.000Z';
const DRAFT_UUID = '11111111-1111-4111-8111-111111111111';

function nurseRow(index = 1, overrides = {}) {
  return {
    id: `nurse-${String(index).padStart(3, '0')}`,
    owner_id: OWNER_ID,
    full_name: `Remote Nurse ${index}`,
    preferred_name: `Remote ${index}`,
    pipeline_stage: 'Applied',
    readiness_status: 'Not Ready',
    cohort_assigned: null,
    oet_status: 'Not Started',
    final_score: 0,
    tier: '',
    email: '',
    scorecard_fields: {},
    additional_certifications: [],
    communication_log: [],
    attributes: { flags: 0, city: 'Cape Town' },
    version: 1,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    ...overrides,
  };
}

function activeSession() {
  return {
    session: {
      user: { id: OWNER_ID },
      access_token: 'test-session-token',
      expires_at: 4_102_444_800,
    },
    error: null,
  };
}

function operations(adapter) {
  return {
    list: adapter.listNurses,
    get: adapter.getNurse,
    create: adapter.createNurse,
    update: adapter.updateNurse,
    remove: adapter.deleteNurse,
  };
}

function repository(adapter, supabase) {
  return createNurseRepository({
    operations: operations(adapter),
    supabase,
    requireActiveSession: vi.fn(async () => activeSession()),
    sessionExpired: () => false,
    emitOperation: vi.fn(),
  });
}

function committedState(controller) {
  const state = controller.getState();
  return structuredClone({
    items: state.items,
    total: state.total,
    selectedId: state.selectedId,
    selected: state.selected,
    originalBase: state.originalBase,
    baseVersion: state.baseVersion,
  });
}

beforeEach(() => {
  localStorage.clear();
  h.seedNurses.mockClear();
});

afterEach(() => {
  supabaseAdapter.__setClientFactory(null);
  vi.restoreAllMocks();
});

describe('Supabase cross-layer nurse integration', () => {
  it('accepts an empty remote table without reading, writing, or seeding legacy storage', async () => {
    const localOnly = [{ id: 'local-only', fullName: 'Bundled Local Nurse' }];
    storage.saveNurses(localOnly);
    const client = new FakeSupabaseClient({ nurses: [] });
    supabaseAdapter.__setClientFactory(() => client);
    const controller = createNurseController({
      repository: repository(supabaseAdapter, true),
    });
    const getItem = vi.spyOn(localStorage, 'getItem');
    const setItem = vi.spyOn(localStorage, 'setItem');

    await controller.refreshNurses();
    controller.openCreate({
      now: new Date(CREATED_AT),
      randomUUID: () => DRAFT_UUID,
    });
    controller.updateCreateDraft({ fullName: 'Remote Only Nurse' });
    await controller.createNurse();
    await controller.refreshNurses();

    expect(controller.getState()).toMatchObject({
      items: [
        {
          id: `nurse-${DRAFT_UUID}`,
          ownerId: OWNER_ID,
          fullName: 'Remote Only Nurse',
          version: 1,
        },
      ],
      total: 1,
      listError: null,
      staleWarning: false,
    });
    expect(client.snapshot('nurses')).toHaveLength(1);
    expect(getItem).not.toHaveBeenCalled();
    expect(setItem).not.toHaveBeenCalled();
    expect(h.seedNurses).not.toHaveBeenCalled();

    getItem.mockRestore();
    setItem.mockRestore();
    expect(storage.getNurses()).toEqual(localOnly);
  });

  it('decodes and accepts every row from a complete three-page remote aggregate', async () => {
    const rows = Array.from({ length: 205 }, (_, index) => nurseRow(index + 1));
    const client = new FakeSupabaseClient({ nurses: rows });
    supabaseAdapter.__setClientFactory(() => client);
    const controller = createNurseController({
      repository: repository(supabaseAdapter, true),
    });

    const result = await controller.refreshNurses();

    expect(result).toMatchObject({ status: 'ok', total: 205 });
    expect(controller.getState().items).toHaveLength(205);
    expect(controller.getState().items[0]).toMatchObject({
      id: 'nurse-001',
      fullName: 'Remote Nurse 1',
      ownerId: OWNER_ID,
      city: 'Cape Town',
    });
    expect(controller.getState().items[0]).not.toHaveProperty('full_name');
    expect(
      client.calls
        .filter((call) => call.table === 'nurses' && call.operation === 'select')
        .map((call) => call.range)
    ).toEqual([
      [0, 99],
      [100, 199],
      [200, 299],
    ]);
  });

  it('preserves confirmed state and the edit draft while exposing a decoded conflict row', async () => {
    const originalRow = nurseRow(1);
    const client = new FakeSupabaseClient({ nurses: [originalRow] });
    supabaseAdapter.__setClientFactory(() => client);
    const controller = createNurseController({
      repository: repository(supabaseAdapter, true),
    });

    await controller.refreshNurses();
    await controller.openNurse(originalRow.id);
    controller.updateDraft({ preferredName: 'Local Draft' });
    const before = committedState(controller);

    const external = await supabaseAdapter.updateNurse(
      originalRow.id,
      { preferredName: 'Server Commit' },
      1
    );
    expect(external.data).toMatchObject({ preferredName: 'Server Commit', version: 2 });

    const result = await controller.saveNurse();

    expect(result).toMatchObject({
      status: 'conflict',
      current: {
        id: originalRow.id,
        preferredName: 'Server Commit',
        version: 2,
      },
    });
    expect(result.current).not.toHaveProperty('preferred_name');
    expect(committedState(controller)).toEqual(before);
    expect(controller.getState()).toMatchObject({
      draft: { preferredName: 'Local Draft' },
      saveDecision: {
        type: 'saveConflict',
        latest: { preferredName: 'Server Commit', version: 2 },
      },
    });
  });

  it('converges an externally removed row through the already-deleted result', async () => {
    const originalRow = nurseRow(1);
    const client = new FakeSupabaseClient({ nurses: [originalRow] });
    supabaseAdapter.__setClientFactory(() => client);
    const controller = createNurseController({
      repository: repository(supabaseAdapter, true),
    });

    await controller.refreshNurses();
    await controller.openNurse(originalRow.id);
    expect(controller.requestDelete()).toBe(true);
    await supabaseAdapter.deleteNurse(originalRow.id, 1);

    const result = await controller.confirmDelete();

    expect(result).toEqual({ status: 'alreadyDeleted' });
    expect(controller.getState()).toMatchObject({
      items: [],
      total: 0,
      selectedId: null,
      selected: null,
      notice: {
        type: 'alreadyDeleted',
        message: 'This nurse was already deleted.',
      },
    });
  });

  it('keeps the last accepted list, selected record, and draft atomic across remote failures', async () => {
    const originalRow = nurseRow(1);
    const client = new FakeSupabaseClient({ nurses: [originalRow] });
    supabaseAdapter.__setClientFactory(() => client);
    const controller = createNurseController({
      repository: repository(supabaseAdapter, true),
    });

    await controller.refreshNurses();
    await controller.openNurse(originalRow.id);
    controller.updateDraft({ preferredName: 'Unsaved Local Draft' });
    const before = committedState(controller);
    const draftBefore = structuredClone(controller.getState().draft);
    supabaseAdapter.__setClientFactory(
      () => new FailingSupabaseClient(new TypeError('Failed to fetch'))
    );

    const saveResult = await controller.saveNurse();
    expect(saveResult).toMatchObject({ status: 'error', error: { code: 'NETWORK' } });
    expect(committedState(controller)).toEqual(before);
    expect(controller.getState().draft).toEqual(draftBefore);

    const refreshResult = await controller.refreshNurses();
    expect(refreshResult).toMatchObject({ status: 'error', error: { code: 'NETWORK' } });
    expect(committedState(controller)).toEqual(before);
    expect(controller.getState()).toMatchObject({
      draft: draftBefore,
      staleWarning: true,
      listError: { code: 'NETWORK' },
    });
  });
});

describe('legacy cross-layer nurse integration', () => {
  it('matches seven-nurse initialization and persists camelCase record commands across refreshes', async () => {
    storage.initializeData();
    expect(h.seedNurses).toHaveBeenCalled();
    expect(storage.getNurses()).toHaveLength(7);

    const controller = createNurseController({
      repository: repository(storageAdapter, false),
    });
    await controller.refreshNurses();
    const first = controller.getState().items[0];

    expect(controller.getState()).toMatchObject({ total: 7, listError: null });
    expect(first).not.toHaveProperty('full_name');

    await controller.openNurse(first.id);
    controller.updateDraft({ preferredName: 'Persisted Legacy Edit' });
    await controller.saveNurse();

    controller.openCreate({
      now: new Date(CREATED_AT),
      randomUUID: () => DRAFT_UUID,
    });
    controller.updateCreateDraft({ fullName: 'Legacy Created Nurse' });
    await controller.createNurse();
    await controller.refreshNurses();

    const createdId = `nurse-${DRAFT_UUID}`;
    expect(controller.getState()).toMatchObject({
      total: 8,
      items: expect.arrayContaining([
        expect.objectContaining({
          id: first.id,
          preferredName: 'Persisted Legacy Edit',
          version: 2,
        }),
        expect.objectContaining({
          id: createdId,
          fullName: 'Legacy Created Nurse',
          version: 1,
        }),
      ]),
    });

    await controller.openNurse(createdId);
    expect(controller.requestDelete()).toBe(true);
    await controller.confirmDelete();
    await controller.refreshNurses();

    const persisted = storage.getNurses();
    expect(persisted).toHaveLength(7);
    expect(persisted.some((nurse) => nurse.id === createdId)).toBe(false);
    expect(persisted.find((nurse) => nurse.id === first.id)).toMatchObject({
      preferredName: 'Persisted Legacy Edit',
      version: 2,
    });
    expect(persisted.every((nurse) => !('full_name' in nurse))).toBe(true);
  });
});
