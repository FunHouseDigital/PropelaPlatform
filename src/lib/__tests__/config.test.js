import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

describe('config module', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('exports appConfig with default values when env vars are missing', async () => {
    const { appConfig } = await import('../config');

    expect(appConfig.appTitle).toBe('Propela Platform');
    expect(appConfig.appVersion).toBe('0.0.0');
    expect(appConfig.apiUrl).toBe('http://localhost:3001/api');
    expect(appConfig.sentryDsn).toBe('');
    expect(appConfig.enableServiceWorker).toBe(true);
    expect(appConfig.enableAnalytics).toBe(false);
    expect(appConfig.environment).toBe('development');
    expect(appConfig.logLevel).toBe('debug');
    expect(appConfig.featureFlags).toBe('');
  });

  it('exports environment detection helpers', async () => {
    const { isDevelopment, isStaging, isProduction } = await import('../config');

    // Default environment is 'development'
    expect(isDevelopment).toBe(true);
    expect(isStaging).toBe(false);
    expect(isProduction).toBe(false);
  });

  it('appConfig includes runtime config from window.__RUNTIME_CONFIG__', async () => {
    window.__RUNTIME_CONFIG__ = { apiUrl: 'https://api.production.example.com' };

    const { appConfig } = await import('../config');

    expect(appConfig.apiUrl).toBe('https://api.production.example.com');

    delete window.__RUNTIME_CONFIG__;
  });

  it('runtime config overrides build-time config', async () => {
    window.__RUNTIME_CONFIG__ = { appTitle: 'Runtime Title' };

    const { appConfig } = await import('../config');

    expect(appConfig.appTitle).toBe('Runtime Title');

    delete window.__RUNTIME_CONFIG__;
  });

  it('has correct structure for build config fields', async () => {
    const { appConfig } = await import('../config');

    expect(appConfig).toHaveProperty('appTitle');
    expect(appConfig).toHaveProperty('appVersion');
    expect(appConfig).toHaveProperty('apiUrl');
    expect(appConfig).toHaveProperty('sentryDsn');
    expect(appConfig).toHaveProperty('enableServiceWorker');
    expect(appConfig).toHaveProperty('enableAnalytics');
    expect(appConfig).toHaveProperty('environment');
    expect(appConfig).toHaveProperty('logLevel');
    expect(appConfig).toHaveProperty('featureFlags');
  });
});

describe('validateSupabaseConfig', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports both variables missing when neither is set', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', undefined);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', undefined);
    const { validateSupabaseConfig } = await import('../config');

    const result = validateSupabaseConfig();

    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']);
  });

  it('returns ok with no missing when both are present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key-123');
    const { validateSupabaseConfig } = await import('../config');

    const result = validateSupabaseConfig();

    expect(result.ok).toBe(true);
    expect(result.missing).toEqual([]);
  });

  it('reports only the missing variable when one is present', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', undefined);
    const { validateSupabaseConfig } = await import('../config');

    const result = validateSupabaseConfig();

    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(['VITE_SUPABASE_ANON_KEY']);
  });

  it('treats an empty string as missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key-123');
    const { validateSupabaseConfig } = await import('../config');

    const result = validateSupabaseConfig();

    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(['VITE_SUPABASE_URL']);
  });

  it('treats a whitespace-only string as missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', '   ');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '\t\n');
    const { validateSupabaseConfig } = await import('../config');

    const result = validateSupabaseConfig();

    expect(result.ok).toBe(false);
    expect(result.missing).toEqual(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY']);
  });

  it('preserves the declaration order of REQUIRED_SUPABASE_CONFIG', async () => {
    const { REQUIRED_SUPABASE_CONFIG } = await import('../config');

    expect(REQUIRED_SUPABASE_CONFIG).toEqual([
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
    ]);
  });
});
