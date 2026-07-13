/**
 * Application configuration module.
 * Separates build-time config (VITE_ prefixed env vars) from
 * runtime config (window.__RUNTIME_CONFIG__ for server injection).
 */

// Build-time configuration from Vite environment variables
const buildConfig = {
  appTitle: import.meta.env.VITE_APP_TITLE || 'Propela Platform',
  appVersion: import.meta.env.VITE_APP_VERSION || '0.0.0',
  apiUrl: import.meta.env.VITE_API_URL || 'http://localhost:3001/api',
  sentryDsn: import.meta.env.VITE_SENTRY_DSN || '',
  enableServiceWorker: import.meta.env.VITE_ENABLE_SERVICE_WORKER !== 'false',
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  environment: import.meta.env.VITE_ENVIRONMENT || 'development',
  logLevel: import.meta.env.VITE_LOG_LEVEL || 'debug',
  featureFlags: import.meta.env.VITE_FEATURE_FLAGS || '',
};

// Runtime configuration (can be injected by server at request time)
const runtimeConfig = (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__) || {};

// Merged configuration with runtime overriding build-time
export const appConfig = {
  ...buildConfig,
  ...runtimeConfig,
};

// Environment detection helpers
export const isDevelopment = appConfig.environment === 'development';
export const isStaging = appConfig.environment === 'staging';
export const isProduction = appConfig.environment === 'production';

/**
 * Required Supabase configuration variable names (Req 7.1).
 * These are the only Supabase secrets that may be exposed to the frontend;
 * the service_role key and DB password are intentionally excluded (Req 7.2).
 */
export const REQUIRED_SUPABASE_CONFIG = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'];

/**
 * Validates that the required Supabase configuration values are present and
 * non-empty at startup (Req 7.1, 7.3).
 *
 * A value is considered missing when the environment variable is absent, an
 * empty string, or a string containing only whitespace.
 *
 * @returns {{ ok: boolean, missing: string[] }} `ok` is true only when every
 *   required value is present; `missing` lists the names of every required
 *   value that is absent or empty (in declaration order).
 */
export function validateSupabaseConfig() {
  const env = import.meta.env || {};
  const missing = REQUIRED_SUPABASE_CONFIG.filter((name) => {
    const value = env[name];
    return typeof value !== 'string' || value.trim() === '';
  });

  return { ok: missing.length === 0, missing };
}

export default appConfig;
