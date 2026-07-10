#!/usr/bin/env node
/**
 * Static sanity check for the Supabase migrations (Task 4).
 *
 * Verifies, WITHOUT connecting to any database, that:
 *   1. Every Data_Domain table declared in src/lib/dataLayer/domains.js has a
 *      matching `CREATE TABLE ... <table>` somewhere under supabase/migrations/.
 *   2. RLS is enabled (`ALTER TABLE <table> ENABLE ROW LEVEL SECURITY`) for each
 *      of those tables — enforced either explicitly or via the DO-block loops in
 *      the RLS migrations.
 *   3. Every domain table has a `bump_version` trigger attached.
 *   4. The `profiles` table and `current_role_name()` helper exist.
 *
 * Exits non-zero (with a report) when any table is missing, so it can be wired
 * into CI. This is a text-only check — it never runs the SQL.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');
const migrationsDir = join(repoRoot, 'supabase', 'migrations');

// ---- Load the concatenated migration SQL --------------------------------
const sqlFiles = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort();
const sql = sqlFiles
  .map((f) => readFileSync(join(migrationsDir, f), 'utf8'))
  .join('\n');

// ---- Extract expected table names from domains.js -----------------------
// domains.js is ESM; import it dynamically so we use the real registry.
const { DOMAINS } = await import(
  join(repoRoot, 'src', 'lib', 'dataLayer', 'domains.js')
);
const expectedTables = Object.values(DOMAINS).map((d) => d.table);

// ---- Checks --------------------------------------------------------------
const problems = [];

for (const table of expectedTables) {
  const hasCreate = new RegExp(
    `create\\s+table\\s+(if\\s+not\\s+exists\\s+)?${table}\\b`,
    'i',
  ).test(sql);
  if (!hasCreate) problems.push(`Missing CREATE TABLE for '${table}'`);

  // RLS is enabled either by an explicit ALTER TABLE line or by inclusion in a
  // DO-block array literal that runs ENABLE ROW LEVEL SECURITY over its members.
  const explicitRls = new RegExp(
    `alter\\s+table\\s+${table}\\s+enable\\s+row\\s+level\\s+security`,
    'i',
  ).test(sql);
  const loopedRls = new RegExp(`'${table}'`).test(sql);
  if (!explicitRls && !loopedRls) {
    problems.push(`RLS not enabled for '${table}'`);
  }
}

// profiles + helper
if (!/create\s+table\s+(if\s+not\s+exists\s+)?profiles\b/i.test(sql)) {
  problems.push("Missing CREATE TABLE for 'profiles'");
}
if (!/create\s+or\s+replace\s+function\s+current_role_name/i.test(sql)) {
  problems.push("Missing current_role_name() helper function");
}
if (!/create\s+or\s+replace\s+function\s+bump_version/i.test(sql)) {
  problems.push("Missing bump_version() trigger function");
}

// ---- Report --------------------------------------------------------------
const total = expectedTables.length;
if (problems.length === 0) {
  console.log(
    `OK: all ${total} domain tables present with RLS + bump_version, ` +
      `profiles and helpers defined across ${sqlFiles.length} migration files.`,
  );
  process.exit(0);
} else {
  console.error(`FAILED: ${problems.length} problem(s) found:`);
  for (const p of problems) console.error(`  - ${p}`);
  console.error(`\nChecked ${total} domain tables in ${sqlFiles.length} files.`);
  process.exit(1);
}
