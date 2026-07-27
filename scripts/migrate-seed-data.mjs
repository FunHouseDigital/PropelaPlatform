#!/usr/bin/env node
/**
 * Seed-data migration entrypoint (Task 11).
 *
 * Server/CI-only Node ESM script that loads the application's seed generators,
 * transforms each record into a database row (preserving ids), and idempotently
 * upserts them into Supabase in referential-integrity order. All transform,
 * ordering, atomic-set, counting, and reporting logic lives in the pure modules
 * under `src/lib/migration/*` (which are unit/property tested without a DB);
 * this file only wires environment configuration + a service-role client to that
 * logic.
 *
 * SECURITY (Req 7.2, 10.6):
 *   - Reads `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` from process.env only.
 *     These are NOT `VITE_`-prefixed, so they are never inlined into the frontend
 *     bundle. This module imports `@supabase/supabase-js` and must only ever run
 *     from a trusted CI/local environment — never shipped to the browser.
 *   - No secret is ever hardcoded; the script fails fast with a clear message
 *     when a required variable is missing.
 *
 * USAGE:
 *   # Migrate ALL domains (default, unchanged behavior):
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-seed-data.mjs
 *
 *   # Migrate ONLY a subset of domains (e.g. a "start clean apart from the live
 *   # nurses" cutover). MIGRATE_DOMAINS is a comma-separated list of
 *   # case-sensitive registry domain names:
 *   MIGRATE_DOMAINS=nurses \
 *   SUPABASE_URL=... SUPABASE_SERVICE_ROLE_KEY=... node scripts/migrate-seed-data.mjs
 *
 * ENVIRONMENT:
 *   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY  required, server-only (see SECURITY).
 *   MIGRATE_DOMAINS                          optional. When set and non-empty,
 *     ONLY the listed domains are migrated (referential-integrity ordering is
 *     preserved, filtered to the selection). Each name must be a valid registry
 *     domain; an unknown name aborts (exit 1) BEFORE the database is contacted.
 *     When unset/empty, ALL domains are migrated (default).
 *
 * EXIT CODES:
 *   0  migration succeeded (every domain loaded == source)
 *   1  configuration missing, an unknown MIGRATE_DOMAINS name, an unexpected
 *      error, or migration marked FAILED (any per-domain count mismatch — Req 5.7)
 */

import process from 'node:process';
import { pathToFileURL } from 'node:url';

import { createClient } from '@supabase/supabase-js';

import { loadSeedSources } from '../src/lib/migration/loader.js';
import {
  formatReport,
  migrationOrder,
  parseDomainSelection,
  runMigration,
  selectOrder,
  selectSources,
  validateDomainNames,
} from '../src/lib/migration/engine.js';

/**
 * Read and validate the required server-only environment variables. Fails fast
 * (exit 1) with an explicit message naming each missing variable.
 * @returns {{ url: string, serviceRoleKey: string }}
 */
function readConfig() {
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  const missing = [];
  if (!url) missing.push('SUPABASE_URL');
  if (!serviceRoleKey) missing.push('SUPABASE_SERVICE_ROLE_KEY');

  if (missing.length > 0) {
    console.error(
      'Migration aborted: missing required environment variable(s): ' +
        missing.join(', ') +
        '.\nSet them in your CI/local shell (never commit secrets). ' +
        'These are server-only and must not be VITE_-prefixed.',
    );
    process.exit(1);
  }

  return { url, serviceRoleKey };
}

/**
 * Wrap the real service-role client so upsert errors carry the offending record
 * id under `details` (matching the shape the engine + fakes expect for failing
 * record reporting, Req 5.5). supabase-js already returns `{ data, error }` from
 * an awaited builder, so we only normalize the error's `details` field.
 */
function createMigrationClient(url, serviceRoleKey) {
  const supabase = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return supabase;
}

/**
 * Resolve the optional `MIGRATE_DOMAINS` selection. Parses the env var, then
 * validates every requested name against the domain registry. On an unknown
 * name it prints a clear error listing all valid domain names and exits 1
 * BEFORE any database client is created/contacted.
 *
 * @returns {string[]} validated selection ([] ⇒ migrate all domains).
 */
function readDomainSelection() {
  const selection = parseDomainSelection(process.env.MIGRATE_DOMAINS);
  try {
    validateDomainNames(selection);
  } catch (err) {
    console.error('Migration aborted: ' + err.message);
    process.exit(1);
  }
  return selection;
}

async function main() {
  // Resolve + validate the domain selection first, so an invalid MIGRATE_DOMAINS
  // fails fast BEFORE we construct a service-role client or touch the database.
  const selection = readDomainSelection();

  const { url, serviceRoleKey } = readConfig();
  const client = createMigrationClient(url, serviceRoleKey);

  const sources = selectSources(loadSeedSources(), selection);
  const order = selectOrder(migrationOrder(), selection);

  if (selection.length > 0) {
    console.log(
      `MIGRATE_DOMAINS set — migrating ONLY these ${order.length} domain(s): ` +
        order.join(', '),
    );
  } else {
    console.log(
      `MIGRATE_DOMAINS unset — migrating ALL ${order.length} domains.`,
    );
  }

  const report = await runMigration({ client, sources, order });

  console.log(formatReport(report));

  // Req 5.7: a count mismatch in any domain marks the whole migration FAILED.
  process.exit(report.failed ? 1 : 0);
}

// Only execute when run directly (allows importing helpers without side effects).
const invokedDirectly =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (invokedDirectly) {
  main().catch((err) => {
    console.error('Migration failed with an unexpected error:', err);
    process.exit(1);
  });
}

export { main, readConfig };
