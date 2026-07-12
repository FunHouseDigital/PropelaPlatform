/**
 * Login screen (Task 8.4).
 *
 * Email + password sign-in form matching the existing UI style (Tailwind +
 * lucide-react, mirroring `ConfigError.jsx`). It implements:
 *   - Empty-field validation: an empty email or password rejects the submission
 *     and shows a "complete the required fields" message without calling the
 *     auth service (Req 3.5).
 *   - Generic invalid-credential handling: a failed sign-in shows a single
 *     message that never discloses whether the email or the password was wrong
 *     (Req 3.4).
 *   - Auth-unavailable / timeout handling: a NETWORK error shows a
 *     "temporarily unavailable" message and the entered email is preserved so
 *     the user can retry without retyping it (Req 3.6).
 * On success, the user is navigated to the page they originally requested (or
 * the app root).
 */

import { AlertTriangle, Loader2, LogIn } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';
import { DataErrorCode } from '../lib/dataLayer/errors';

export default function Login() {
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
