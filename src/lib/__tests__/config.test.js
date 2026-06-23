import { describe, expect, it, vi, beforeEach } from 'vitest';

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
