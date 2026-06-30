import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';

/**
 * ProtectedRoute guards authenticated areas of the app.
 *
 * Unauthenticated users are redirected to /login. The location they were
 * trying to reach is preserved in router state (`from`) so the Login page can
 * send them back there after a successful sign-in.
 *
 * Supports two usage styles:
 *   - As a layout/wrapper route (renders <Outlet /> for nested routes).
 *   - As a wrapper around explicit children: <ProtectedRoute><Page /></ProtectedRoute>.
 *
 * NOTE: Role-based authorization is intentionally NOT handled here yet — that
 * is Fix #2. This component only checks that a user is authenticated.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ?? <Outlet />;
}
