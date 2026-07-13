import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the supabase-js library so no real network client is constructed. The
// mock records every argument createClient is called with, letting us assert
// which credentials the module passes through.
const createClientMock = vi.fn(() => ({ __isMockSupabaseClient: true }));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

const TEST_URL = 'https://example.supabase.co';
const TEST_ANON_KEY = 'anon-key-123';
// A value that must NEVER be handed to createClient.
const SERVICE_ROLE_LIKE = 'service_role-super-secret-key';

describe('supabaseClient', () => {
  beforeEach(() => {
    vi.resetModules();
    createClientMock.mockClear();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('exposes a client factory and a default export', async () => {
    const mod = await import('../supabaseClient');

    expect(typeof mod.getSupabaseClient).toBe('function');
    expect(mod.default).toBe(mod.getSupabaseClient);
  });

  it('does not create a client merely by importing the module (import-safe)', async () => {
    // No env configured, but importing must not throw or instantiate anything.
    await import('../supabaseClient');

    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('creates the client with the URL and anon key', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', TEST_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', TEST_ANON_KEY);

    const { getSupabaseClient } = await import('../supabaseClient');
    const instance = getSupabaseClient();

    expect(createClientMock).toHaveBeenCalledTimes(1);
    expect(createClientMock).toHaveBeenCalledWith(
      TEST_URL,
      TEST_ANON_KEY,
      expect.any(Object),
    );
    expect(instance).toEqual({ __isMockSupabaseClient: true });
  });

  it('returns the same memoized singleton on repeated calls', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', TEST_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', TEST_ANON_KEY);

    const { getSupabaseClient } = await import('../supabaseClient');
    const first = getSupabaseClient();
    const second = getSupabaseClient();

    expect(first).toBe(second);
    expect(createClientMock).toHaveBeenCalledTimes(1);
  });

  it('never passes a service-role-like value to createClient', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', TEST_URL);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', TEST_ANON_KEY);
    // Even if a service-role-like secret leaked into the environment, it must
    // not be referenced by this module.
    vi.stubEnv('VITE_SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_LIKE);
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', SERVICE_ROLE_LIKE);

    const { getSupabaseClient } = await import('../supabaseClient');
    getSupabaseClient();

    for (const call of createClientMock.mock.calls) {
      for (const arg of call) {
        expect(JSON.stringify(arg) ?? '').not.toContain(SERVICE_ROLE_LIKE);
        expect(JSON.stringify(arg) ?? '').not.toContain('service_role');
      }
    }
  });

  it('throws when required configuration is missing', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', undefined);
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', undefined);

    const { getSupabaseClient } = await import('../supabaseClient');

    expect(() => getSupabaseClient()).toThrow(/missing configuration/i);
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('rejects a non-HTTPS Supabase URL (Req 10.1)', async () => {
    vi.stubEnv('VITE_SUPABASE_URL', 'http://insecure.supabase.co');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', TEST_ANON_KEY);

    const { getSupabaseClient } = await import('../supabaseClient');

    expect(() => getSupabaseClient()).toThrow(/HTTPS/i);
    expect(createClientMock).not.toHaveBeenCalled();
  });
});
