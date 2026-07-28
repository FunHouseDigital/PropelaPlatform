import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * Always-on migration verification for nurse ownership (nurse-management 7.2).
 *
 * Validates: Requirements 3.4, 4.10, 9.1, 9.2, 9.4, 9.6
 */

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, '..', '..', '..', '..');
const migration = readFileSync(
  join(repoRoot, 'supabase', 'migrations', '0008_nurse_owner_invariants.sql'),
  'utf8'
);
const versionMigration = readFileSync(
  join(repoRoot, 'supabase', 'migrations', '0002_bump_version_trigger.sql'),
  'utf8'
);
const rlsMigration = readFileSync(
  join(repoRoot, 'supabase', 'migrations', '0004_core_rls.sql'),
  'utf8'
);
const bundledMigration = readFileSync(join(repoRoot, 'supabase', 'bundled_migration.sql'), 'utf8');

const invariantFunction = migration.match(
  /create\s+or\s+replace\s+function\s+public\.enforce_nurse_owner_invariant\(\)[\s\S]*?\$\$;/i
)?.[0];

describe('nurse owner invariant migration', () => {
  it('sets an omitted insert owner from the authenticated JWT and rejects owner spoofing', () => {
    expect(invariantFunction).toBeDefined();
    expect(invariantFunction).toMatch(/caller_id\s+uuid\s*:=\s*auth\.uid\(\)/i);
    expect(invariantFunction).toMatch(/if\s+caller_id\s+is\s+null\s+then/i);
    expect(invariantFunction).toMatch(
      /if\s+new\.owner_id\s+is\s+null\s+then\s+new\.owner_id\s*:=\s*caller_id/i
    );
    expect(invariantFunction).toMatch(
      /elsif\s+new\.owner_id\s+is\s+distinct\s+from\s+caller_id\s+then/i
    );
  });

  it('rejects ownership transfer without owner-scoping authorized operational updates', () => {
    expect(invariantFunction).toMatch(
      /tg_op\s*=\s*'update'\s+and\s+new\.owner_id\s+is\s+distinct\s+from\s+old\.owner_id/i
    );
    expect(invariantFunction).not.toMatch(/old\.owner_id\s*=\s*auth\.uid\(\)/i);

    expect(rlsMigration).toMatch(
      /create\s+policy\s+admin_all\s+on\s+nurses\s+for\s+all[\s\S]*?current_role_name\(\)\s+in\s*\('Admin','Superadmin'\)/i
    );
    expect(rlsMigration).toMatch(
      /create\s+policy\s+recruiter_ops\s+on\s+nurses\s+for\s+all[\s\S]*?current_role_name\(\)\s*=\s*'Recruiter'/i
    );
  });

  it('installs a before-insert/update trigger without replacing RLS or versioning', () => {
    expect(migration).toMatch(
      /create\s+trigger\s+trg_enforce_nurse_owner\s+before\s+insert\s+or\s+update\s+on\s+public\.nurses/i
    );
    expect(migration).not.toMatch(/create\s+policy|drop\s+policy/i);
    expect(migration).not.toMatch(/drop\s+trigger\s+if\s+exists\s+trg_bump_version/i);
    expect(versionMigration).toMatch(
      /create\s+trigger\s+trg_bump_version\s+before\s+update\s+on\s+nurses/i
    );
  });

  it('keeps the paste-ready bundle synchronized with migration 0008', () => {
    expect(bundledMigration).toContain('BEGIN migrations/0008_nurse_owner_invariants.sql');
    expect(bundledMigration).toContain('FUNCTION public.enforce_nurse_owner_invariant()');
  });
});
