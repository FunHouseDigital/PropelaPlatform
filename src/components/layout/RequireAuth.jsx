/**
 * RequireAuth route guard (Task 8.3).
 *
 * Gates the wrapped data views behind an active session — but only when the
 * `SUPABASE_BACKEND` flag is ON. While the flag is OFF (the legacy
 * `localStorage` default), it renders its children directly with no gating so
 * the app continues to work with no login required (Req 9.1).
 *
 * When the backend is active:
 *   - While the session is still hydrating, a loading indicator is shown so we
 *     never redirect a genuinely-authenticated user on a transient null.
 *   - If there is no active session, or the session has expired (Req 3.9), the
 *     user is redirected to `/login` via react-router `<Navigate>` (client-side,
 *     effectively immediate — well within the 2 s budget, Req 3.1), blocking the
 *     wrapped data views and forcing re-authentication before any further DB
 *     operations.
 *   - Otherwise the children render.
 *
 * The current location is passed in navigation state so the login screen can
 * return the user to where they were headed after a successful sign-in.
 */

import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';
import { isSessionExpired } from '../../lib/auth';
import { isFeatureEnabled } from '../../lib/featureFlags';
import LoadingSpinner from './LoadingSpinner';

/**
 * @param {{ children: React.ReactNode }} props
 */
export default function RequireAuth({ children }) {
  const enabled = isFeatureEnabled('SUPABASE_BACKEND');
  const { session, loading } = useAuth();
  const location = useLocation();

  // Legacy path: no gating whatsoever (Req 9.1).
  if (!enabled) {
    return children;
  }

  // Avoid redirecting while the session is still being hydrated.
  if (loading) {
    return <LoadingSpinner />;
  }

  // No session or an expired session forces (re-)authentication (Req 3.1, 3.9).
  if (!session || isSessionExpired(session)) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}
