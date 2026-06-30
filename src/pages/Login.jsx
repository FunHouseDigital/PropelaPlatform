import { Lock, LogIn, Mail } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';

import { useAuth } from '../context/AuthContext';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Where to send the user after a successful login (the page they were
  // trying to reach before being redirected here), defaulting to dashboard.
  const redirectTo = location.state?.from?.pathname || '/';

  // Already logged in? Don't show the login form.
  if (isAuthenticated) {
    return <Navigate to={redirectTo} replace />;
  }

  function validate() {
    const errors = {};
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      errors.email = 'Email is required.';
    } else if (!EMAIL_REGEX.test(trimmedEmail)) {
      errors.email = 'Enter a valid email address.';
    }

    if (!password) {
      errors.password = 'Password is required.';
    }

    return errors;
  }

  function handleSubmit(e) {
    e.preventDefault();
    setFormError('');

    const errors = validate();
    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    setSubmitting(true);
    const result = login({ email, password });
    setSubmitting(false);

    if (result.success) {
      navigate(redirectTo, { replace: true });
    } else {
      setFormError(result.error || 'Unable to sign in. Please try again.');
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 py-12"
      style={{
        background: 'linear-gradient(135deg, #5B2D8E 0%, #3D1D5E 100%)',
      }}
    >
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Propela logo" width={40} height={40} className="rounded-lg" />
            <span className="text-white font-semibold text-2xl tracking-tight">propela</span>
          </div>
          <p className="text-white/60 text-sm mt-1">Ops Platform</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h1>
          <p className="text-sm text-gray-500 mb-6">Welcome back. Please enter your details.</p>

          {formError && (
            <div
              role="alert"
              className="mb-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
            >
              {formError}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400">
                  <Mail size={16} />
                </span>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={fieldErrors.email ? 'true' : undefined}
                  aria-describedby={fieldErrors.email ? 'email-error' : undefined}
                  className={`w-full rounded-lg border ps-9 pe-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-2 focus:ring-[#5B2D8E]/30 ${
                    fieldErrors.email
                      ? 'border-red-300 focus:border-red-400'
                      : 'border-gray-300 focus:border-[#5B2D8E]'
                  }`}
                  placeholder="you@propela.co.za"
                />
              </div>
              {fieldErrors.email && (
                <p id="email-error" className="mt-1 text-xs text-red-600">
                  {fieldErrors.email}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="mb-6">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-gray-400">
                  <Lock size={16} />
                </span>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={fieldErrors.password ? 'true' : undefined}
                  aria-describedby={fieldErrors.password ? 'password-error' : undefined}
                  className={`w-full rounded-lg border ps-9 pe-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition-colors focus:ring-2 focus:ring-[#5B2D8E]/30 ${
                    fieldErrors.password
                      ? 'border-red-300 focus:border-red-400'
                      : 'border-gray-300 focus:border-[#5B2D8E]'
                  }`}
                  placeholder="Enter your password"
                />
              </div>
              {fieldErrors.password && (
                <p id="password-error" className="mt-1 text-xs text-red-600">
                  {fieldErrors.password}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[#5B2D8E] px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#4A2473] focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/40 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogIn size={16} />
              {submitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>

          {/* Placeholder notice — no backend yet. */}
          <p className="mt-6 text-center text-xs text-gray-400">
            Use a seeded team email (e.g. aya@propela.co.za). Password is not yet verified while
            running without a backend.
          </p>
        </div>
      </div>
    </div>
  );
}
