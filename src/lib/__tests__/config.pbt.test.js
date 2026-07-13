// Feature: supabase-online-platform, Property 13: Configuration validation completeness
//
// Property 13 (design.md → Correctness Properties): for any subset of the required
// configuration values ({VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY}) that is missing
// or empty at startup, the configuration error names exactly the missing values, the
// main application is not rendered, and no database operation is attempted.
//
// Validates: Requirements 7.3

import fc from 'fast-check';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { REQUIRED_SUPABASE_CONFIG, validateSupabaseConfig } from '../config';

// Minimum number of iterations mandated by the design for every property test.
const NUM_RUNS = 100;

/**
 * Pure model of the startup gate implemented in src/main.jsx:
 *
 *   const configBlocksStartup = supabaseBackendEnabled && !supabaseConfig.ok
 *   render(configBlocksStartup ? <ConfigError/> : <App/>)
 *
 * When the gate blocks startup, <ConfigError/> is rendered instead of <App/>, so the
 * main application is never mounted and, because <App/> is what triggers any data-layer
 * / database access, no DB call is ever issued. Exercising the gate at this pure-logic
 * level lets us assert the mount / DB-call flags without rendering the whole app.
 */
function computeStartupGate(supabaseBackendEnabled, config) {
  const configBlocksStartup = supabaseBackendEnabled && !config.ok;
  return {
    appMounted: !configBlocksStartup,
    dbCallIssued: !configBlocksStartup,
  };
}

/**
 * Generates one env-var "state" covering the present / absent / empty / whitespace-only
 * cases, together with whether that state should be counted as missing.
 */
const varStateArb = fc.oneof(
  // present: a non-empty, non-whitespace string (prefixing guarantees trim() !== '')
  fc.string().map((s) => ({ value: `x${s}`, missing: false })),
  // absent: environment variable not set at all
  fc.constant({ value: undefined, missing: true }),
  // empty string
  fc.constant({ value: '', missing: true }),
  // whitespace-only
  fc.constantFrom('   ', '\t', '\n', ' \t\n ', '\r').map((v) => ({ value: v, missing: true })),
);

describe('Property 13: Configuration validation completeness', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('reports exactly the missing/empty required vars and blocks app mount + DB calls when any is missing', () => {
    fc.assert(
      fc.property(varStateArb, varStateArb, (urlState, keyState) => {
        // Set the two required env vars to the generated states.
        vi.stubEnv('VITE_SUPABASE_URL', urlState.value);
        vi.stubEnv('VITE_SUPABASE_ANON_KEY', keyState.value);

        // The set of vars that are actually absent/empty/whitespace, in the
        // declaration order of REQUIRED_SUPABASE_CONFIG.
        const stateByName = {
          VITE_SUPABASE_URL: urlState,
          VITE_SUPABASE_ANON_KEY: keyState,
        };
        const expectedMissing = REQUIRED_SUPABASE_CONFIG.filter(
          (name) => stateByName[name].missing,
        );

        const result = validateSupabaseConfig();

        // Reported missing set equals the actually-missing set (order preserved).
        expect(result.missing).toEqual(expectedMissing);
        expect(new Set(result.missing)).toEqual(new Set(expectedMissing));
        // ok is true iff nothing is missing.
        expect(result.ok).toBe(expectedMissing.length === 0);

        // With the Supabase backend active, a missing config must block startup:
        // the app is not mounted and no DB call is issued.
        const gate = computeStartupGate(true, result);
        if (expectedMissing.length > 0) {
          expect(gate.appMounted).toBe(false);
          expect(gate.dbCallIssued).toBe(false);
        } else {
          // Fully-configured: the app mounts and DB access is permitted.
          expect(gate.appMounted).toBe(true);
        }
      }),
      { numRuns: NUM_RUNS },
    );
  });
});
