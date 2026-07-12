import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { listDomains } from '../domains';

/**
 * Static RLS policy-coverage tests (Task 13.2).
 *
 * Requirements: 4.2, 4.3, 4.4, 4.6, 4.7, 10.4
 *
 * These tests run ALWAYS in the default `vitest run` — they never connect to a
 * database. They statically scan the version-controlled SQL under
 * `supabase/migrations/*.sql` and assert, against the domain registry
 * (`domains.js`), that the row-level-security policy shape matches each domain's
 * declared access model:
 *
 *   - RLS is enabled on EVERY domain table (Req 10.3, 10.4 deny-by-default).
 *   - `adminOnly` tables have ONLY an Admin policy — no `recruiter_ops` and not
 *     grouped with operational/per-user tables (Req 4.3).
 *   - `perUser` tables have an owner-scoped `owner_id = auth.uid()` policy
 *     (Req 4.2, 4.4).
 *   - operational tables have BOTH an Admin policy and a Recruiter policy
 *     (Req 4.2, 4.4).
 *
 * The live role-matrix / deny-by-default behavior against a real Postgres is
 * covered by the companion `rlsPolicy.live.test.js`, which is skipped unless the
 * SUPABASE_TEST_* env vars are present. This static suite gives real,
 * always-on coverage in CI and locally while the live suite runs against a
 * provisioned Supabase.
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
// __tests__ -> dataLayer -> lib -> src -> repo root
const repoRoot = join(__dirname, '..', '..', '..', '..');
const migrationsDir = join(repoRoot, 'supabase', 'migrations');

/** Concatenate every migration SQL file (sorted) into one lowercased blob. */
function loadMigrationSql() {
  const files = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  const raw = files
    .map((f) => readFileSync(join(migrationsDir, f), 'utf8'))
    .join('\n');
  return { raw, lower: raw.toLowerCase(), files };
}

/**
 * Extract the quoted string members of a `<varName> text[] := ARRAY[ ... ]`
 * declaration from the (raw) SQL. Returns a Set of table names.
 */
function extractArrayLiteral(rawSql, varName) {
  const re = new RegExp(`${varName}\\s+text\\[\\]\\s*:=\\s*array\\[([\\s\\S]*?)\\]`, 'i');
  const match = rawSql.match(re);
  if (!match) return new Set();
  const members = match[1].match(/'([^']+)'/g) || [];
  return new Set(members.map((m) => m.replace(/'/g, '')));
}

const { raw, lower } = loadMigrationSql();

const adminOnlySet = extractArrayLiteral(raw, 'admin_only_tables');
const perUserSet = extractArrayLiteral(raw, 'per_user_tables');
const operationalSet = extractArrayLiteral(raw, 'operational_tables');

/** True when `CREATE POLICY <policy> ON <table>` appears explicitly. */
function hasExplicitPolicy(policy, table) {
  return new RegExp(`create\\s+policy\\s+${policy}\\s+on\\s+${table}\\b`, 'i').test(lower);
}

/** True when RLS is explicitly enabled for a table via ALTER TABLE. */
function hasExplicitRls(table) {
  return new RegExp(
    `alter\\s+table\\s+${table}\\s+enable\\s+row\\s+level\\s+security`,
    'i',
  ).test(lower);
}

const domains = listDomains();

describe('RLS policy coverage (static, always runs)', () => {
  it('parsed the admin-only / per-user / operational table groups from the RLS migration', () => {
    // Sanity: the DO-block arrays were found and are non-empty.
    expect(adminOnlySet.size).toBeGreaterThan(0);
    expect(perUserSet.size).toBeGreaterThan(0);
    expect(operationalSet.size).toBeGreaterThan(0);
  });

  it('defines the per-user owner policy as owner_id = auth.uid() (Req 4.2)', () => {
    expect(/owner_id\s*=\s*auth\.uid\(\)/i.test(lower)).toBe(true);
  });

  it('enables RLS on every domain table (Req 10.3, 10.4)', () => {
    for (const domain of domains) {
      const { table } = domain;
      const enabled =
        hasExplicitRls(table) ||
        adminOnlySet.has(table) ||
        perUserSet.has(table) ||
        operationalSet.has(table);
      expect(enabled, `RLS should be enabled for '${table}'`).toBe(true);
    }
  });

  describe('policy shape matches each domain access model', () => {
    for (const domain of domains) {
      const { name, table, adminOnly, perUser } = domain;

      if (adminOnly) {
        it(`'${name}' (${table}) is Admin-only — no Recruiter policy (Req 4.3)`, () => {
          // Grouped under the admin-only loop (or has an explicit admin_only policy).
          const isAdminOnly = adminOnlySet.has(table) || hasExplicitPolicy('admin_only', table);
          expect(isAdminOnly, `'${table}' should be in the admin-only group`).toBe(true);
          // Must NOT be granted to Recruiters or grouped as operational/per-user.
          expect(operationalSet.has(table), `'${table}' must not be operational`).toBe(false);
          expect(perUserSet.has(table), `'${table}' must not be per-user`).toBe(false);
          expect(
            hasExplicitPolicy('recruiter_ops', table),
            `'${table}' must not have a recruiter_ops policy`,
          ).toBe(false);
        });
      } else if (perUser) {
        it(`'${name}' (${table}) is per-user, owner-scoped (Req 4.2, 4.4)`, () => {
          expect(perUserSet.has(table), `'${table}' should be in the per-user group`).toBe(true);
          // Per-user domains are not admin-only nor plain operational.
          expect(adminOnlySet.has(table), `'${table}' must not be admin-only`).toBe(false);
          expect(operationalSet.has(table), `'${table}' must not be operational`).toBe(false);
        });
      } else {
        it(`'${name}' (${table}) is operational — Admin + Recruiter policies (Req 4.2, 4.4)`, () => {
          const hasAdmin = hasExplicitPolicy('admin_all', table) || operationalSet.has(table);
          const hasRecruiter =
            hasExplicitPolicy('recruiter_ops', table) || operationalSet.has(table);
          expect(hasAdmin, `'${table}' should grant Admin access`).toBe(true);
          expect(hasRecruiter, `'${table}' should grant Recruiter access`).toBe(true);
          // Operational tables are not restricted to admin-only.
          expect(adminOnlySet.has(table), `'${table}' must not be admin-only`).toBe(false);
        });
      }
    }
  });

  it('creates both admin_all and recruiter_ops policies for the operational group (Req 4.2, 4.4)', () => {
    expect(/create\s+policy\s+admin_all\s+on/i.test(lower)).toBe(true);
    expect(/create\s+policy\s+recruiter_ops\s+on/i.test(lower)).toBe(true);
  });
});
