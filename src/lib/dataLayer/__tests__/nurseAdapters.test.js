import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import * as storage from '../../storage';
import { STORAGE_PREFIX } from '../../storageKeys';
import { DataErrorCode } from '../errors';
import * as storageAdapter from '../storageAdapter';
import * as supabaseAdapter from '../supabaseAdapter';
import { FailingSupabaseClient, FakeSupabaseClient } from './fakeSupabase';

const OWNER_ID = '2d7c6166-244a-4c75-9254-862913c71ba3';

function nurseRow(overrides = {}) {
  return {
    id: 'nurse-1',
    owner_id: OWNER_ID,
    full_name: 'Ada Nurse',
    preferred_name: 'Ada',
    pipeline_stage: 'Applied',
    readiness_status: 'Not Ready',
    cohort_assigned: null,
    oet_status: 'Not Started',
    final_score: 2,
    tier: 'B',
    email: 'ada@example.test',
    scorecard_fields: {},
    additional_certifications: [],
    communication_log: [],
    attributes: { flags: 1 },
    version: 1,
    created_at: '2026-01-01T00:00:00.000Z',
    updated_at: '2026-01-01T00:00:00.000Z',
    ...overrides,
  };
}

function nurseDraft(overrides = {}) {
  return {
    id: 'nurse-new',
    fullName: 'Grace Nurse',
    preferredName: 'Grace',
    pipelineStage: 'Applied',
    readinessStatus: 'Not Ready',
    cohortAssigned: '',
    oetStatus: 'Not Started',
    finalScore: 0,
    tier: '',
    email: '',
    scorecardFields: {},
    additionalCertifications: [],
    communicationLog: [],
    ...overrides,
  };
}

describe('Supabase nurse record adapter', () => {
  let client;

  beforeEach(() => {
    client = new FakeSupabaseClient({ nurses: [nurseRow()] });
    supabaseAdapter.__setClientFactory(() => client);
  });

  afterAll(() => {
    supabaseAdapter.__setClientFactory(null);
  });

  it('decodes list/detail rows and rejects a complete malformed list', async () => {
    const listed = await supabaseAdapter.listNurses({ pageSize: 100 });
    const detail = await supabaseAdapter.getNurse('nurse-1');

    expect(listed.error).toBeNull();
    expect(listed.data[0]).toMatchObject({
      id: 'nurse-1',
      ownerId: OWNER_ID,
      fullName: 'Ada Nurse',
      pipelineStage: 'Applied',
      version: 1,
    });
    expect(detail.data.fullName).toBe('Ada Nurse');
    expect(detail.data).not.toHaveProperty('full_name');

    client = new FakeSupabaseClient({
      nurses: [nurseRow(), nurseRow({ id: 'nurse-bad', attributes: [] })],
    });
    supabaseAdapter.__setClientFactory(() => client);
    const malformed = await supabaseAdapter.listNurses({ pageSize: 100 });

    expect(malformed.data).toEqual([]);
    expect(malformed.total).toBe(0);
    expect(malformed.error?.code).toBe(DataErrorCode.VALIDATION);
  });

  it('encodes create/update payloads and decodes committed and conflict rows', async () => {
    const created = await supabaseAdapter.createNurse(nurseDraft(), {
      ownerId: OWNER_ID,
    });

    expect(created.error).toBeNull();
    expect(created.data).toMatchObject({
      id: 'nurse-new',
      ownerId: OWNER_ID,
      fullName: 'Grace Nurse',
      version: 1,
    });
    const inserted = client.snapshot('nurses').find(({ id }) => id === 'nurse-new');
    expect(inserted).toMatchObject({
      id: 'nurse-new',
      owner_id: OWNER_ID,
      full_name: 'Grace Nurse',
    });
    expect(inserted).not.toHaveProperty('fullName');

    const saved = await supabaseAdapter.updateNurse(
      'nurse-1',
      { preferredName: 'Updated' },
      1,
    );
    expect(saved.data).toMatchObject({ preferredName: 'Updated', version: 2 });
    expect(client.snapshot('nurses')[0]).toHaveProperty('preferred_name', 'Updated');

    const conflict = await supabaseAdapter.updateNurse(
      'nurse-1',
      { preferredName: 'Stale' },
      1,
    );
    expect(conflict.outcome).toBe('conflict');
    expect(conflict.conflict.current).toMatchObject({
      preferredName: 'Updated',
      version: 2,
    });
    expect(conflict.conflict.current).not.toHaveProperty('preferred_name');
  });

  it('requires identifiers/base versions and distinguishes not-found/delete outcomes', async () => {
    const callCount = client.calls.length;
    const invalidUpdate = await supabaseAdapter.updateNurse(
      'nurse-1',
      { preferredName: 'No write' },
      undefined,
    );
    const invalidDelete = await supabaseAdapter.deleteNurse('', 1);

    expect(invalidUpdate.error?.code).toBe(DataErrorCode.VALIDATION);
    expect(invalidDelete.error?.code).toBe(DataErrorCode.VALIDATION);
    expect(client.calls).toHaveLength(callCount);

    const missing = await supabaseAdapter.updateNurse(
      'missing',
      { preferredName: 'Nobody' },
      1,
    );
    expect(missing).toMatchObject({ notFound: true, outcome: 'notFound' });

    const staleDelete = await supabaseAdapter.deleteNurse('nurse-1', 2);
    expect(staleDelete.outcome).toBe('conflict');
    expect(staleDelete.conflict.current.fullName).toBe('Ada Nurse');

    const deleted = await supabaseAdapter.deleteNurse('nurse-1', 1);
    expect(deleted).toMatchObject({ deleted: true, outcome: 'deleted' });

    const alreadyDeleted = await supabaseAdapter.deleteNurse('nurse-1', 1);
    expect(alreadyDeleted).toMatchObject({
      alreadyDeleted: true,
      outcome: 'alreadyDeleted',
    });
  });

  it('preserves shared network error mapping', async () => {
    supabaseAdapter.__setClientFactory(
      () => new FailingSupabaseClient(new TypeError('Failed to fetch')),
    );
    const result = await supabaseAdapter.listNurses();
    expect(result.error?.code).toBe(DataErrorCode.NETWORK);
  });
});

describe('storage nurse record adapter', () => {
  beforeEach(() => {
    localStorage.clear();
    storage.saveNurses([
      {
        id: 'nurse-local',
        fullName: 'Local Nurse',
        preferredName: 'Local',
        pipelineStage: 'Applied',
      },
    ]);
  });

  it('reads and creates records without snake_case conversion', async () => {
    const detail = await storageAdapter.getNurse('nurse-local');
    expect(detail.data).toMatchObject({
      fullName: 'Local Nurse',
      version: 1,
    });

    const created = await storageAdapter.createNurse(nurseDraft({
      id: 'nurse-local-created',
    }));
    expect(created.error).toBeNull();
    expect(created.data).toMatchObject({
      id: 'nurse-local-created',
      fullName: 'Grace Nurse',
      version: 1,
    });
    expect(storage.getNurses()[1]).not.toHaveProperty('full_name');

    const duplicate = await storageAdapter.createNurse(
      nurseDraft({ id: 'nurse-local-created' }),
    );
    expect(duplicate.outcome).toBe('conflict');
    expect(storage.getNurses()).toHaveLength(2);
  });

  it('keeps camelCase storage and provides equivalent versioned outcomes', async () => {
    const listed = await storageAdapter.listNurses();
    expect(listed.data[0]).toMatchObject({
      id: 'nurse-local',
      fullName: 'Local Nurse',
      version: 1,
    });
    expect(listed.data[0]).not.toHaveProperty('full_name');
    expect(storage.getNurses()[0]).not.toHaveProperty('version');

    const conflict = await storageAdapter.updateNurse(
      'nurse-local',
      { preferredName: 'Stale' },
      2,
    );
    expect(conflict.outcome).toBe('conflict');
    expect(conflict.conflict.current).toMatchObject({
      preferredName: 'Local',
      version: 1,
    });

    const saved = await storageAdapter.updateNurse(
      'nurse-local',
      { preferredName: 'Saved' },
      1,
    );
    expect(saved.data).toMatchObject({ preferredName: 'Saved', version: 2 });
    expect(storage.getNurses()[0]).toMatchObject({
      preferredName: 'Saved',
      version: 2,
    });
    expect(storage.getNurses()[0]).not.toHaveProperty('preferred_name');

    const staleDelete = await storageAdapter.deleteNurse('nurse-local', 1);
    expect(staleDelete.outcome).toBe('conflict');
    const deleted = await storageAdapter.deleteNurse('nurse-local', 2);
    expect(deleted.outcome).toBe('deleted');
    const alreadyDeleted = await storageAdapter.deleteNurse('nurse-local', 2);
    expect(alreadyDeleted.outcome).toBe('alreadyDeleted');
  });

  it('rejects ungated writes and leaves the last successful data on storage failure', async () => {
    const before = structuredClone(storage.getNurses());
    const invalid = await storageAdapter.updateNurse(
      'nurse-local',
      { preferredName: 'No write' },
      undefined,
    );
    expect(invalid.error?.code).toBe(DataErrorCode.VALIDATION);
    expect(storage.getNurses()).toEqual(before);

    const originalSetItem = localStorage.setItem.bind(localStorage);
    const setItemFailure = vi
      .spyOn(localStorage, 'setItem')
      .mockImplementation((key, value) => {
        if (key === `${STORAGE_PREFIX}nurses`) {
          throw new DOMException('Quota exceeded', 'QuotaExceededError');
        }
        return originalSetItem(key, value);
      });

    const failed = await storageAdapter.updateNurse(
      'nurse-local',
      { preferredName: 'Unsaved' },
      1,
    );
    setItemFailure.mockRestore();

    expect(failed.error?.code).toBe(DataErrorCode.STORAGE);
    expect(storage.getNurses()).toEqual(before);
  });
});
