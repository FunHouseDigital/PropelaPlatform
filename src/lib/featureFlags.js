import { createContext, createElement, useContext, useMemo } from 'react';

import { appConfig } from './config';

/**
 * Feature flag name constants.
 */
export const FEATURE_FLAGS = {
  ENHANCED_ANALYTICS: 'ENHANCED_ANALYTICS',
  WORKFLOW_AUTOMATION_V2: 'WORKFLOW_AUTOMATION_V2',
  DARK_MODE: 'DARK_MODE',
  AI_SUGGESTIONS: 'AI_SUGGESTIONS',
  // Routes the Data_Layer to the Supabase backend when enabled. Default OFF so
  // the legacy localStorage storage path stays live; enable via VITE_FEATURE_FLAGS
  // or a localStorage override to cut over to Supabase.
  SUPABASE_BACKEND: 'SUPABASE_BACKEND',
};

const STORAGE_KEY = 'propela_feature_flags_override';

/**
 * Reads localStorage overrides for feature flags.
 * Returns an object mapping flag names to boolean values.
 */
function getLocalStorageOverrides() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // Ignore parse errors
  }
  return {};
}

/**
 * Saves feature flag overrides to localStorage.
 */
export function setLocalStorageOverrides(overrides) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(overrides));
  } catch {
    // Ignore storage errors
  }
}

/**
 * Returns the set of currently enabled feature flags.
 * Combines env var flags with localStorage overrides.
 * localStorage overrides take precedence.
 */
export function getFeatureFlags() {
  // Parse flags from environment variable (comma-separated)
  const envFlags = {};
  const flagString = appConfig.featureFlags || '';
  if (flagString.trim()) {
    flagString.split(',').forEach((flag) => {
      const trimmed = flag.trim();
      if (trimmed) {
        envFlags[trimmed] = true;
      }
    });
  }

  // Get localStorage overrides
  const overrides = getLocalStorageOverrides();

  // Merge: start with all known flags as false, apply env, then overrides
  const flags = {};
  Object.values(FEATURE_FLAGS).forEach((flagName) => {
    flags[flagName] = false;
  });

  // Apply env flags
  Object.keys(envFlags).forEach((flagName) => {
    if (flagName in flags) {
      flags[flagName] = true;
    }
  });

  // Apply localStorage overrides (explicit true/false)
  Object.entries(overrides).forEach(([flagName, value]) => {
    if (flagName in flags) {
      flags[flagName] = Boolean(value);
    }
  });

  return flags;
}

/**
 * Check if a specific feature flag is enabled.
 */
export function isFeatureEnabled(flagName) {
  const flags = getFeatureFlags();
  return flags[flagName] === true;
}

// React Context for feature flags
const FeatureFlagContext = createContext({});

/**
 * Provider component that makes feature flags available via context.
 * NOTE: Flags are evaluated once at mount time and do not update dynamically.
 * Consumers must reload the page for flag changes to take effect.
 */
export function FeatureFlagProvider({ children }) {
  // Intentionally empty dependency array: flags are read once at mount.
  // A page reload is required for changes (e.g., localStorage overrides) to propagate.
  const flags = useMemo(() => getFeatureFlags(), []);

  return createElement(FeatureFlagContext.Provider, { value: flags }, children);
}

/**
 * Hook to access feature flags from context.
 */
export function useFeatureFlags() {
  return useContext(FeatureFlagContext);
}
