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
}));

vi.mock('../../lib/dataLayer', () => ({
  isSupabaseBackend: true,
  getCollection: (...args) => h.getCollection(...args),
  list: (...args) => h.list(...args),
  saveCollection: (...args) => h.saveCollection(...args),
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
        <Reader onReady={(ctx) => { latest = ctx; }} />
      </AppProvider>
    </MemoryRouter>,
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
    // Default: every domain hydrates to an empty collection successfully.
    h.getCollection.mockImplementation(async () => ({ data: [], error: null }));
    h.list.mockImplementation(async () => ({
      data: [],
      error: null,
      page: 1,
      pageSize: 25,
      total: 0,
    }));
    h.saveCollection.mockImplementation(async () => ({ data: null, error: null }));
  });

  it('hydrates domain slices from the facade on mount', async () => {
    h.getCollection.mockImplementation(async (name) => {
      if (name === 'nurses') {
        return { data: [{ id: 'nurse-1', fullName: 'Hydrated' }], error: null };
      }
      return { data: [], error: null };
    });

    await renderAndSettle();

    expect(latest.nurses).toHaveLength(1);
    expect(latest.nurses[0].fullName).toBe('Hydrated');
    expect(latest.slices.nurses.loading).toBe(false);
    expect(latest.slices.nurses.error).toBeNull();
    expect(latest.slices.nurses.staleWarning).toBe(false);
  });

  it('preserves previously displayed records and marks stale on a list failure', async () => {
    h.getCollection.mockImplementation(async (name) => {
      if (name === 'nurses') {
        return { data: [{ id: 'nurse-1', fullName: 'Kept' }], error: null };
      }
      return { data: [], error: null };
    });

    await renderAndSettle();
    expect(latest.nurses).toHaveLength(1);

    // A paginated load now fails.
    h.list.mockResolvedValueOnce({
      data: [],
      error: new DataError('NETWORK'),
      page: 1,
      pageSize: 25,
      total: 0,
    });

    await act(async () => {
      await latest.loadNurses({ page: 1 });
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
    h.list.mockResolvedValueOnce({
      data: [],
      error: new DataError('NETWORK'),
      page: 1,
      pageSize: 25,
      total: 0,
    });
    await act(async () => {
      await latest.loadNurses({ page: 1 });
    });
    expect(latest.slices.nurses.staleWarning).toBe(true);

    // Retry succeeds and clears the failed state (Req 9.6).
    h.list.mockResolvedValueOnce({
      data: [{ id: 'nurse-2', fullName: 'Recovered' }],
      error: null,
      page: 1,
      pageSize: 25,
      total: 1,
    });
    await act(async () => {
      await latest.retryNurses({ page: 1 });
    });

    expect(latest.slices.nurses.error).toBeNull();
    expect(latest.slices.nurses.staleWarning).toBe(false);
    expect(latest.nurses[0].id).toBe('nurse-2');
  });

  it('surfaces a write conflict via a toast while keeping the user input', async () => {
    await renderAndSettle();

    h.saveCollection.mockResolvedValueOnce({
      data: null,
      error: null,
      conflict: { current: { id: 'nurse-1', fullName: 'Server Value', version: 5 } },
    });

    await act(async () => {
      latest.updateNurses([{ id: 'nurse-1', fullName: 'My Edit' }]);
    });

    // Optimistic update keeps the user's data on screen (not overwritten).
    expect(latest.nurses).toEqual([{ id: 'nurse-1', fullName: 'My Edit' }]);

    await waitFor(() => expect(latest.toasts.length).toBeGreaterThan(0));
    const toast = latest.toasts[0];
    expect(toast.type).toBe('warning');
    expect(toast.title).toMatch(/changed/i);
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

    await waitFor(() =>
      expect(latest.toasts.some((t) => t.type === 'error')).toBe(true),
    );
    expect(latest.slices.facilities.staleWarning).toBe(true);
    expect(latest.slices.facilities.error).toBeInstanceOf(DataError);
  });

  it('marks a slice stale when a read fails during hydration', async () => {
    h.getCollection.mockImplementation(async (name) => {
      if (name === 'nurses') {
        return { data: [], error: new DataError('NETWORK') };
      }
      return { data: [], error: null };
    });

    await act(async () => {
      renderApp();
    });

    await waitFor(() => expect(latest?.slices.nurses.staleWarning).toBe(true));
    expect(latest.slices.nurses.error).toBeInstanceOf(DataError);
    expect(latest.slices.nurses.loading).toBe(false);
  });
});
