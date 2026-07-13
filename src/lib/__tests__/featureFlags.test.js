import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  FEATURE_FLAGS,
  getFeatureFlags,
  isFeatureEnabled,
  setLocalStorageOverrides,
} from '../featureFlags';

describe('featureFlags module', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetModules();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('FEATURE_FLAGS constants', () => {
    it('exports all expected flag names', () => {
      expect(FEATURE_FLAGS.ENHANCED_ANALYTICS).toBe('ENHANCED_ANALYTICS');
      expect(FEATURE_FLAGS.WORKFLOW_AUTOMATION_V2).toBe('WORKFLOW_AUTOMATION_V2');
      expect(FEATURE_FLAGS.DARK_MODE).toBe('DARK_MODE');
      expect(FEATURE_FLAGS.AI_SUGGESTIONS).toBe('AI_SUGGESTIONS');
      expect(FEATURE_FLAGS.SUPABASE_BACKEND).toBe('SUPABASE_BACKEND');
    });

    it('has exactly 5 flags defined', () => {
      expect(Object.keys(FEATURE_FLAGS)).toHaveLength(5);
    });
  });

  describe('getFeatureFlags', () => {
    it('returns all flags as false by default when no env or overrides', () => {
      const flags = getFeatureFlags();

      expect(flags.ENHANCED_ANALYTICS).toBe(false);
      expect(flags.WORKFLOW_AUTOMATION_V2).toBe(false);
      expect(flags.DARK_MODE).toBe(false);
      expect(flags.AI_SUGGESTIONS).toBe(false);
      expect(flags.SUPABASE_BACKEND).toBe(false);
    });

    it('returns flags matching known flag names only', () => {
      const flags = getFeatureFlags();
      const keys = Object.keys(flags);

      expect(keys).toContain('ENHANCED_ANALYTICS');
      expect(keys).toContain('WORKFLOW_AUTOMATION_V2');
      expect(keys).toContain('DARK_MODE');
      expect(keys).toContain('AI_SUGGESTIONS');
    });

    it('applies localStorage overrides', () => {
      const overrides = { DARK_MODE: true, AI_SUGGESTIONS: true };
      localStorage.setItem('propela_feature_flags_override', JSON.stringify(overrides));

      const flags = getFeatureFlags();

      expect(flags.DARK_MODE).toBe(true);
      expect(flags.AI_SUGGESTIONS).toBe(true);
      expect(flags.ENHANCED_ANALYTICS).toBe(false);
    });

    it('ignores invalid JSON in localStorage', () => {
      localStorage.setItem('propela_feature_flags_override', 'not-valid-json{');

      const flags = getFeatureFlags();

      // Should not throw, and return defaults
      expect(flags.DARK_MODE).toBe(false);
    });

    it('ignores unknown flag names in localStorage overrides', () => {
      const overrides = { UNKNOWN_FLAG: true, DARK_MODE: true };
      localStorage.setItem('propela_feature_flags_override', JSON.stringify(overrides));

      const flags = getFeatureFlags();

      expect(flags.DARK_MODE).toBe(true);
      expect(flags).not.toHaveProperty('UNKNOWN_FLAG');
    });
  });

  describe('setLocalStorageOverrides', () => {
    it('persists overrides to localStorage', () => {
      setLocalStorageOverrides({ DARK_MODE: true });

      const stored = JSON.parse(localStorage.getItem('propela_feature_flags_override'));
      expect(stored.DARK_MODE).toBe(true);
    });

    it('overwrites previous overrides', () => {
      setLocalStorageOverrides({ DARK_MODE: true });
      setLocalStorageOverrides({ DARK_MODE: false, AI_SUGGESTIONS: true });

      const stored = JSON.parse(localStorage.getItem('propela_feature_flags_override'));
      expect(stored.DARK_MODE).toBe(false);
      expect(stored.AI_SUGGESTIONS).toBe(true);
    });
  });

  describe('isFeatureEnabled', () => {
    it('returns false for a disabled flag', () => {
      expect(isFeatureEnabled('DARK_MODE')).toBe(false);
    });

    it('returns true for an enabled flag via localStorage override', () => {
      setLocalStorageOverrides({ ENHANCED_ANALYTICS: true });

      expect(isFeatureEnabled('ENHANCED_ANALYTICS')).toBe(true);
    });

    it('returns false for an unknown flag name', () => {
      expect(isFeatureEnabled('NONEXISTENT_FLAG')).toBe(false);
    });

    it('localStorage override can disable a flag', () => {
      setLocalStorageOverrides({ DARK_MODE: false });

      expect(isFeatureEnabled('DARK_MODE')).toBe(false);
    });
  });

  describe('SUPABASE_BACKEND flag (Requirements 9.1, 9.2)', () => {
    it('defaults to false so the legacy localStorage path stays live', () => {
      expect(isFeatureEnabled('SUPABASE_BACKEND')).toBe(false);
      expect(getFeatureFlags().SUPABASE_BACKEND).toBe(false);
    });

    it('can be enabled via the localStorage override mechanism', () => {
      setLocalStorageOverrides({ SUPABASE_BACKEND: true });

      expect(isFeatureEnabled('SUPABASE_BACKEND')).toBe(true);
    });

    it('can be enabled via the VITE_FEATURE_FLAGS env mechanism', async () => {
      vi.resetModules();
      vi.doMock('../config', () => ({
        appConfig: { featureFlags: 'SUPABASE_BACKEND' },
      }));

      const { isFeatureEnabled: isEnabled } = await import('../featureFlags');
      expect(isEnabled('SUPABASE_BACKEND')).toBe(true);

      vi.doUnmock('../config');
    });

    it('returns a boolean readable at module-init time', () => {
      const value = isFeatureEnabled('SUPABASE_BACKEND');
      expect(typeof value).toBe('boolean');
    });
  });
});
