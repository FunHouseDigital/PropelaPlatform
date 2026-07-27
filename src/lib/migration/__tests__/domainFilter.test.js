import { describe, expect, it } from 'vitest';

import { listDomainNames } from '../../dataLayer/domains';
import {
  DEPENDENT_DOMAINS,
  migrationOrder,
  parseDomainSelection,
  selectOrder,
  selectSources,
  validateDomainNames,
} from '../engine';
import { loadSeedSources } from '../loader';

/**
 * Unit tests for the MIGRATE_DOMAINS subset-selection helpers.
 *
 * These back the "start clean apart from the live nurses" cutover: an operator
 * sets MIGRATE_DOMAINS=nurses to seed ONLY the nurses domain, leaving every
 * other table empty. All logic under test is pure — no live database.
 */

describe('parseDomainSelection', () => {
  it('returns an empty array for unset/blank input (⇒ migrate all)', () => {
    expect(parseDomainSelection(undefined)).toEqual([]);
    expect(parseDomainSelection(null)).toEqual([]);
    expect(parseDomainSelection('')).toEqual([]);
    expect(parseDomainSelection('   ')).toEqual([]);
    expect(parseDomainSelection(',, ,')).toEqual([]);
  });

  it('splits on commas, trims whitespace, and drops empties', () => {
    expect(parseDomainSelection('nurses')).toEqual(['nurses']);
    expect(parseDomainSelection(' nurses , cohorts ')).toEqual([
      'nurses',
      'cohorts',
    ]);
    expect(parseDomainSelection('nurses,,placements,')).toEqual([
      'nurses',
      'placements',
    ]);
  });
});

describe('validateDomainNames', () => {
  it('accepts a known selection and returns it unchanged', () => {
    expect(validateDomainNames(['nurses'])).toEqual(['nurses']);
    expect(validateDomainNames(['nurses', 'cohorts'])).toEqual([
      'nurses',
      'cohorts',
    ]);
  });

  it('accepts an empty selection (means all domains)', () => {
    expect(validateDomainNames([])).toEqual([]);
  });

  it('rejects an unknown domain name and lists the valid names', () => {
    expect(() => validateDomainNames(['nursez'])).toThrow(/Unknown domain/);
    // The error is actionable: it names the offender AND lists a valid name.
    expect(() => validateDomainNames(['nursez'])).toThrow(/nursez/);
    expect(() => validateDomainNames(['nurses', 'bogus'])).toThrow(/bogus/);
    try {
      validateDomainNames(['bogus']);
      throw new Error('expected validateDomainNames to throw');
    } catch (err) {
      expect(err.message).toContain('nurses'); // a real registry domain
    }
  });

  it('is case-sensitive (registry keys are exact)', () => {
    expect(() => validateDomainNames(['Nurses'])).toThrow(/Unknown domain/);
  });
});

describe('selectOrder', () => {
  it('returns the full order (a copy) for an empty selection', () => {
    const full = migrationOrder();
    const result = selectOrder(full, []);
    expect(result).toEqual(full);
    expect(result).not.toBe(full); // copy, not the same reference
  });

  it('keeps only the selected domain when one name is given', () => {
    expect(selectOrder(migrationOrder(), ['nurses'])).toEqual(['nurses']);
  });

  it('preserves referential-integrity ordering for a multi-domain selection', () => {
    // placements is a dependent domain; nurses is independent. Regardless of the
    // order requested, the filtered order must keep dependents AFTER independents.
    const order = selectOrder(migrationOrder(), ['placements', 'nurses']);
    expect(order).toContain('nurses');
    expect(order).toContain('placements');
    expect(order.indexOf('nurses')).toBeLessThan(order.indexOf('placements'));
    // placements is genuinely a dependent domain in the engine.
    expect(DEPENDENT_DOMAINS).toContain('placements');
  });
});

describe('selectSources', () => {
  it('returns the full source map (a copy) for an empty selection', () => {
    const all = loadSeedSources();
    const result = selectSources(all, []);
    expect(Object.keys(result).sort()).toEqual(Object.keys(all).sort());
    expect(result).not.toBe(all);
  });

  it('selecting only nurses yields a source map containing just nurses', () => {
    const all = loadSeedSources();
    const result = selectSources(all, ['nurses']);
    expect(Object.keys(result)).toEqual(['nurses']);
    expect(result.nurses).toBe(all.nurses);
    expect(result.facilities).toBeUndefined();
    expect(result.placements).toBeUndefined();
  });

  it('omits selected names that have no source entry', () => {
    const all = loadSeedSources();
    // reportTemplates has no seed generator, so it is absent from loadSeedSources.
    expect(all.reportTemplates).toBeUndefined();
    const result = selectSources(all, ['nurses', 'reportTemplates']);
    expect(Object.keys(result)).toEqual(['nurses']);
  });
});

describe('nurses-only cutover (integration of the helpers)', () => {
  it('produces a sources map + order scoped to just the live nurses', () => {
    const selection = validateDomainNames(parseDomainSelection('nurses'));
    const sources = selectSources(loadSeedSources(), selection);
    const order = selectOrder(migrationOrder(), selection);

    expect(order).toEqual(['nurses']);
    expect(Object.keys(sources)).toEqual(['nurses']);
    // Every other domain is intentionally excluded → stays empty on cutover.
    for (const name of listDomainNames()) {
      if (name === 'nurses') continue;
      expect(order).not.toContain(name);
    }
  });
});
