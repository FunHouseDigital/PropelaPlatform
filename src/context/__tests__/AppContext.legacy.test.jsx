import { beforeEach,describe, expect, it } from 'vitest';

import { getData, setData } from '../../lib/storage';
import { act,render, screen } from '../../test/utils';
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

    render(<Reader onReady={(ctx) => { latest = ctx; }} />);

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
      <Writer
        onClick={(ctx) => ctx.updateNurses([{ id: 'nurse-x', fullName: 'Written' }])}
      />,
    );

    act(() => {
      screen.getByTestId('btn').click();
    });

    // The write is visible in localStorage immediately (synchronous saveX).
    const stored = getData('nurses');
    expect(stored).toHaveLength(1);
    expect(stored[0].fullName).toBe('Written');
  });

  it('preserves the special functional-updater form of updateChangeHistory', () => {
    setData('changeHistory', [{ id: 'ch-1' }]);

    render(
      <Writer
        onClick={(ctx) => ctx.updateChangeHistory((prev) => [...prev, { id: 'ch-2' }])}
      />,
    );

    act(() => {
      screen.getByTestId('btn').click();
    });

    const stored = getData('changeHistory');
    expect(stored.map((c) => c.id)).toEqual(['ch-1', 'ch-2']);
  });
});
