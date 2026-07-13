/**
 * Shared property-based-testing (PBT) harness for the Propela Ops test suite.
 *
 * Feature: supabase-online-platform (Task 13.1, Req 6.1)
 *
 * This module centralizes the conventions the design's "Testing Strategy"
 * mandates for property-based tests so every property test in the codebase is
 * consistent and future tests are easy to write correctly:
 *
 *   1. A minimum of **100 iterations** per property (design → Testing Strategy).
 *      `NUM_RUNS` is the single source of truth for that floor; `assertProperty`
 *      / `assertAsyncProperty` apply it automatically.
 *
 *   2. A documented **property-tag convention** so each test is traceable back to
 *      the numbered property it validates in `design.md`:
 *
 *          Feature: supabase-online-platform, Property N: <name>
 *
 *      Author the tag as a leading comment on the test AND (optionally) build the
 *      exact string with {@link propertyTag} to avoid drift, e.g.:
 *
 *          // Feature: supabase-online-platform, Property 2: Concurrency ...
 *          it(propertyTag(2, 'Concurrency conflict detection'), () => { ... });
 *
 * Usage (sync):
 *
 *     import { assertProperty, fc } from '../../test/pbt';
 *     assertProperty(fc.integer(), (n) => n + 0 === n);
 *
 * Usage (multiple arbitraries):
 *
 *     assertProperty([fc.integer(), fc.string()], (n, s) => typeof s === 'string');
 *
 * Usage (async):
 *
 *     await assertAsyncProperty(fc.integer(), async (n) => { ... });
 *
 * Refactor note (Task 13.1): this harness is additive. Existing property tests
 * already pin `{ numRuns: 100 }` and their own tags; they keep working unchanged.
 * New property tests SHOULD import this helper so the 100-iteration floor and the
 * tag convention are enforced from one place.
 */

import fc from 'fast-check';

/**
 * The mandated minimum number of iterations for every property-based test in
 * this repo (design → Testing Strategy: "Minimum 100 iterations per property").
 * Callers may pass a larger `numRuns` via `opts`, but never a smaller one.
 * @type {number}
 */
export const NUM_RUNS = 100;

/** The feature these properties belong to; used to build the tag string. */
export const FEATURE_NAME = 'supabase-online-platform';

/**
 * Build the canonical property-tag string for a numbered design property:
 * `Feature: supabase-online-platform, Property N: <name>`.
 *
 * @param {number} propertyNumber The design property number (1–13).
 * @param {string} propertyName   The property's short name from design.md.
 * @returns {string} The tag string, e.g.
 *   `Feature: supabase-online-platform, Property 2: Concurrency conflict detection`.
 */
export function propertyTag(propertyNumber, propertyName) {
  return `Feature: ${FEATURE_NAME}, Property ${propertyNumber}: ${propertyName}`;
}

/** Normalize a single arbitrary or an array of arbitraries into an array. */
function toArbitraryList(arbitraries) {
  return Array.isArray(arbitraries) ? arbitraries : [arbitraries];
}

/**
 * Merge caller options with the harness defaults while guaranteeing the
 * 100-iteration floor: a caller may raise `numRuns` but never lower it below
 * {@link NUM_RUNS}.
 */
function withDefaults(opts = {}) {
  const requested = typeof opts.numRuns === 'number' ? opts.numRuns : NUM_RUNS;
  return { ...opts, numRuns: Math.max(NUM_RUNS, requested) };
}

/**
 * Assert a synchronous property holds across at least {@link NUM_RUNS} generated
 * inputs. Thin wrapper over `fc.assert(fc.property(...), { numRuns: 100 })`.
 *
 * @param {import('fast-check').Arbitrary<any> | Array<import('fast-check').Arbitrary<any>>} arbitraries
 *   One arbitrary, or an array of arbitraries passed positionally to `predicate`.
 * @param {(...values: any[]) => boolean | void} predicate
 *   The property predicate. Return `false` (or throw / use `expect`) to fail.
 * @param {import('fast-check').Parameters<any>} [opts]
 *   Optional fast-check parameters (e.g. `seed`, `examples`). `numRuns` is
 *   clamped to a minimum of {@link NUM_RUNS}.
 * @returns {void}
 */
export function assertProperty(arbitraries, predicate, opts = {}) {
  const list = toArbitraryList(arbitraries);
  return fc.assert(fc.property(...list, predicate), withDefaults(opts));
}

/**
 * Assert an asynchronous property holds across at least {@link NUM_RUNS}
 * generated inputs. Thin wrapper over
 * `fc.assert(fc.asyncProperty(...), { numRuns: 100 })`.
 *
 * @param {import('fast-check').Arbitrary<any> | Array<import('fast-check').Arbitrary<any>>} arbitraries
 *   One arbitrary, or an array of arbitraries passed positionally to `predicate`.
 * @param {(...values: any[]) => Promise<boolean | void>} predicate
 *   The async property predicate.
 * @param {import('fast-check').Parameters<any>} [opts]
 *   Optional fast-check parameters. `numRuns` is clamped to a minimum of
 *   {@link NUM_RUNS}.
 * @returns {Promise<void>}
 */
export function assertAsyncProperty(arbitraries, predicate, opts = {}) {
  const list = toArbitraryList(arbitraries);
  return fc.assert(fc.asyncProperty(...list, predicate), withDefaults(opts));
}

// Re-export fast-check so property tests can import their arbitraries and the
// harness helpers from a single module.
export { fc };

export default {
  NUM_RUNS,
  FEATURE_NAME,
  propertyTag,
  assertProperty,
  assertAsyncProperty,
  fc,
};
