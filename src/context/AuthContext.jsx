/**
 * Authentication context for Propela Ops.
 *
 * Provides the currently authenticated user plus login/logout actions. The
 * session is persisted to localStorage so a page refresh keeps the user signed
 * in. Permissions are NOT computed here — they are derived from the live
 * settings in AppContext via the usePermissions() hook, so the stored user only
 * needs to carry its identity and role.
 *
 * `useAuth()` is intentionally resilient: when called outside an AuthProvider
 * (e.g. in isolated component tests) it returns a safe, signed-out default
 * instead of throwing.
 */
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { findAuthUserByEmail, sha256Hex } from '../data/authUsers';
import { clearAuthSession, getAuthSession, saveAuthSession } from '../lib/storage';

const AuthContext = createContext(null);

const SIGNED_OUT_DEFAULT = {
  currentUser: null,
  isAuthenticated: false,
  login: async () => ({ success: false, error: 'Authentication is not available.' }),
  logout: () => {},
};

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => getAuthSession());

  const login = useCallback(async (email, password) => {
    const user = findAuthUserByEmail(email);
    if (!user) {
      return { success: false, error: 'Invalid email or password.' };
    }
    let hashed;
    try {
      hashed = await sha256Hex(password ?? '');
    } catch {
      return { success: false, error: 'Unable to verify credentials in this environment.' };
    }
    if (hashed !== user.passwordHash) {
      return { success: false, error: 'Invalid email or password.' };
    }
    // Store only non-sensitive identity fields — never the password/hash.
    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };
    setCurrentUser(sessionUser);
    saveAuthSession(sessionUser);
    return { success: true, user: sessionUser };
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    clearAuthSession();
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: !!currentUser,
      login,
      logout,
    }),
    [currentUser, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    // Resilient fallback for usage outside a provider (e.g. isolated tests).
    return SIGNED_OUT_DEFAULT;
  }
  return context;
}

export default AuthContext;
