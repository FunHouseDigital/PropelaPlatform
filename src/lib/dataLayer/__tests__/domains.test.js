import { describe, expect, it } from 'vitest';

import * as storage from '../../storage';
import {
  DEFAULT_PAGE_SIZE,
  DOMAINS,
  getDomain,
  listDomainNames,
  listDomains,
} from '../domains';

/**
 * Task 2.1 — Data_Layer domain registry.
 *
 * Asserts the registry covers every Data_Domain served by storage.js, that each
 * entry is well-formed, table names are unique snake_case, the default page size
 * is 25, and adminOnly/perUser flags are set where the design requires them.
 * (Req 5.1, 6.1)
 */

// Every domain that must have a registry entry, grouped by kind.
const EXPECTED_COLLECTIONS = [
  'nurses',
  'facilities',
  'cohorts',
  'referrers',
  'communityChannels',
  'events',
  'outreachTemplates',
  'placements',
  'reportTemplates',
  'documents',
  'documentTemplates',
  'verificationQueue',
  'communications',
  'notifications',
  'commEmailTemplates',
  'alertRules',
  'alertHistory',
  'scheduledReports',
  'exportHistory',
  'dashboardLayouts',
  'integrations',
  'apiEndpoints',
  'apiKeys',
  'webhooks',
  'webhookDeliveryLog',
  'activityFeed',
  'auditLog',
  'userSessions',
  'changeHistory',
  'recentSearches',
  'savedViews',
  'recentlyViewed',
  'automationRules',
  'automationTemplates',
  'executionLog',
  'scheduledActions',
  'notificationAlerts',
  'notificationLog',
  'helpArticles',
  'onboardingSteps',
  'featureTours',
];

const EXPECTED_SINGLETONS = [
  'settings',
  'notificationPreferences',
  'activeDashboardLayout',
  'syncStatus',
  'notifAlertConfig',
  'toastPreferences',
  'onboardingState',
  'tourState',
  'articleVotes',
];

// Domains flagged in the design/task inventory.
const ADMIN_ONLY = [
  'integrations',
  'apiEndpoints',
  'apiKeys',
  'webhooks',
  'webhookDeliveryLog',
  'syncStatus',
  'settings',
];

const PER_USER = [
  'recentSearches',
  'savedViews',
  'recentlyViewed',
  'notificationPreferences',
  'activeDashboardLayout',
  'toastPreferences',
  'onboardingState',
  'tourState',
  'articleVotes',
];

// onboardingSteps/featureTours are seeded via seedHelp() and have no dedicated
// storage.js getter/saver today, so their legacy accessors are null.
const NO_LEGACY_ACCESSOR = ['onboardingSteps', 'featureTours'];

const SNAKE_CASE = /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/;

describe('dataLayer/domains registry', () => {
  it('has a registry entry for every expected collection and singleton domain', () => {
    for (const name of [...EXPECTED_COLLECTIONS, ...EXPECTED_SINGLETONS]) {
      expect(DOMAINS[name], `missing registry entry for "${name}"`).toBeDefined();
    }
  });

  it('lists exactly the expected domains (no extras, no omissions)', () => {
    const expected = [...EXPECTED_COLLECTIONS, ...EXPECTED_SINGLETONS].sort();
    expect(listDomainNames().slice().sort()).toEqual(expected);
  });

  it('marks collections and singletons with the correct kind', () => {
    for (const name of EXPECTED_COLLECTIONS) {
      expect(DOMAINS[name].kind, `${name} should be a collection`).toBe('collection');
    }
    for (const name of EXPECTED_SINGLETONS) {
      expect(DOMAINS[name].kind, `${name} should be a singleton`).toBe('singleton');
    }
  });

  it('gives every entry the required fields with valid types', () => {
    for (const domain of listDomains()) {
      expect(typeof domain.name).toBe('string');
      expect(typeof domain.key).toBe('string');
      expect(typeof domain.table).toBe('string');
      expect(domain.primaryKey).toBe('id');
      expect(['collection', 'singleton']).toContain(domain.kind);
      expect(Array.isArray(domain.typedColumns)).toBe(true);
      expect(Array.isArray(domain.jsonbColumns)).toBe(true);
      expect(typeof domain.adminOnly).toBe('boolean');
      expect(typeof domain.perUser).toBe('boolean');
      expect(domain.defaultListConfig).toBeTypeOf('object');
      // legacy accessors are either a string function name or null.
      expect(['string', 'object']).toContain(typeof domain.legacyGetter);
      expect(['string', 'object']).toContain(typeof domain.legacySaver);
    }
  });

  it('keys each entry by its own name', () => {
    for (const [key, domain] of Object.entries(DOMAINS)) {
      expect(domain.name).toBe(key);
    }
  });

  it('uses unique, snake_case table names', () => {
    const tables = listDomains().map((d) => d.table);
    // Uniqueness.
    expect(new Set(tables).size).toBe(tables.length);
    // snake_case.
    for (const table of tables) {
      expect(table, `table "${table}" is not snake_case`).toMatch(SNAKE_CASE);
    }
  });

  it('defaults the list page size to 25 for every domain', () => {
    expect(DEFAULT_PAGE_SIZE).toBe(25);
    for (const domain of listDomains()) {
      expect(domain.defaultListConfig.pageSize).toBe(25);
    }
  });

  it('sets adminOnly only on admin-restricted domains', () => {
    for (const domain of listDomains()) {
      const shouldBeAdmin = ADMIN_ONLY.includes(domain.name);
      expect(domain.adminOnly, `${domain.name} adminOnly mismatch`).toBe(shouldBeAdmin);
    }
  });

  it('sets perUser only on per-user domains', () => {
    for (const domain of listDomains()) {
      const shouldBePerUser = PER_USER.includes(domain.name);
      expect(domain.perUser, `${domain.name} perUser mismatch`).toBe(shouldBePerUser);
    }
  });

  it('references real storage.js getter/saver functions where defined', () => {
    for (const domain of listDomains()) {
      if (NO_LEGACY_ACCESSOR.includes(domain.name)) {
        expect(domain.legacyGetter).toBeNull();
        expect(domain.legacySaver).toBeNull();
        continue;
      }
      expect(typeof storage[domain.legacyGetter], `${domain.legacyGetter} not exported by storage.js`).toBe(
        'function',
      );
      expect(typeof storage[domain.legacySaver], `${domain.legacySaver} not exported by storage.js`).toBe(
        'function',
      );
    }
  });

  it('carries a valid sort config when one is provided', () => {
    for (const domain of listDomains()) {
      const { sort } = domain.defaultListConfig;
      if (sort) {
        expect(typeof sort.column).toBe('string');
        expect(sort.column.length).toBeGreaterThan(0);
        expect(typeof sort.asc).toBe('boolean');
      }
    }
  });

  describe('helpers', () => {
    it('getDomain returns the config by name and undefined for unknown', () => {
      expect(getDomain('nurses')).toBe(DOMAINS.nurses);
      expect(getDomain('does-not-exist')).toBeUndefined();
    });

    it('listDomainNames and listDomains agree in length and order', () => {
      const names = listDomainNames();
      const domains = listDomains();
      expect(names.length).toBe(domains.length);
      names.forEach((name, i) => expect(domains[i].name).toBe(name));
    });
  });
});
