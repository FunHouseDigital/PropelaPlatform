/**
 * Unit tests for the RequireAuth route guard (Task 8.5).
 *
 * Covers: no gating when the flag is OFF (Req 9.1), redirect-to-login for an
 * unauthenticated user (Req 3.1), forced re-auth on an expired session
 * (Req 3.9), and pass-through for a valid session.
 */

import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import RequireAuth from '../RequireAuth';

const flag = { value: true };
const authState = { value: { session: null, loading: false } };

vi.mock('../../../lib/featureFlags', () => ({
  isFeatureEnabled: () => flag.value,
}));

vi.mock('../../../context/AuthContext', () => ({
  useAuth: () => authState.value,
}));

function renderGuard() {
  return render(
    <MemoryRouter initialEntries={['/secret']}>
      <Routes>
        <Route
          path="/secret"
          element={
            <RequireAuth>
              <div>secret content</div>
            </RequireAuth>
          }
        />
        <Route path="/login" element={<div>login page</div>} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  flag.value = true;
  authState.value = { session: null, loading: false };
});

describe('RequireAuth', () => {
  it('renders children with no gating when the flag is OFF (Req 9.1)', () => {
    flag.value = false;
    authState.value = { session: null, loading: false };
    renderGuard();
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });

  it('redirects an unauthenticated user to /login (Req 3.1)', () => {
    flag.value = true;
    authState.value = { session: null, loading: false };
    renderGuard();
    expect(screen.getByText('login page')).toBeInTheDocument();
    expect(screen.queryByText('secret content')).not.toBeInTheDocument();
  });

  it('forces re-auth when the session has expired (Req 3.9)', () => {
    flag.value = true;
    authState.value = {
      session: { expires_at: Math.floor(Date.now() / 1000) - 60 },
      loading: false,
    };
    renderGuard();
    expect(screen.getByText('login page')).toBeInTheDocument();
  });

  it('renders children for a valid active session', () => {
    flag.value = true;
    authState.value = {
      session: { expires_at: Math.floor(Date.now() / 1000) + 3600 },
      loading: false,
    };
    renderGuard();
    expect(screen.getByText('secret content')).toBeInTheDocument();
  });
});
