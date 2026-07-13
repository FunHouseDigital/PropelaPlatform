import { describe, expect, it, vi } from 'vitest';

import {
  assertAsyncProperty,
  assertProperty,
  fc,
  FEATURE_NAME,
  NUM_RUNS,
  propertyTag,
} from './pbt';

/**
 * Tests for the shared PBT harness (Task 13.1). These verify the harness's
 * contract — the 100-iteration floor, the tag convention, and single/multiple/
 * async arbitrary support — so future property tests can rely on it.
 */

describe('PBT harness (src/test/pbt.js)', () => {
  it('pins the mandated minimum iteration count at 100', () => {
    expect(NUM_RUNS).toBe(100);
    expect(FEATURE_NAME).toBe('supabase-online-platform');
  });

  it('builds the canonical property tag string', () => {
    expect(propertyTag(2, 'Concurrency conflict detection')).toBe(
      'Feature: supabase-online-platform, Property 2: Concurrency conflict detection',
    );
  });

  it('runs at least NUM_RUNS iterations for a single arbitrary', () => {
    const predicate = vi.fn(() => true);
    assertProperty(fc.integer(), predicate);
    expect(predicate.mock.calls.length).toBeGreaterThanOrEqual(NUM_RUNS);
  });

  it('clamps a smaller requested numRuns up to the NUM_RUNS floor', () => {
    const predicate = vi.fn(() => true);
    assertProperty(fc.integer(), predicate, { numRuns: 5 });
    expect(predicate.mock.calls.length).toBeGreaterThanOrEqual(NUM_RUNS);
  });

  it('honors a larger requested numRuns', () => {
    const predicate = vi.fn(() => true);
    assertProperty(fc.integer(), predicate, { numRuns: 250 });
    expect(predicate.mock.calls.length).toBeGreaterThanOrEqual(250);
  });

  it('passes multiple arbitraries positionally to the predicate', () => {
    assertProperty([fc.integer(), fc.string()], (n, s) => {
      expect(typeof n).toBe('number');
      expect(typeof s).toBe('string');
    });
  });

  it('supports async properties', async () => {
    const predicate = vi.fn(async () => true);
    await assertAsyncProperty(fc.integer(), predicate);
    expect(predicate.mock.calls.length).toBeGreaterThanOrEqual(NUM_RUNS);
  });

  it('propagates property failures (a false predicate throws)', () => {
    expect(() => assertProperty(fc.integer({ min: 1 }), (n) => n < 0)).toThrow();
  });
});
