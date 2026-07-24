/**
 * Login screen — FLAG-SWITCHED HYBRID.
 *
 * • Flag OFF (default / live): the hardened localStorage sign-in (PR #36) with
 *   client-side validation (validateEmail / validateRequired) and the live
 *   account-lockout countdown driven by getLockStatus() + the login() lockout
 *   response.
 * • Flag ON: main's Supabase sign-in with empty-field validation and
 *   DataErrorCode.NETWORK ("temporarily unavailable") handling.
 *
 * Each mode renders its own self-contained UI so both UIs' test ids and
 * behaviours are preserved.
 */

import { useEffect, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { AlertTriangle, Loader2, Lock, LogIn, Mail } from 'lucide-react';

import Logo from '../components/ui/Logo';
import { useAuth } from '../context/AuthContext';
import { isFeatureEnabled } from '../lib/featureFlags';
import { validateEmail, validateRequired } from '../lib/validation';
import { DataErrorCode } from '../lib/dataLayer/errors';

/** Format a remaining-ms cooldown as m:ss for the live countdown. */
function formatCountdown(ms) {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/**
 * Hardened localStorage login (flag OFF). Includes the lockout countdown and
 * client-side input validation.
 */
function LegacyLogin() {
  const { login, isAuthenticated, getLockStatus } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Lockout state (Fix #8). `lockedUntil` is an epoch-ms deadline; `now` ticks
  // once a second while locked to drive the countdown and auto re-enable.
  const [lockedUntil, setLockedUntil] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  const remainingMs = lockedUntil ? Math.max(0, lockedUntil - now) : 0;
  const isLocked = remainingMs > 0;

  // Where to send the user after a successful sign-in.
  const from = location.state?.from?.pathname || '/';

  // Reflect any existing lock for the typed email (e.g. after a refresh) so the
  // control starts disabled without needing a fresh failed attempt.
  useEffect(() => {
    if (typeof getLockStatus !== 'function') return;
    const status = getLockStatus(email);
    if (status.allowed) {
      setLockedUntil(null);
    } else {
      setLockedUntil(status.lockedUntil);
      setNow(Date.now());
    }
  }, [email, getLockStatus]);

  // Tick every second while locked; the interval only runs during a cooldown.
  useEffect(() => {
    if (!lockedUntil) return undefined;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [lockedUntil]);

  // When the countdown elapses, clear the lock so the button re-enables.
  useEffect(() => {
    if (lockedUntil && remainingMs <= 0) {
      setLockedUntil(null);
      setError('');
    }
  }, [lockedUntil, remainingMs]);

  // Already signed in — send them on their way (declarative redirect).
  if (isAuthenticated) {
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Blocked by an active cooldown — never run the credential check.
    if (isLocked) {
      return;
    }

    // Client-side input validation before hitting the auth flow. This does not
    // change the auth/session logic from Fixes #1/#2 — it only blocks
    // obviously-malformed credentials from being submitted.
    if (!validateRequired(email) || !validateRequired(password)) {
      setError('Please enter your email and password.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setSubmitting(true);
    try {
      const result = await login(email, password);
      if (result.success) {
        navigate(from, { replace: true });
      } else {
        // A lockout response carries `locked` + `lockedUntil`; start the
        // countdown and disable the button. The live message is rendered from
        // the countdown below, so we only set `error` for ordinary failures.
        if (result.locked && result.lockedUntil) {
          setLockedUntil(result.lockedUntil);
          setNow(Date.now());
          setError('');
        } else {
          setError(result.error || 'Unable to sign in.');
        }
      }
    } catch {
      setError('Something went wrong while signing in. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const lockMessage = isLocked
    ? `Too many attempts. Try again in ${formatCountdown(remainingMs)}.`
    : '';

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(180deg, #5B2D8E 0%, #3D1D5E 100%)' }}
    >
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-6">
          <div className="flex items-center gap-2">
            <Logo size="lg" className="rounded-lg" />
            <span className="text-white font-semibold text-2xl tracking-tight">propela</span>
          </div>
          <p className="text-white/60 text-sm mt-1">Ops</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h1>
          <p className="text-sm text-gray-500 mb-6">Access the Propela Ops platform.</p>

          <form onSubmit={handleSubmit} className="space-y-4" noValidate>
            <div>
              <label htmlFor="login-email" className="block text-sm font-medium text-gray-700 mb-1">
                Email
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  id="login-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@propela.co"
                  required
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
                />
              </div>
            </div>

            <div>
              <label htmlFor="login-password" className="block text-sm font-medium text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                  aria-hidden="true"
                />
                <input
                  id="login-password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                  className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
                />
              </div>
            </div>

            {(isLocked || error) && (
              <div
                role="alert"
                className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2"
              >
                {isLocked ? lockMessage : error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting || isLocked}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#5B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#4a2574] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <LogIn size={16} />
              {isLocked
                ? `Locked — ${formatCountdown(remainingMs)}`
                : submitting
                  ? 'Signing in…'
                  : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

/**
 * Supabase login (flag ON). Empty-field validation + generic invalid-credential
 * handling + NETWORK "temporarily unavailable" handling. The entered email is
 * preserved across errors so the user can retry without retyping it.
 */
function SupabaseLogin() {
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [validationError, setValidationError] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setValidationError('');
    setFormError('');

    // Empty-field validation before any network call (Req 3.5).
    if (email.trim() === '' || password === '') {
      setValidationError('Please complete both the email and password fields.');
      return;
    }

    setSubmitting(true);
    const { error } = await signIn(email, password);
    setSubmitting(false);

    if (error) {
      // The entered email is intentionally never cleared, so a retry after an
      // unavailable service does not require retyping it (Req 3.6).
      if (error.code === DataErrorCode.NETWORK) {
        setFormError('Authentication is temporarily unavailable. Please try again.');
      } else {
        // Generic message — does not disclose which field was wrong (Req 3.4).
        setFormError('Invalid credentials. Please check your details and try again.');
      }
      return;
    }

    navigate(redirectTo, { replace: true });
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center bg-gray-50 px-4"
      data-testid="login-screen"
    >
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <div className="flex justify-center mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-propela-purple/10">
            <LogIn className="w-6 h-6 text-propela-purple" />
          </div>
        </div>
        <h1 className="text-xl font-semibold text-gray-900 mb-1 text-center">
          Sign in to Propela Ops
        </h1>
        <p className="text-gray-600 mb-6 text-center text-sm">
          Enter your credentials to access the platform.
        </p>

        {formError && (
          <div
            className="flex items-start gap-2 bg-red-50 text-red-800 rounded-md p-3 mb-4 text-sm"
            role="alert"
            aria-live="assertive"
            data-testid="login-error"
          >
            <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-red-500" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="mb-4">
            <label
              htmlFor="login-email"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-propela-purple focus:outline-none focus:ring-1 focus:ring-propela-purple"
              placeholder="you@example.com"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="login-password"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-propela-purple focus:outline-none focus:ring-1 focus:ring-propela-purple"
              placeholder="Your password"
            />
          </div>

          {validationError && (
            <p
              className="text-sm text-red-700 mb-4"
              role="alert"
              data-testid="login-validation-error"
            >
              {validationError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full flex items-center justify-center gap-2 rounded-md bg-propela-purple px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-propela-purple/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in…
              </>
            ) : (
              'Sign in'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function Login() {
  const useSupabase = isFeatureEnabled('SUPABASE_BACKEND');
  return useSupabase ? <SupabaseLogin /> : <LegacyLogin />;
}
