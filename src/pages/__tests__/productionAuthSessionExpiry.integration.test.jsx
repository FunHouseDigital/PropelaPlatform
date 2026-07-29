import { useEffect } from 'react';

import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  authListener: null,
  getSession: vi.fn(),
  signIn: vi.fn(),
  nurseList: vi.fn(),
  getCollection: vi.fn(),
}));

vi.mock('../../lib/featureFlags', () => ({ isFeatureEnabled: () => true }));

vi.mock('../../lib/auth', () => ({
  getSession: (...args) => h.getSession(...args),
  signIn: (...args) => h.signIn(...args),
  signOut: vi.fn(async () => ({ error: null })),
  onAuthStateChange: (listener) => {
    h.authListener = listener;
    return { data: { subscription: { unsubscribe: vi.fn() } } };
  },
  isSessionExpired: (session) =>
    !session ||
    (typeof session.expires_at === 'number' && Date.now() >= session.expires_at * 1000),
}));

vi.mock('../../lib/supabaseClient', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({ maybeSingle: async () => ({ data: { role: 'Superadmin' }, error: null }) }),
      }),
    }),
  }),
}));

vi.mock('../../lib/dataLayer', () => ({
  isSupabaseBackend: true,
  getCollection: (...args) => h.getCollection(...args),
  list: vi.fn(async () => ({ data: [], error: null, page: 1, pageSize: 25, total: 0 })),
  saveCollection: vi.fn(async () => ({ data: null, error: null })),
  nurseOps: {
    list: (...args) => h.nurseList(...args),
    get: vi.fn(async () => ({ data: null, error: null, notFound: true })),
    create: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
}));

import RequireAuth from '../../components/layout/RequireAuth';
import { AppProvider, useAppContext } from '../../context/AppContext';
import { AuthProvider, useAuth } from '../../context/AuthContext';
import Login from '../Login';

const activeSession = (suffix = '1') => ({
  access_token: `redacted-test-token-${suffix}`,
  expires_at: Math.floor(Date.now() / 1000) + 3600,
  user: { id: 'user-1', email: 'nurse@example.test' },
});

let latestJourneyApp = null;
let latestJourneyAuth = null;

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

function NursesProbe() {
  const app = useAppContext();
  const auth = useAuth();
  useEffect(() => {
    latestJourneyApp = app;
    latestJourneyAuth = auth;
  }, [app, auth]);
  const { nurses, refreshNurses } = app;
  const { readiness, signIn } = auth;
  return (
    <div>
      <span data-testid="readiness">{`${readiness.status}:${readiness.authEpoch}`}</span>
      <span>{nurses[0]?.fullName ?? 'empty'}</span>
      <button type="button" onClick={() => refreshNurses()}>Refresh nurses</button>
      <button
        type="button"
        onClick={async () => {
          await signIn('nurse@example.test', 'password');
          await refreshNurses();
        }}
      >
        Sign in again and refresh
      </button>
    </div>
  );
}

function renderJourney() {
  return render(
    <AuthProvider>
      <AppProvider>
        <MemoryRouter initialEntries={['/nurses']}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/nurses"
              element={
                <RequireAuth>
                  <NursesProbe />
                </RequireAuth>
              }
            />
          </Routes>
        </MemoryRouter>
      </AppProvider>
    </AuthProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  h.authListener = null;
  latestJourneyApp = null;
  latestJourneyAuth = null;
  h.getSession.mockResolvedValue({ session: null, error: null });
  h.getCollection.mockResolvedValue({ data: [], error: null });
  h.nurseList.mockResolvedValue({
    data: [{ id: 'nurse-1', fullName: 'Server Confirmed', version: 1 }],
    error: null,
    page: 1,
    pageSize: 100,
    total: 1,
  });
  h.signIn
    .mockResolvedValueOnce({ data: { session: activeSession('1') }, error: null })
    .mockResolvedValueOnce({ data: { session: activeSession('2') }, error: null });
});

describe('production auth session expiry regression', () => {
  it('uses provider readiness for the first nurse list after clean-browser sign-in', async () => {
    const user = userEvent.setup();
    renderJourney();

    expect(await screen.findByTestId('login-screen')).toBeInTheDocument();
    const initialSessionReads = h.getSession.mock.calls.length;
    expect(h.nurseList).not.toHaveBeenCalled();

    await user.type(screen.getByLabelText('Email'), 'nurse@example.test');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));

    expect(await screen.findByText('Server Confirmed')).toBeInTheDocument();
    expect(screen.getByTestId('readiness')).toHaveTextContent('active:1');
    expect(h.nurseList).toHaveBeenCalledTimes(1);
    expect(h.getSession).toHaveBeenCalledTimes(initialSessionReads);
    expect(screen.queryByText('Your session has expired. Please sign in again.')).not.toBeInTheDocument();
  });

  it('uses the new active epoch for a manual nurse load after repeated sign-in', async () => {
    const user = userEvent.setup();
    renderJourney();

    await screen.findByTestId('login-screen');
    await user.type(screen.getByLabelText('Email'), 'nurse@example.test');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText('Server Confirmed');

    h.nurseList.mockClear();
    const sessionReads = h.getSession.mock.calls.length;
    await user.click(screen.getByRole('button', { name: 'Sign in again and refresh' }));

    await waitFor(() => expect(screen.getByTestId('readiness')).toHaveTextContent('active:2'));
    expect(h.nurseList).toHaveBeenCalledTimes(1);
    expect(h.getSession).toHaveBeenCalledTimes(sessionReads);
  });

  it('rejects an old nurse completion immediately after synchronous repeated sign-in commit', async () => {
    const user = userEvent.setup();
    renderJourney();

    await screen.findByTestId('login-screen');
    await user.type(screen.getByLabelText('Email'), 'nurse@example.test');
    await user.type(screen.getByLabelText('Password'), 'password');
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    await screen.findByText('Server Confirmed');

    act(() => {
      latestJourneyApp.openCreate({
        now: new Date('2026-07-29T12:00:00Z'),
        randomUUID: () => '123e4567-e89b-42d3-a456-426614174000',
      });
      latestJourneyApp.updateCreateDraft({ fullName: 'Safe same-user draft' });
    });

    const oldEpochList = deferred();
    h.nurseList.mockImplementationOnce(() => oldEpochList.promise);
    let oldRequest;
    await act(async () => {
      oldRequest = latestJourneyApp.refreshNurses();
      await latestJourneyAuth.signIn('nurse@example.test', 'password');
      expect(latestJourneyAuth.getReadinessSnapshot()).toMatchObject({
        status: 'active',
        userId: 'user-1',
        authEpoch: 2,
      });
      oldEpochList.resolve({
        data: [{ id: 'stale-epoch-row', fullName: 'Stale Epoch Result', version: 1 }],
        error: null,
        page: 1,
        pageSize: 100,
        total: 1,
      });
      await oldRequest;
    });

    expect(screen.queryByText('Stale Epoch Result')).not.toBeInTheDocument();
    expect(screen.getByText('Server Confirmed')).toBeInTheDocument();
    expect(latestJourneyApp.nurseSlice.createDraft).toMatchObject({
      fullName: 'Safe same-user draft',
    });

    h.nurseList.mockResolvedValueOnce({
      data: [{ id: 'current-epoch-row', fullName: 'Current Epoch Result', version: 2 }],
      error: null,
      page: 1,
      pageSize: 100,
      total: 1,
    });
    await act(async () => {
      await latestJourneyApp.refreshNurses();
    });
    expect(screen.getByText('Current Epoch Result')).toBeInTheDocument();
    expect(screen.queryByText('Server Confirmed')).not.toBeInTheDocument();
  });
});
