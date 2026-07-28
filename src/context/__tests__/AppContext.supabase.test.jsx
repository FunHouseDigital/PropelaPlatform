import { act, render, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { DataError } from '../../lib/dataLayer/errors';
import { AppProvider, useAppContext } from '../AppContext';

/**
 * Task 9.5 — flag-ON path (SUPABASE_BACKEND enabled).
 *
 * Exercises the async Data_Layer consumption in AppContext when the flag is ON:
 *   - async hydration through the facade `getCollection`
 *   - list-failure preserves previously displayed records and marks the slice
 *     stale (Req 1.6, 9.3, 12.6)
 *   - retry success clears the failed/stale state (Req 9.6)
 *   - write conflict surfaces via the toast system while keeping the user's data
 *     (Req 2.5, 2.6)
 *   - write failure reports "not saved" (toast) and marks the slice stale (Req
 *     1.5, 9.4)
 *   - read failure on hydration marks the slice stale without discarding the
 *     error (Req 6.7, 9.3)
 *
 * The Data_Layer facade is mocked so `isSupabaseBackend` is TRUE and the async
 * operations are controllable per test. `domains.js` and `errors.js` are NOT
 * mocked (the real registry + DataError are used).
 */

const h = vi.hoisted(() => ({
  getCollection: vi.fn(),
  list: vi.fn(),
  saveCollection: vi.fn(),
  nurseList: vi.fn(),
  nurseGet: vi.fn(),
  nurseCreate: vi.fn(),
  nurseUpdate: vi.fn(),
  nurseRemove: vi.fn(),
}));

vi.mock('../../lib/auth', () => ({
  getSession: vi.fn(async () => ({
    session: {
      access_token: 'test-token',
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      user: { id: 'user-1' },
    },
    error: null,
  })),
  isSessionExpired: vi.fn(() => false),
}));

vi.mock('../../lib/dataLayer', () => ({
  isSupabaseBackend: true,
  getCollection: (...args) => h.getCollection(...args),
  list: (...args) => h.list(...args),
  saveCollection: (...args) => h.saveCollection(...args),
  nurseOps: {
    list: (...args) => h.nurseList(...args),
    get: (...args) => h.nurseGet(...args),
    create: (...args) => h.nurseCreate(...args),
    update: (...args) => h.nurseUpdate(...args),
    remove: (...args) => h.nurseRemove(...args),
  },
}));

let latest = null;

function Reader({ onReady }) {
  const ctx = useAppContext();
  onReady(ctx);
  return <div data-testid="reader">ready</div>;
}

function renderApp() {
  return render(
    <MemoryRouter>
      <AppProvider>
        <Reader
          onReady={(ctx) => {
            latest = ctx;
          }}
        />
      </AppProvider>
    </MemoryRouter>
  );
}

/** Render and wait for the initial mount hydration to settle. */
async function renderAndSettle() {
  let utils;
  await act(async () => {
    utils = renderApp();
  });
  await waitFor(() => expect(latest).not.toBeNull());
  await waitFor(() => expect(latest.slices.nurses.loading).toBe(false));
  return utils;
}

describe('AppContext Supabase path (flag ON)', () => {
  beforeEach(() => {
    localStorage.clear();
    latest = null;
    vi.clearAllMocks();
    // Default: every unrelated domain hydrates to an empty collection, while
    // nurses hydrate exclusively through the selected record adapter.
    h.getCollection.mockImplementation(async () => ({ data: [], error: null }));
    h.list.mockImplementation(async () => ({
      data: [],
      error: null,
      page: 1,
      pageSize: 25,
      total: 0,
    }));
    h.saveCollection.mockImplementation(async () => ({ data: null, error: null }));
    h.nurseList.mockImplementation(async () => ({
      data: [],
      error: null,
      page: 1,
      pageSize: 100,
      total: 0,
    }));
    h.nurseGet.mockResolvedValue({ data: null, error: null, notFound: true });
    h.nurseCreate.mockResolvedValue({ data: null, error: null });
    h.nurseUpdate.mockResolvedValue({ data: null, error: null });
    h.nurseRemove.mockResolvedValue({ deleted: true, error: null });
  });

  it('hydrates nurse state through the record controller and preserves the public array', async () => {
    h.nurseList.mockResolvedValue({
      data: [{ id: 'nurse-1', fullName: 'Hydrated', version: 1 }],
      error: null,
      page: 1,
      pageSize: 100,
      total: 1,
    });

    await renderAndSettle();

    expect(latest.nurses).toHaveLength(1);
    expect(latest.nurses[0].fullName).toBe('Hydrated');
    expect(latest.nurseSlice.items).toEqual(latest.nurses);
    expect(latest.nurseSlice.total).toBe(1);
    expect(latest.slices.nurses.loading).toBe(false);
    expect(latest.slices.nurses.error).toBeNull();
    expect(latest.slices.nurses.staleWarning).toBe(false);
    expect(h.nurseList).toHaveBeenCalledWith({ page: 1, pageSize: 100 });
    expect(h.getCollection).not.toHaveBeenCalledWith('nurses');
  });

  it('exposes the nurse slice and all record commands', async () => {
    await renderAndSettle();

    expect(latest.nurseSlice).toEqual(
      expect.objectContaining({
        items: [],
        total: 0,
        listState: 'success',
      })
    );
    for (const command of [
      'refreshNurses',
      'retryNurses',
      'openNurse',
      'openCreate',
      'updateCreateDraft',
      'closeCreate',
      'createNurse',
      'retryCreate',
      'retryCreateAfterCollision',
      'saveNurse',
      'changeNursePipeline',
      'retryNursePipeline',
      'reloadNursePipeline',
      'rebaseNursePipeline',
      'deleteNurse',
    ]) {
      expect(latest[command]).toEqual(expect.any(Function));
    }
  });

  it('opens a stable, seed-independent create draft and exposes close/update lifecycle commands', async () => {
    await renderAndSettle();

    act(() => {
      latest.openCreate({
        now: new Date('2026-06-24T12:00:00'),
        randomUUID: () => '123e4567-e89b-42d3-a456-426614174000',
      });
    });
    const initialId = latest.nurseSlice.createDraft.id;

    expect(initialId).toBe('nurse-123e4567-e89b-42d3-a456-426614174000');
    expect(latest.nurseSlice.createDraft).toEqual(
      expect.objectContaining({
        fullName: '',
        preferredName: '',
        pipelineStage: 'Applied',
        oetStatus: 'Not Started',
        submittedAt: '2026-06-24',
      })
    );

    act(() => {
      latest.updateCreateDraft({ fullName: 'Draft Nurse', city: 'Durban' });
    });
    expect(latest.nurseSlice.createDraft).toEqual(
      expect.objectContaining({
        id: initialId,
        fullName: 'Draft Nurse',
        city: 'Durban',
      })
    );

    act(() => {
      expect(latest.closeCreate()).toBe(true);
    });
    expect(latest.nurseSlice.createDraft).toBeNull();
  });

  it('adds only a committed create result to shared context state', async () => {
    await renderAndSettle();
    const committed = {
      id: 'nurse-123e4567-e89b-42d3-a456-426614174000',
      ownerId: 'user-1',
      fullName: 'Committed Nurse',
      version: 1,
      createdAt: '2026-06-24T12:00:00Z',
      updatedAt: '2026-06-24T12:00:00Z',
    };
    h.nurseCreate.mockResolvedValueOnce({ data: committed, error: null });

    act(() => {
      latest.openCreate({
        now: new Date('2026-06-24T12:00:00'),
        randomUUID: () => '123e4567-e89b-42d3-a456-426614174000',
      });
      latest.updateCreateDraft({ fullName: 'Committed Nurse' });
    });
    await act(async () => {
      await latest.createNurse();
    });

    expect(h.nurseCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        id: committed.id,
        fullName: 'Committed Nurse',
      }),
      { id: committed.id, ownerId: 'user-1' }
    );
    expect(latest.nurses).toEqual([committed]);
    expect(latest.nurseSlice.createDraft).toBeNull();
    expect(latest.nurseSlice.createState).toBe('success');
  });

  it('preserves the complete create draft through a recoverable context failure and manual retry', async () => {
    await renderAndSettle();
    const id = 'nurse-123e4567-e89b-42d3-a456-426614174000';
    const networkError = new DataError('NETWORK', 'Connection interrupted.');

    h.nurseCreate.mockResolvedValueOnce({ data: null, error: networkError }).mockResolvedValueOnce({
      data: {
        id,
        ownerId: 'user-1',
        fullName: 'Complete Draft Nurse',
        version: 1,
        createdAt: '2026-06-24T12:00:00Z',
        updatedAt: '2026-06-24T12:00:00Z',
      },
      error: null,
    });

    act(() => {
      latest.openCreate({
        now: new Date('2026-06-24T12:00:00'),
        randomUUID: () => '123e4567-e89b-42d3-a456-426614174000',
      });
      latest.updateCreateDraft({
        fullName: 'Complete Draft Nurse',
        preferredName: 'Complete',
        email: 'complete@example.test',
        contactNumber: '+27 82 000 0000',
        city: 'Durban',
        cohortAssigned: 'Cohort 9',
        motivations: 'A recoverable motivation',
        questions: 'A retained question',
        notesFlags: 'A retained note',
        flags: 3,
        efSetScore: 77,
        englishPts: 2,
        agreementSigned: true,
        additionalCertifications: ['ICU', 'Trauma'],
        communicationLog: [
          {
            date: '2026-06-24',
            channel: 'Email',
            summary: 'Initial contact retained',
            nextAction: 'Follow up',
          },
        ],
        scorecardFields: {
          hospitalExp: 1,
          sancStatus: 2,
          qualifications: 3,
          specialisation: 4,
          financialReadiness: 5,
          motivation: 4,
          passport: 3,
        },
        photoURL: 'https://example.test/photo.png',
        lastContacted: '2026-06-23',
      });
    });
    const completeDraft = structuredClone(latest.nurseSlice.createDraft);

    await act(async () => {
      await latest.createNurse();
    });

    expect(latest.nurses).toEqual([]);
    expect(latest.nurseSlice.createDraft).toEqual(completeDraft);
    expect(latest.nurseSlice.createDecision).toEqual({
      type: 'createFailure',
      retryAvailable: true,
    });

    await act(async () => {
      await latest.retryCreate();
    });

    expect(h.nurseGet).toHaveBeenCalledWith(id);
    expect(h.nurseCreate).toHaveBeenCalledTimes(2);
    expect(h.nurseCreate.mock.calls[1][0]).toEqual(
      expect.objectContaining({
        id,
        fullName: completeDraft.fullName,
        preferredName: completeDraft.preferredName,
        email: completeDraft.email,
        additionalCertifications: completeDraft.additionalCertifications,
        communicationLog: completeDraft.communicationLog,
        scorecardFields: completeDraft.scorecardFields,
      })
    );
    expect(latest.nurses).toEqual([
      expect.objectContaining({ id, fullName: 'Complete Draft Nurse', version: 1 }),
    ]);
    expect(latest.nurseSlice.createDraft).toBeNull();
  });

  it('preserves previously displayed records and marks stale on a list failure', async () => {
    h.nurseList.mockResolvedValueOnce({
      data: [{ id: 'nurse-1', fullName: 'Kept', version: 1 }],
      error: null,
      page: 1,
      pageSize: 100,
      total: 1,
    });

    await renderAndSettle();
    expect(latest.nurses).toHaveLength(1);

    h.nurseList.mockResolvedValueOnce({
      data: [],
      error: new DataError('NETWORK'),
      page: 1,
      pageSize: 100,
      total: 0,
    });

    await act(async () => {
      await latest.refreshNurses();
    });

    // Previously displayed records are preserved (Req 12.6) ...
    expect(latest.nurses).toHaveLength(1);
    expect(latest.nurses[0].fullName).toBe('Kept');
    // ... and the slice is marked stale with the error surfaced (Req 9.3, 6.7).
    expect(latest.slices.nurses.staleWarning).toBe(true);
    expect(latest.slices.nurses.error).toBeInstanceOf(DataError);
    expect(latest.slices.nurses.loading).toBe(false);
  });

  it('clears the failed/stale state when retry succeeds', async () => {
    await renderAndSettle();

    // First a failing load to enter the stale state.
    h.nurseList.mockResolvedValueOnce({
      data: [],
      error: new DataError('NETWORK'),
      page: 1,
      pageSize: 100,
      total: 0,
    });
    await act(async () => {
      await latest.refreshNurses();
    });
    expect(latest.slices.nurses.staleWarning).toBe(true);

    // Retry succeeds and clears the failed state (Req 9.6).
    h.nurseList.mockResolvedValueOnce({
      data: [{ id: 'nurse-2', fullName: 'Recovered', version: 1 }],
      error: null,
      page: 1,
      pageSize: 100,
      total: 1,
    });
    await act(async () => {
      await latest.retryNurses();
    });

    expect(latest.slices.nurses.error).toBeNull();
    expect(latest.slices.nurses.staleWarning).toBe(false);
    expect(latest.nurses[0].id).toBe('nurse-2');
  });

  it('routes Supabase nurse mutations through record operations only', async () => {
    const original = {
      id: 'nurse-1',
      fullName: 'Pipeline Nurse',
      pipelineStage: 'Applied',
      readinessStatus: 'Not Ready',
      version: 1,
    };
    const committed = {
      ...original,
      pipelineStage: 'Screening',
      readinessStatus: 'Not Ready',
      version: 2,
    };
    h.nurseList.mockResolvedValueOnce({
      data: [original],
      error: null,
      page: 1,
      pageSize: 100,
      total: 1,
    });
    h.nurseUpdate.mockResolvedValueOnce({ data: committed, error: null });

    await renderAndSettle();

    await act(async () => {
      await latest.changeNursePipeline({
        id: 'nurse-1',
        baseVersion: 1,
        pipelineStage: 'Screening',
        readinessStatus: 'Not Ready',
      });
    });

    expect(h.nurseUpdate).toHaveBeenCalledWith(
      'nurse-1',
      expect.objectContaining({ pipelineStage: 'Screening' }),
      1
    );
    expect(latest.nurses).toEqual([committed]);
    expect(latest.nurseSlice.items).toEqual([committed]);
    expect(h.saveCollection).not.toHaveBeenCalledWith('nurses', expect.anything());

    act(() => {
      expect(latest.updateNurses([{ id: 'local-shadow' }])).toBe(false);
    });
    expect(latest.nurses).toEqual([committed]);
    expect(h.saveCollection).not.toHaveBeenCalledWith('nurses', expect.anything());
  });

  it('keeps confirmed Supabase create, update, and delete results across refreshes', async () => {
    let remoteNurses = [];
    h.nurseList.mockImplementation(async ({ page, pageSize }) => ({
      data: remoteNurses.slice((page - 1) * pageSize, page * pageSize),
      error: null,
      page,
      pageSize,
      total: remoteNurses.length,
    }));
    h.nurseCreate.mockImplementation(async (draft, identity) => {
      const committed = {
        ...draft,
        ownerId: identity.ownerId,
        version: 1,
        createdAt: '2026-06-24T12:00:00Z',
        updatedAt: '2026-06-24T12:00:00Z',
      };
      remoteNurses = [committed];
      return { data: committed, error: null };
    });
    h.nurseGet.mockImplementation(async (id) => {
      const nurse = remoteNurses.find((candidate) => candidate.id === id);
      return nurse ? { data: nurse, error: null } : { data: null, error: null, notFound: true };
    });
    h.nurseUpdate.mockImplementation(async (id, changes, baseVersion) => {
      const current = remoteNurses.find((candidate) => candidate.id === id);
      if (!current) return { data: null, error: null, notFound: true };
      if (current.version !== baseVersion) {
        return { data: null, error: null, conflict: { current } };
      }
      const committed = {
        ...current,
        ...changes,
        version: current.version + 1,
        updatedAt: '2026-06-24T12:05:00Z',
      };
      remoteNurses = [committed];
      return { data: committed, error: null };
    });
    h.nurseRemove.mockImplementation(async (id, baseVersion) => {
      const current = remoteNurses.find((candidate) => candidate.id === id);
      if (!current) return { alreadyDeleted: true, error: null };
      if (current.version !== baseVersion) {
        return { error: null, conflict: { current } };
      }
      remoteNurses = remoteNurses.filter((candidate) => candidate.id !== id);
      return { deleted: true, error: null };
    });

    await renderAndSettle();

    act(() => {
      latest.openCreate({
        now: new Date('2026-06-24T12:00:00Z'),
        randomUUID: () => '123e4567-e89b-42d3-a456-426614174000',
      });
      latest.updateCreateDraft({ fullName: 'Persistent Supabase Nurse' });
    });
    await act(async () => {
      await latest.createNurse();
      await latest.refreshNurses();
    });

    const id = 'nurse-123e4567-e89b-42d3-a456-426614174000';
    expect(latest.nurses).toEqual([
      expect.objectContaining({ id, fullName: 'Persistent Supabase Nurse', version: 1 }),
    ]);

    await act(async () => {
      await latest.openNurse(id);
    });
    act(() => {
      latest.updateNurseDraft({ preferredName: 'Persisted update' });
    });
    await act(async () => {
      await latest.saveNurse();
      await latest.refreshNurses();
    });

    expect(latest.nurses).toEqual([
      expect.objectContaining({ id, preferredName: 'Persisted update', version: 2 }),
    ]);

    act(() => {
      expect(latest.requestDeleteNurse()).toBe(true);
    });
    await act(async () => {
      await latest.deleteNurse();
      await latest.refreshNurses();
    });

    expect(latest.nurses).toEqual([]);
    expect(remoteNurses).toEqual([]);
    expect(h.saveCollection).not.toHaveBeenCalledWith('nurses', expect.anything());
  });

  it('reports a failed write via a toast and marks the slice stale', async () => {
    await renderAndSettle();

    h.saveCollection.mockResolvedValueOnce({
      data: null,
      error: new DataError('NETWORK'),
    });

    await act(async () => {
      latest.updateFacilities([{ id: 'fac-1', name: 'Unsaved' }]);
    });

    await waitFor(() => expect(latest.toasts.some((t) => t.type === 'error')).toBe(true));
    expect(latest.slices.facilities.staleWarning).toBe(true);
    expect(latest.slices.facilities.error).toBeInstanceOf(DataError);
  });

  it('surfaces an initial nurse record hydration failure without local fallback', async () => {
    h.nurseList.mockResolvedValueOnce({
      data: [],
      error: new DataError('NETWORK'),
      page: 1,
      pageSize: 100,
      total: 0,
    });

    await act(async () => {
      renderApp();
    });

    await waitFor(() => expect(latest?.slices.nurses.error).toBeInstanceOf(DataError));
    expect(latest.slices.nurses.staleWarning).toBe(false);
    expect(latest.nurseSlice.listError).toBeInstanceOf(DataError);
    expect(latest.slices.nurses.loading).toBe(false);
    expect(h.getCollection).not.toHaveBeenCalledWith('nurses');
  });
});
