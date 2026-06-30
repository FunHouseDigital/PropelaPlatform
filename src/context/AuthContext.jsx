/**
 * AuthContext — client-side authentication scaffold.
 *
 * This is intentionally structured so it can later be swapped for a real
 * backend / identity provider with minimal churn:
 *   - `login()` returns a result object ({ success, error?, user? }) so the UI
 *     never has to know whether the check happened locally or over the network.
 *   - The session is persisted in `sessionStorage` (survives refresh, cleared
 *     when the tab/browser closes). When a backend exists this can be replaced
 *     with a real token (and ideally an httpOnly cookie) without touching
 *     consumers.
 *   - Only a sanitized user object is ever persisted — never password material.
 *
 * @typedef {Object} SessionUser
 * @property {string} id
 * @property {string} name
 * @property {string} email
 * @property {string} role
 *
 * @typedef {Object} AuthContextValue
 * @property {SessionUser|null} currentUser - The currently authenticated user, or null.
 * @property {boolean} isAuthenticated - Whether a user is currently logged in.
 * @property {(credentials: { email: string, password: string }) => { success: boolean, error?: string, user?: SessionUser }} login
 * @property {() => void} logout - Clears the current session.
 */

import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import { getSettings } from '../lib/storage';

const AuthContext = createContext(null);

// Namespaced to match the app's storage convention (propela_ops_*).
const SESSION_KEY = 'propela_ops_auth_session';

/**
 * Read the persisted session user from sessionStorage.
 * @returns {SessionUser|null}
 */
function loadSession() {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading auth session:', e);
    return null;
  }
}

/**
 * Persist (or clear) the session user in sessionStorage.
 * @param {SessionUser|null} user
 */
function persistSession(user) {
  try {
    if (user) {
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    } else {
      sessionStorage.removeItem(SESSION_KEY);
    }
  } catch (e) {
    console.error('Error writing auth session:', e);
  }
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => loadSession());

  const login = useCallback(({ email, password } = {}) => {
    const normalizedEmail = String(email || '')
      .trim()
      .toLowerCase();

    // Credential source for now: the seeded users in settings. When a real
    // backend exists, this lookup becomes an API call.
    const settings = getSettings();
    const users = Array.isArray(settings?.users) ? settings.users : [];
    const user = users.find((u) => String(u.email || '').toLowerCase() === normalizedEmail);

    // Use a single generic message for all failure modes to avoid leaking
    // whether a given email exists.
    const invalidCredentials = { success: false, error: 'Invalid email or password.' };

    if (!user) {
      return invalidCredentials;
    }

    // TODO(auth): There is no backend yet, so passwords are NOT verified against
    // any stored credential. This is a deliberate placeholder. Once a real
    // identity provider / backend is wired up, replace this block with a proper
    // server-side credential check (hashed password comparison, token issuance,
    // MFA, etc.). For now we only require a non-empty password and match the
    // user by email.
    if (!password) {
      return invalidCredentials;
    }

    if (user.status && user.status !== 'Active') {
      return {
        success: false,
        error: 'This account is inactive. Please contact your administrator.',
      };
    }

    // Store a sanitized user object — never persist password material.
    const sessionUser = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    setCurrentUser(sessionUser);
    persistSession(sessionUser);
    return { success: true, user: sessionUser };
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    persistSession(null);
  }, []);

  const value = useMemo(
    () => ({
      currentUser,
      isAuthenticated: currentUser !== null,
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
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext;
