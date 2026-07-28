/**
 * Deployment / smoke static checks (Task 12.3) + build-time config guard unit
 * tests (Task 12.2).
 *
 * These are the smoke checks that do NOT need a built bundle, implemented as
 * Vitest tests so they run in the existing suite with no build step:
 *   - `.env` is gitignored (Req 7.5, 10.5).
 *   - `vercel.json` has the SPA rewrite (excluding assets) + HTTPS redirect
 *     (Req 8.6, 8.7, 8.8).
 *   - RLS is enabled on every domain table and an index exists for common
 *     filter fields on each table (Req 10.3, 12.4).
 *
 * The build-output secret scan (Req 7.2, 10.6) lives in
 * scripts/smoke-checks.mjs because it needs `dist/` and is run in CI.
 */
import { readdirSync,readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  checkBuildConfig,
  findMissingConfig,
  isSupabaseRequired,
  REQUIRED_SUPABASE_CONFIG,
} from '../../../scripts/check-build-config.mjs';
import { DOMAINS } from '../dataLayer/domains.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..');

function readRepoFile(...parts) {
  return readFileSync(join(repoRoot, ...parts), 'utf8');
}

// ---------------------------------------------------------------------------
// .env gitignored (Req 7.5, 10.5)
// ---------------------------------------------------------------------------
describe('smoke: .env is gitignored', () => {
  it('lists .env in .gitignore', () => {
    const gitignore = readRepoFile('.gitignore');
    const lines = gitignore.split(/\r?\n/).map((l) => l.trim());
    expect(lines).toContain('.env');
  });
});

// ---------------------------------------------------------------------------
// vercel.json SPA rewrite + HTTPS redirect (Req 8.6, 8.7, 8.8)
// ---------------------------------------------------------------------------
describe('smoke: vercel.json shape', () => {
  const vercel = JSON.parse(readRepoFile('vercel.json'));

  it('outputs to the Vite default dist directory', () => {
    expect(vercel.outputDirectory).toBe('dist');
  });

  it('has an SPA rewrite that resolves routes to index.html', () => {
    expect(Array.isArray(vercel.rewrites)).toBe(true);
    const spa = vercel.rewrites.find((r) => r.destination === '/index.html');
    expect(spa).toBeTruthy();
  });

  it('excludes static assets from the SPA rewrite', () => {
    const spa = vercel.rewrites.find((r) => r.destination === '/index.html');
    // Negative lookahead on assets/ means /assets/* is NOT rewritten to index.html.
    expect(spa.source).toMatch(/assets\//);
    expect(spa.source).toContain('?!');
  });

  it('has an HTTP->HTTPS redirect keyed on x-forwarded-proto', () => {
    expect(Array.isArray(vercel.redirects)).toBe(true);
    const httpsRedirect = vercel.redirects.find(
      (r) =>
        Array.isArray(r.has) &&
        r.has.some(
          (h) =>
            h.type === 'header' &&
            h.key === 'x-forwarded-proto' &&
            h.value === 'http',
        ),
    );
    expect(httpsRedirect).toBeTruthy();
    expect(httpsRedirect.destination).toMatch(/^https:\/\//);
  });

  it('runs the config-guarded build command', () => {
    // buildCommand must run the guard: either directly (`check-build-config`)
    // or via the `build:vercel` npm script which chains the guard before vite.
    const pkg = JSON.parse(readRepoFile('package.json'));
    const cmd = vercel.buildCommand;
    const referencesGuardScript = /build:vercel/.test(cmd);
    const runsGuardDirectly = /check-build-config/.test(cmd);
    expect(referencesGuardScript || runsGuardDirectly).toBe(true);
    if (referencesGuardScript) {
      expect(pkg.scripts['build:vercel']).toContain('check-build-config');
    }
  });
});

// ---------------------------------------------------------------------------
// CI production-like Supabase build (production readiness)
// ---------------------------------------------------------------------------
describe('smoke: CI production-like build', () => {
  const ci = readRepoFile('.github', 'workflows', 'ci.yml');
  const buildJob = ci.slice(ci.indexOf('  build:'));

  it('uses explicit dummy public Supabase config with the backend enabled', () => {
    expect(buildJob).toContain("REQUIRE_SUPABASE: '1'");
    expect(buildJob).toContain('VITE_FEATURE_FLAGS: SUPABASE_BACKEND');
    expect(buildJob).toContain(
      'VITE_SUPABASE_URL: https://ci-placeholder.supabase.co',
    );
    expect(buildJob).toContain(
      'VITE_SUPABASE_ANON_KEY: ci-public-anon-key-placeholder',
    );
    expect(buildJob).not.toMatch(/service[_-]?role/i);
    expect(buildJob).not.toMatch(/password/i);
  });

  it('builds, smoke-checks, then uploads dist in that order', () => {
    const buildIndex = buildJob.indexOf('run: npm run build:vercel');
    const smokeIndex = buildJob.indexOf('run: npm run smoke');
    const uploadIndex = buildJob.indexOf('uses: actions/upload-artifact@v4');
    expect(buildIndex).toBeGreaterThan(-1);
    expect(smokeIndex).toBeGreaterThan(buildIndex);
    expect(uploadIndex).toBeGreaterThan(smokeIndex);
    expect(buildJob).toContain('path: dist/');
  });

  it('keeps the migration bundle check in the test job', () => {
    const testJob = ci.slice(ci.indexOf('  test:'), ci.indexOf('  build:'));
    expect(testJob).toContain('run: npx vitest run');
    expect(testJob).toContain('run: npm run check:migrations');
  });
});

// ---------------------------------------------------------------------------
// RLS enabled + indexes on every domain table (Req 10.3, 12.4)
// ---------------------------------------------------------------------------
describe('smoke: migrations enable RLS and index every domain table', () => {
  const migrationsDir = join(repoRoot, 'supabase', 'migrations');
  const sql = readdirSync(migrationsDir)
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => readFileSync(join(migrationsDir, f), 'utf8'))
    .join('\n');

  const domains = Object.values(DOMAINS);
  const tables = domains.map((d) => d.table);

  /**
   * Extract the SQL region for a table: from its `CREATE TABLE` up to the next
   * `CREATE TABLE` (or end). This captures the table body plus any trailing
   * `CREATE INDEX` lines that immediately follow it, so index/constraint checks
   * are scoped to the right table.
   */
  function tableRegion(table) {
    const startRe = new RegExp(
      `create\\s+table\\s+(if\\s+not\\s+exists\\s+)?${table}\\b`,
      'i',
    );
    const start = sql.search(startRe);
    if (start === -1) return '';
    const rest = sql.slice(start + 1);
    const nextRe = /create\s+table\s+/i;
    const nextIdx = rest.search(nextRe);
    return nextIdx === -1 ? sql.slice(start) : sql.slice(start, start + 1 + nextIdx);
  }

  it.each(tables)('enables RLS on %s', (table) => {
    const explicitRls = new RegExp(
      `alter\\s+table\\s+${table}\\s+enable\\s+row\\s+level\\s+security`,
      'i',
    ).test(sql);
    // RLS may also be enabled via a DO-block loop over a table-name array.
    const loopedRls = new RegExp(`'${table}'`).test(sql);
    expect(explicitRls || loopedRls).toBe(true);
  });

  it.each(domains)(
    'indexes common filter fields on $table',
    (domain) => {
      const region = tableRegion(domain.table);
      expect(region).not.toBe('');

      const hasCreateIndex = new RegExp(
        `create\\s+index\\s+(if\\s+not\\s+exists\\s+)?[\\w]+\\s+on\\s+${domain.table}\\b`,
        'i',
      ).test(region);
      const hasUniqueOwner = /unique\s*\(\s*owner_id\s*\)/i.test(region);
      const isGlobalSingleton = domain.kind === 'singleton' && !domain.perUser;

      if (isGlobalSingleton) {
        // Single global row: the primary key is the access path; no separate
        // filter-field index is required.
        expect(/primary\s+key/i.test(region)).toBe(true);
      } else {
        // Collections and per-user singletons must have a real filter-field
        // index (a CREATE INDEX on owner_id/typed columns, or UNIQUE(owner_id)).
        expect(hasCreateIndex || hasUniqueOwner).toBe(true);
      }
    },
  );
});

// ---------------------------------------------------------------------------
// Build-time required-config guard (Task 12.2, Req 7.3, 8.10)
// ---------------------------------------------------------------------------
describe('build-time config guard', () => {
  const VALID = {
    VITE_SUPABASE_URL: 'https://example.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'anon-key-123',
  };

  it('requires exactly the two public Supabase vars', () => {
    expect(REQUIRED_SUPABASE_CONFIG).toEqual([
      'VITE_SUPABASE_URL',
      'VITE_SUPABASE_ANON_KEY',
    ]);
  });

  it('never references server-only secrets', () => {
    const joined = REQUIRED_SUPABASE_CONFIG.join(' ');
    expect(joined).not.toMatch(/service_role/i);
    expect(joined).not.toMatch(/password/i);
  });

  describe('is a NO-OP for the legacy-path default build', () => {
    it('is not enforced when no backend signal is present, even with no config', () => {
      const result = checkBuildConfig({});
      expect(result.enforced).toBe(false);
      expect(result.ok).toBe(true);
      expect(result.missing).toEqual([]);
    });

    it('does not enforce when unrelated flags are set', () => {
      const result = checkBuildConfig({ VITE_FEATURE_FLAGS: 'DARK_MODE,AI_SUGGESTIONS' });
      expect(result.enforced).toBe(false);
      expect(result.ok).toBe(true);
    });
  });

  describe('enforces when the Supabase backend is intended', () => {
    it('enforces when REQUIRE_SUPABASE=1', () => {
      expect(isSupabaseRequired({ REQUIRE_SUPABASE: '1' }).required).toBe(true);
    });

    it('enforces when VITE_FEATURE_FLAGS includes SUPABASE_BACKEND', () => {
      const env = { VITE_FEATURE_FLAGS: 'DARK_MODE, SUPABASE_BACKEND ' };
      expect(isSupabaseRequired(env).required).toBe(true);
    });

    it('enforces when VERCEL_ENV=production', () => {
      expect(isSupabaseRequired({ VERCEL_ENV: 'production' }).required).toBe(true);
    });

    it('fails with the missing vars listed when config is absent', () => {
      const result = checkBuildConfig({ REQUIRE_SUPABASE: '1' });
      expect(result.enforced).toBe(true);
      expect(result.ok).toBe(false);
      expect(result.missing).toEqual([
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY',
      ]);
    });

    it('reports only the missing var when one is present', () => {
      const result = checkBuildConfig({
        REQUIRE_SUPABASE: '1',
        VITE_SUPABASE_URL: 'https://example.supabase.co',
      });
      expect(result.ok).toBe(false);
      expect(result.missing).toEqual(['VITE_SUPABASE_ANON_KEY']);
    });

    it('treats whitespace-only values as missing', () => {
      const result = checkBuildConfig({
        REQUIRE_SUPABASE: '1',
        VITE_SUPABASE_URL: '   ',
        VITE_SUPABASE_ANON_KEY: '\t',
      });
      expect(result.ok).toBe(false);
      expect(result.missing).toEqual([
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY',
      ]);
    });

    it('passes when the backend is intended and config is present', () => {
      const result = checkBuildConfig({ REQUIRE_SUPABASE: '1', ...VALID });
      expect(result.enforced).toBe(true);
      expect(result.ok).toBe(true);
      expect(result.missing).toEqual([]);
    });
  });

  describe('findMissingConfig', () => {
    it('returns empty when all present', () => {
      expect(findMissingConfig(VALID)).toEqual([]);
    });

    it('returns all names when none present', () => {
      expect(findMissingConfig({})).toEqual([
        'VITE_SUPABASE_URL',
        'VITE_SUPABASE_ANON_KEY',
      ]);
    });
  });
});
