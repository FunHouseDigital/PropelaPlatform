import { Navigate, Outlet, useLocation } from 'react-router-dom';

import { useAuth } from '../../context/AuthContext';

/**
 * Route guard that requires an authenticated user.
 *
 * Used as a layout (wrapper) route: if the user is signed in it renders nested
 * routes via <Outlet>; otherwise it redirects to /login, preserving the
 * originally requested location so the user can be sent back after signing in.
 */
export default function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children ?? <Outlet />;
}
