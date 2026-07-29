import { afterEach, describe, expect, it, vi } from 'vitest';

import { createNurseController } from '../../nurses/nurseController';
import { createNurseRepository } from '../../nurses/nurseRepository';
import { createBlankNurseDraft } from '../../nurses/nurseWorkflow';
import { DataErrorCode } from '../errors';
import * as supabaseAdapter from '../supabaseAdapter';
import { REQUEST_TIMEOUT_MS } from '../supabaseAdapter';
import { FailingSupabaseClient, FakeSupabaseClient } from './fakeSupabase';

/**
 * Fake-Supabase adapter/authorization integration coverage for nurse-management 7.3.
 *
 * Validates: Requirements 3.4, 3.13, 4.1, 4.2, 4.10, 6.8, 7.7, 7.8,
 * 7.9, 7.10, 7.11, 9.1, 9.2, 9.4, 9.5, 9.6, 9.7, 9.8, 9.9
 */

const OWNER_ID = '2d7c6166-244a-4c75-9254-862913c71ba3';
const OTHER_OWNER_ID = '8f7e61c3-f6e4-472f-9818-b8ea4c8a5897';
const DRAFT_UUID = '11111111-1111-4111-8111-111111111111';
const CREATED_AT = '2026-03-10T12:00:00.000Z';

function nurseRow(overrides = {}) {
  return {
    id: 'nurse-existing',
    owner_id: OWNER_ID,
    full_name: 'Ada Nurse',
    preferred_name: 'Ada',
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
    attributes: { flags: 0, notesFlags: '' },
    version: 1,
    created_at: CREATED_AT,
    updated_at: CREATED_AT,
    ...overrides,
  };
}

function validDraft(overrides = {}) {
  return {
    ...createBlankNurseDraft({
      now: new Date(CREATED_AT),
      randomUUID: () => DRAFT_UUID,
    }),
    fullName: 'Grace Nurse',
    ...overrides,
  };
}

function activeSession() {
  return {
    session: {
      user: { id: OWNER_ID },
      access_token: 'public-client-session-token',
      expires_at: 4_102_444_800,
    },
    error: null,
  };
}

function adapterOperations() {
  return {
    list: supabaseAdapter.listNurses,
    get: supabaseAdapter.getNurse,
    create: supabaseAdapter.createNurse,
    update: supabaseAdapter.updateNurse,
    remove: supabaseAdapter.deleteNurse,
  };
}

function repository(overrides = {}) {
  return createNurseRepository({
    operations: adapterOperations(),
    supabase: true,
    requireActiveSession: vi.fn(async () => activeSession()),
    sessionExpired: () => false,
    ...overrides,
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

async function loadedController(client) {
  supabaseAdapter.__setClientFactory(() => client);
  const controller = createNurseController({ repository: repository() });
  await controller.refreshNurses();
  await controller.openNurse('nurse-existing');
  return controller;
}

class HangingSupabaseClient {
  from() {
    const builder = {
      select: () => builder,
      range: () => builder,
      eq: () => builder,
      order: () => builder,
      maybeSingle: () => builder,
      then: () => {},
    };
    return builder;
  }
}

afterEach(() => {
  vi.useRealTimers();
  supabaseAdapter.__setClientFactory(null);
});

describe('fake-Supabase nurse adapter and authorization integration', () => {
  it('encodes generated create identity and decodes camelCase rows', async () => {
    const client = new FakeSupabaseClient({ nurses: [] });
    supabaseAdapter.__setClientFactory(() => client);
    const controller = createNurseController({ repository: repository() });

    await controller.refreshNurses();
    const draft = controller.openCreate({
      now: new Date(CREATED_AT),
      randomUUID: () => DRAFT_UUID,
    });
    controller.updateCreateDraft({
      fullName: 'Grace Nurse',
      preferredName: 'Grace',
    });
    const result = await controller.createNurse();

    const expectedId = `nurse-${DRAFT_UUID}`;
    expect(draft.id).toBe(expectedId);
    expect(result).toMatchObject({
      status: 'saved',
      nurse: {
        id: expectedId,
        ownerId: OWNER_ID,
        fullName: 'Grace Nurse',
        preferredName: 'Grace',
        version: 1,
      },
    });
    expect(result.nurse).not.toHaveProperty('owner_id');
    expect(result.nurse).not.toHaveProperty('full_name');

    const inserted = client.snapshot('nurses');
    expect(inserted).toHaveLength(1);
    expect(inserted[0]).toMatchObject({
      id: expectedId,
      owner_id: OWNER_ID,
      full_name: 'Grace Nurse',
      preferred_name: 'Grace',
      version: 1,
    });
    expect(inserted[0]).not.toHaveProperty('ownerId');
    expect(inserted[0]).not.toHaveProperty('fullName');

    await controller.refreshNurses();
    await controller.openNurse(expectedId);
    expect(controller.getState()).toMatchObject({
      items: [{ id: expectedId, ownerId: OWNER_ID, fullName: 'Grace Nurse' }],
      selected: { id: expectedId, ownerId: OWNER_ID, fullName: 'Grace Nurse' },
    });
  });

  it('enforces version gates and owner immutability', async () => {
    const client = new FakeSupabaseClient({ nurses: [nurseRow()] });
    supabaseAdapter.__setClientFactory(() => client);
    const repo = repository();

    const saved = await repo.save('nurse-existing', { preferredName: 'Updated' }, 1);
    expect(saved).toMatchObject({
      status: 'saved',
      nurse: { preferredName: 'Updated', ownerId: OWNER_ID, version: 2 },
    });
    const updateCall = client.calls.find((call) => call.operation === 'update');
    expect(updateCall.filters).toEqual([
      ['id', 'nurse-existing'],
      ['version', 1],
    ]);

    const staleSave = await repo.save('nurse-existing', { preferredName: 'Stale' }, 1);
    expect(staleSave).toMatchObject({
      status: 'conflict',
      current: { preferredName: 'Updated', ownerId: OWNER_ID, version: 2 },
    });
    expect(staleSave.current).not.toHaveProperty('preferred_name');

    const beforeOwnerAttempt = client.snapshot('nurses');
    const callsBeforeOwnerAttempt = client.calls.length;
    const ownerAttempt = await supabaseAdapter.updateNurse(
      'nurse-existing',
      { ownerId: OTHER_OWNER_ID },
      2
    );
    expect(ownerAttempt).toMatchObject({
      error: { code: DataErrorCode.VALIDATION },
    });
    expect(client.calls).toHaveLength(callsBeforeOwnerAttempt);
    expect(client.snapshot('nurses')).toEqual(beforeOwnerAttempt);

    const staleDelete = await repo.remove('nurse-existing', 1);
    expect(staleDelete).toMatchObject({
      status: 'conflict',
      current: { preferredName: 'Updated', ownerId: OWNER_ID, version: 2 },
    });
    expect(client.snapshot('nurses')).toEqual(beforeOwnerAttempt);

    const deleted = await repo.remove('nurse-existing', 2);
    expect(deleted).toEqual({ status: 'deleted' });
    expect(client.snapshot('nurses')).toEqual([]);

    const alreadyDeleted = await repo.remove('nurse-existing', 2);
    expect(alreadyDeleted).toEqual({ status: 'alreadyDeleted' });
  });

  it('uses the shared adapter timeout and maps a hanging request to NETWORK', async () => {
    vi.useFakeTimers();
    supabaseAdapter.__setClientFactory(() => new HangingSupabaseClient());

    const pending = supabaseAdapter.listNurses();
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS);
    const result = await pending;

    expect(result).toMatchObject({
      data: [],
      total: 0,
      error: { code: DataErrorCode.NETWORK },
    });
  });

  it('issues no Supabase query when there is no active session', async () => {
    const client = new FakeSupabaseClient({ nurses: [nurseRow()] });
    const clientFactory = vi.fn(() => client);
    supabaseAdapter.__setClientFactory(clientFactory);
    const repo = repository({
      requireActiveSession: vi.fn(async () => ({ session: null, error: null })),
    });
    const draft = validDraft();

    const results = await Promise.all([
      repo.listAll(),
      repo.get('nurse-existing'),
      repo.create(draft),
      repo.save('nurse-existing', { preferredName: 'Denied' }, 1),
      repo.remove('nurse-existing', 1),
    ]);

    expect(results).toHaveLength(5);
    expect(results.every((result) => result.status === 'error')).toBe(true);
    expect(results.every((result) => result.error.code === DataErrorCode.AUTH)).toBe(true);
    expect(clientFactory).not.toHaveBeenCalled();
    expect(client.calls).toEqual([]);
    expect(client.snapshot('nurses')).toEqual([nurseRow()]);
  });

  it('preserves confirmed state and drafts across RLS denials', async () => {
    const client = new FakeSupabaseClient({ nurses: [nurseRow()] });
    const controller = await loadedController(client);
    const before = committedState(controller);
    const forbiddenClient = new FailingSupabaseClient({
      code: '42501',
      message: 'row-level security policy denied access to private nurse data',
    });
    supabaseAdapter.__setClientFactory(() => forbiddenClient);

    controller.openCreate({
      now: new Date(CREATED_AT),
      randomUUID: () => DRAFT_UUID,
    });
    controller.updateCreateDraft({ fullName: 'Denied Create' });
    const deniedCreateDraft = structuredClone(controller.getState().createDraft);
    const createResult = await controller.createNurse();
    expect(createResult).toMatchObject({
      status: 'error',
      error: { code: DataErrorCode.FORBIDDEN },
    });
    expect(committedState(controller)).toEqual(before);
    expect(controller.getState()).toMatchObject({
      createDraft: deniedCreateDraft,
      createDecision: { type: 'createFailure', retryAvailable: false },
    });

    controller.updateDraft({ fullName: 'Denied Save' });
    const deniedEditDraft = structuredClone(controller.getState().draft);
    const saveResult = await controller.saveNurse();
    expect(saveResult).toMatchObject({
      status: 'error',
      error: { code: DataErrorCode.FORBIDDEN },
    });
    expect(committedState(controller)).toEqual(before);
    expect(controller.getState()).toMatchObject({
      draft: deniedEditDraft,
      saveDecision: { type: 'saveFailure', retryAvailable: false },
    });

    expect(controller.requestDelete()).toBe(true);
    const deleteResult = await controller.confirmDelete();
    expect(deleteResult).toMatchObject({
      status: 'error',
      error: { code: DataErrorCode.FORBIDDEN },
    });
    expect(committedState(controller)).toEqual(before);
    expect(controller.getState()).toMatchObject({
      draft: deniedEditDraft,
      deleteDecision: { type: 'deleteFailure', retryAvailable: false },
    });
    expect(client.snapshot('nurses')).toEqual([nurseRow()]);
  });

  it.each([
    ['foreign-key', '23503'],
    ['check', '23514'],
  ])('categorizes denied %s rules safely', async (_label, code) => {
    const client = new FakeSupabaseClient({ nurses: [nurseRow()] });
    const controller = await loadedController(client);
    const before = committedState(controller);
    const rawMessage = 'violates private constraint placements_nurse_id_fkey';
    supabaseAdapter.__setClientFactory(
      () => new FailingSupabaseClient({ code, message: rawMessage })
    );

    expect(controller.requestDelete()).toBe(true);
    const result = await controller.confirmDelete();

    expect(result).toMatchObject({
      status: 'error',
      error: { code: DataErrorCode.VALIDATION },
    });
    expect(result.error.message).not.toContain('placements_nurse_id_fkey');
    expect(result.error.message).not.toContain(rawMessage);
    expect(committedState(controller)).toEqual(before);
    expect(controller.getState()).toMatchObject({
      deleteDecision: { type: 'deleteFailure', retryAvailable: false },
    });
    expect(client.snapshot('nurses')).toEqual([nurseRow()]);
  });
});
