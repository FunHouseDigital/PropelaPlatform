/**
 * Integration tests for the flag-ON (Supabase) auth + RBAC route gating.
 *
 * These validate the FINISHED flag-ON behaviour end-to-end using the REAL
 * AuthProvider (Supabase path), the REAL RequireAuth auth gate, and the REAL
 * RequirePermission + usePermissions RBAC layer — the same guards App.jsx wires
 * up for the Supabase routes. Only the boundaries are faked: the Supabase auth
 * client (session) + the `profiles` role lookup, and the AppContext settings
 * that carry the live role-permission matrix.
 *
 * Covered:
 *   - unauthenticated (no session) → redirected to /login (Req 3.1)
 *   - session + Superadmin profile role → full access (sees a Settings page)
 *   - session + Read-only profile role → gated on a Settings-scoped route (403)
 *   - session + no profile row (null role) → gated on module routes but still
 *     reaches auth-only routes (module === null)
 *
 * Together with AuthContext.test.jsx (session → profiles role) and Login.test.jsx
 * (signIn → navigate / error), this proves the profile role drives access.
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const h = vi.hoisted(() => ({
  // Controllable session + profile role for each test.
  session: null,
  role: null,
}));

// Flag ON → AuthProvider renders the Supabase path; App would render SupabaseRoutes.
vi.mock('../../lib/featureFlags', () => ({
  isFeatureEnabled: () => true,
}));

// Fake Supabase auth surface consumed by AuthContext + RequireAuth.
vi.mock('../../lib/auth', () => ({
  getSession: async () => ({ session: h.session, error: null }),
  onAuthStateChange: () => ({ data: { subscription: { unsubscribe: () => {} } } }),
  signIn: vi.fn(),
  signOut: vi.fn(async () => ({ error: null })),
  isSessionExpired: (s) =>
    !s ? true : typeof s.expires_at === 'number' ? Date.now() >= s.expires_at * 1000 : false,
}));

// Fake `profiles` role lookup (client.from('profiles').select('role').eq(...).maybeSingle()).
vi.mock('../../lib/supabaseClient', () => ({
  getSupabaseClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({
            data: h.role ? { role: h.role } : null,
            error: null,
          }),
        }),
      }),
    }),
  }),
}));

// Live role-permission matrix (mirrors seedSettings): Superadmin full access,
// Read-only blocked from Settings.
vi.mock('../../context/AppContext', () => ({
  AppProvider: ({ children }) => children,
  useAppContext: () => ({
    settings: {
      rolePermissions: {
        Superadmin: { Dashboard: true, Nurses: true, Settings: true, Analytics: true },
        Admin: { Dashboard: true, Nurses: true, Settings: true, Analytics: true },
        'Read-only': { Dashboard: true, Nurses: true, Settings: false, Analytics: true },
      },
    },
  }),
}));

import RequirePermission from '../../components/auth/RequirePermission';
import RequireAuth from '../../components/layout/RequireAuth';
import { AuthProvider } from '../../context/AuthContext';

function TestLayout() {
  return <Outlet />;
}

/** Render the Supabase-mode guarded route tree, mirroring App.jsx SupabaseRoutes. */
function renderAt(path) {
  return render(
    <AuthProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/login" element={<div>login page</div>} />
          <Route
            element={
              <RequireAuth>
                <TestLayout />
              </RequireAuth>
            }
          >
            <Route
              path="/settings"
              element={
                <RequirePermission module="Settings">
                  <div>settings content</div>
                </RequirePermission>
              }
            />
            <Route
              path="/notifications"
              element={
                <RequirePermission module={null}>
                  <div>notifications content</div>
                </RequirePermission>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  );
}

const activeSession = () => ({
  user: { id: 'user-1', email: 'super@propela.co' },
  expires_at: Math.floor(Date.now() / 1000) + 3600,
});

beforeEach(() => {
  h.session = null;
  h.role = null;
  vi.clearAllMocks();
});

describe('Supabase auth + RBAC route gating (flag ON)', () => {
  it('redirects an unauthenticated user to /login (Req 3.1)', async () => {
    h.session = null;
    renderAt('/settings');

    expect(await screen.findByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('settings content')).not.toBeInTheDocument();
  });

  it('grants a Superadmin full access (role loaded from profiles)', async () => {
    h.session = activeSession();
    h.role = 'Superadmin';
    renderAt('/settings');

    expect(await screen.findByText('settings content')).toBeInTheDocument();
  });

  it('gates a Read-only user out of a Settings-scoped route (403)', async () => {
    h.session = activeSession();
    h.role = 'Read-only';
    renderAt('/settings');

    expect(await screen.findByText('Access denied')).toBeInTheDocument();
    expect(screen.queryByText('settings content')).not.toBeInTheDocument();
  });

  it('gates a signed-in user with no profile role out of module routes', async () => {
    h.session = activeSession();
    h.role = null;
    renderAt('/settings');

    expect(await screen.findByText('Access denied')).toBeInTheDocument();
    expect(screen.queryByText('settings content')).not.toBeInTheDocument();
  });

  it('still lets a signed-in user reach auth-only routes (module === null)', async () => {
    h.session = activeSession();
    h.role = null;
    renderAt('/notifications');

    expect(await screen.findByText('notifications content')).toBeInTheDocument();
  });
});
