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

export default appConfig;
