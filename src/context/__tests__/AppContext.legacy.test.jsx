import { beforeEach, describe, expect, it } from 'vitest';

import { getData, setData } from '../../lib/storage';
import { act, render, screen, waitFor } from '../../test/utils';
import { useAppContext } from '../AppContext';

/**
 * Task 9.5 — legacy path (SUPABASE_BACKEND flag OFF, the default).
 *
 * Confirms that with the flag OFF the context still initializes SYNCHRONOUSLY
 * from localStorage and that updateX writes through synchronously via storage.js
 * — i.e. the pre-existing behavior is unchanged (Req 9.1). No facade module is
 * mocked here, so the real Data_Layer facade resolves `isSupabaseBackend` to the
 * default OFF.
 */

let latest = null;

function Reader({ onReady }) {
  const ctx = useAppContext();
  onReady(ctx);
  return <div data-testid="reader">ready</div>;
}

function Writer({ onClick }) {
  const ctx = useAppContext();
  return (
    <button data-testid="btn" onClick={() => onClick(ctx)}>
      go
    </button>
  );
}

describe('AppContext legacy path (flag OFF)', () => {
  beforeEach(() => {
    localStorage.clear();
    latest = null;
  });

  it('initializes synchronously from localStorage on mount (no async hydrate)', () => {
    setData('nurses', [{ id: 'nurse-1', fullName: 'Sync Nurse' }]);

    render(
      <Reader
        onReady={(ctx) => {
          latest = ctx;
        }}
      />
    );

    // Data is available immediately after the synchronous render — no waitFor.
    expect(latest.nurses).toHaveLength(1);
    expect(latest.nurses[0].fullName).toBe('Sync Nurse');
    // Slice metadata reports not-loading for the legacy path.
    expect(latest.slices.nurses.loading).toBe(false);
    expect(latest.slices.nurses.error).toBeNull();
    expect(latest.slices.nurses.staleWarning).toBe(false);
  });

  it('updateX writes through to localStorage synchronously', () => {
    setData('nurses', []);

    render(
      <Writer onClick={(ctx) => ctx.updateNurses([{ id: 'nurse-x', fullName: 'Written' }])} />
    );

    act(() => {
      screen.getByTestId('btn').click();
    });

    // The write is visible in localStorage immediately (synchronous saveX).
    const stored = getData('nurses');
    expect(stored).toHaveLength(1);
    expect(stored[0].fullName).toBe('Written');
  });

  it('routes nurse record commands through the selected legacy storage adapter', async () => {
    setData('nurses', [
      {
        id: 'nurse-legacy',
        fullName: 'Legacy Nurse',
        pipelineStage: 'Applied',
        readinessStatus: 'Not Ready',
        version: 1,
      },
    ]);

    render(
      <Reader
        onReady={(ctx) => {
          latest = ctx;
        }}
      />
    );
    await waitFor(() => expect(latest.nurseSlice.listState).toBe('success'));

    expect(latest.nurses).toEqual(latest.nurseSlice.items);
    expect(latest.refreshNurses).toEqual(expect.any(Function));
    expect(latest.changeNursePipeline).toEqual(expect.any(Function));

    await act(async () => {
      await latest.changeNursePipeline({
        id: 'nurse-legacy',
        baseVersion: 1,
        pipelineStage: 'Screening',
        readinessStatus: 'Not Ready',
      });
    });

    const stored = getData('nurses');
    expect(stored).toHaveLength(1);
    expect(stored[0]).toEqual(
      expect.objectContaining({
        id: 'nurse-legacy',
        pipelineStage: 'Screening',
        version: 2,
      })
    );
    expect(latest.nurses).toEqual(stored);
  });

  it('keeps confirmed legacy create, update, and delete results across refreshes', async () => {
    setData('nurses', []);

    render(
      <Reader
        onReady={(ctx) => {
          latest = ctx;
        }}
      />
    );

    act(() => {
      latest.openCreate({
        now: new Date('2026-06-24T12:00:00Z'),
        randomUUID: () => '123e4567-e89b-42d3-a456-426614174000',
      });
      latest.updateCreateDraft({ fullName: 'Persistent Legacy Nurse' });
    });
    await act(async () => {
      await latest.createNurse();
      await latest.refreshNurses();
    });

    const id = 'nurse-123e4567-e89b-42d3-a456-426614174000';
    expect(latest.nurses).toEqual([
      expect.objectContaining({ id, fullName: 'Persistent Legacy Nurse', version: 1 }),
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
    expect(getData('nurses')).toEqual([]);
  });

  it('preserves the special functional-updater form of updateChangeHistory', () => {
    setData('changeHistory', [{ id: 'ch-1' }]);

    render(
      <Writer onClick={(ctx) => ctx.updateChangeHistory((prev) => [...prev, { id: 'ch-2' }])} />
    );

    act(() => {
      screen.getByTestId('btn').click();
    });

    const stored = getData('changeHistory');
    expect(stored.map((c) => c.id)).toEqual(['ch-1', 'ch-2']);
  });
});
