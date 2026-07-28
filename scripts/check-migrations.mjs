/**
 * Static sanity check for the Supabase migrations (Task 4).
 *
 * This is a text-only check. It never runs SQL or connects to a database.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..');

const SECTION_PATTERN =
  /-- >>> BEGIN migrations\/([^\r\n>]+) >>>\r?\n\r?\n([\s\S]*?)\r?\n\r?\n-- <<< END migrations\/([^\r\n<]+) <<</g;

export const normalizeSql = (value) => value.replace(/\r\n?/g, '\n').trimEnd();

/**
 * Returns true when text outside a migration section contains anything other
 * than whitespace or SQL comments. Unterminated block comments are rejected.
 */
export function hasExecutableSql(value) {
  let index = 0;
  while (index < value.length) {
    if (/\s/.test(value[index])) {
      index += 1;
      continue;
    }

    if (value.startsWith('--', index)) {
      const lineEnd = value.indexOf('\n', index + 2);
      index = lineEnd === -1 ? value.length : lineEnd + 1;
      continue;
    }

    if (value.startsWith('/*', index)) {
      let depth = 1;
      index += 2;
      while (index < value.length && depth > 0) {
        if (value.startsWith('/*', index)) {
          depth += 1;
          index += 2;
        } else if (value.startsWith('*/', index)) {
          depth -= 1;
          index += 2;
        } else {
          index += 1;
        }
      }
      if (depth !== 0) return true;
      continue;
    }

    return true;
  }

  return false;
}

/**
 * Validate that a bundle is only a comment/whitespace preamble followed by an
 * exact, ordered mirror of every numbered migration. No executable SQL may
 * appear before, between, or after the delimited sections.
 */
export function validateMigrationBundle(bundle, migrationSources) {
  const problems = [];
  const sqlFiles = migrationSources.map(({ file }) => file);
  const matches = [...bundle.matchAll(SECTION_PATTERN)];
  const sections = matches.map((match) => ({
    beginFile: match[1],
    content: match[2],
    endFile: match[3],
  }));
  const beginMarkerCount = (bundle.match(/-- >>> BEGIN migrations\//g) || []).length;
  const endMarkerCount = (bundle.match(/-- <<< END migrations\//g) || []).length;

  if (
    sections.length !== sqlFiles.length ||
    beginMarkerCount !== sqlFiles.length ||
    endMarkerCount !== sqlFiles.length
  ) {
    problems.push(
      `Migration bundle has ${sections.length} complete section(s), ` +
        `${beginMarkerCount} begin marker(s), and ${endMarkerCount} end marker(s); ` +
        `expected ${sqlFiles.length} of each`,
    );
  }

  let cursor = 0;
  for (const match of matches) {
    if (hasExecutableSql(bundle.slice(cursor, match.index))) {
      problems.push('Migration bundle contains executable SQL outside migration sections');
      break;
    }
    cursor = match.index + match[0].length;
  }
  if (
    !problems.includes('Migration bundle contains executable SQL outside migration sections') &&
    hasExecutableSql(bundle.slice(cursor))
  ) {
    problems.push('Migration bundle contains executable SQL outside migration sections');
  }

  for (const [index, source] of migrationSources.entries()) {
    const section = sections[index];
    if (!section) continue;
    if (section.beginFile !== source.file || section.endFile !== source.file) {
      problems.push(
        `Migration bundle section ${index + 1} must be '${source.file}' ` +
          `but markers are '${section.beginFile}'/'${section.endFile}'`,
      );
      continue;
    }
    if (normalizeSql(section.content) !== normalizeSql(source.content)) {
      problems.push(`Migration bundle content differs from '${source.file}'`);
    }
  }

  return problems;
}

export async function checkMigrations({ root = repoRoot } = {}) {
  const rootMigrationsDir = join(root, 'supabase', 'migrations');
  const rootBundlePath = join(root, 'supabase', 'bundled_migration.sql');
  const sqlFiles = readdirSync(rootMigrationsDir)
    .filter((file) => /^\d{4}_.+\.sql$/.test(file))
    .sort();
  const migrationSources = sqlFiles.map((file) => ({
    file,
    content: readFileSync(join(rootMigrationsDir, file), 'utf8'),
  }));
  const sql = migrationSources.map(({ content }) => content).join('\n');
  const bundle = readFileSync(rootBundlePath, 'utf8');
  const problems = validateMigrationBundle(bundle, migrationSources);

  const { DOMAINS } = await import(
    pathToFileURL(join(root, 'src', 'lib', 'dataLayer', 'domains.js')).href
  );
  const expectedTables = Object.values(DOMAINS).map((domain) => domain.table);

  for (const table of expectedTables) {
    const hasCreate = new RegExp(
      `create\\s+table\\s+(if\\s+not\\s+exists\\s+)?${table}\\b`,
      'i',
    ).test(sql);
    if (!hasCreate) problems.push(`Missing CREATE TABLE for '${table}'`);

    const explicitRls = new RegExp(
      `alter\\s+table\\s+${table}\\s+enable\\s+row\\s+level\\s+security`,
      'i',
    ).test(sql);
    const loopedRls = new RegExp(`'${table}'`).test(sql);
    if (!explicitRls && !loopedRls) {
      problems.push(`RLS not enabled for '${table}'`);
    }
  }

  if (!/create\s+table\s+(if\s+not\s+exists\s+)?profiles\b/i.test(sql)) {
    problems.push("Missing CREATE TABLE for 'profiles'");
  }
  if (!/create\s+or\s+replace\s+function\s+current_role_name/i.test(sql)) {
    problems.push('Missing current_role_name() helper function');
  }
  if (!/create\s+or\s+replace\s+function\s+bump_version/i.test(sql)) {
    problems.push('Missing bump_version() trigger function');
  }

  return { problems, tableCount: expectedTables.length, migrationCount: sqlFiles.length };
}

export async function main() {
  const { problems, tableCount, migrationCount } = await checkMigrations();
  if (problems.length === 0) {
    console.log(
      `OK: all ${tableCount} domain tables present with RLS + bump_version, ` +
        `profiles and helpers defined across ${migrationCount} migration files; ` +
        'bundled migration content and order verified.',
    );
    return 0;
  }

  console.error(`FAILED: ${problems.length} problem(s) found:`);
  for (const problem of problems) console.error(`  - ${problem}`);
  console.error(`\nChecked ${tableCount} domain tables in ${migrationCount} files.`);
  return 1;
}

const isDirectExecution =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isDirectExecution) {
  process.exitCode = await main();
}
