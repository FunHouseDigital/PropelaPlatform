import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { listDomains } from '../domains';

/**
 * Live RLS policy tests against a real Postgres/Supabase (Task 13.2).
 *
 * Requirements: 4.2, 4.3, 4.4, 4.6, 4.7, 10.4
 *
 * These exercise the ACTUAL Row Level Security policies inside Postgres and are
 * therefore gated on a provisioned Supabase test project. They are SKIPPED in
 * the default `vitest run` (and in CI without the secrets) and never open a
 * network connection there — `describe.skipIf` prevents the suite body's
 * `beforeAll` (the only place a client is created) from running.
 *
 * ── How to run locally / in CI ──────────────────────────────────────────────
 *   1. Start a local stack and apply the migrations:
 *          supabase start
 *          supabase db reset            # applies supabase/migrations/*.sql
 *   2. Export the connection env (values printed by `supabase start`):
 *          export SUPABASE_TEST_URL="http://127.0.0.1:54321"
 *          export SUPABASE_TEST_SERVICE_ROLE_KEY="<service_role key>"
 *          export SUPABASE_TEST_ANON_KEY="<anon key>"      # optional but recommended
 *   3. Run just this suite:
 *          npx vitest run src/lib/dataLayer/__tests__/rlsPolicy.live.test.js
 *
 * The service_role key is used ONLY to provision test users/rows (it bypasses
 * RLS). All policy assertions are made through per-user anon clients whose
 * requests are constrained by RLS, exactly like the browser.
 */

const TEST_URL = process.env.SUPABASE_TEST_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
// Anon key is optional: fall back to the service role only for client creation,
// but the meaningful anon-constraint assertions require a real anon key.
const ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY || null;

const LIVE = Boolean(TEST_URL && SERVICE_ROLE_KEY);

// A representative operational table (Recruiter-allowed) and admin-only table.
const OPERATIONAL_TABLE =
  listDomains().find((d) => !d.adminOnly && !d.perUser && d.kind === 'collection')?.table ||
  'nurses';
const ADMIN_ONLY_TABLE =
  listDomains().find((d) => d.adminOnly && d.kind === 'collection')?.table || 'integrations';

/** Create a unique test user with the given role and return its credentials. */
async function makeUser(admin, role) {
  const email = `rls-${role || 'norole'}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
  const password = `Pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;
  const userId = data.user.id;
  if (role) {
    const { error: pErr } = await admin.from('profiles').upsert(
      { user_id: userId, role },
      { onConflict: 'user_id' },
    );
    if (pErr) throw pErr;
  }
  return { email, password, userId };
}

/** Sign a user in with a fresh anon client and return that authed client. */
async function signIn({ email, password }) {
  const client = createClient(TEST_URL, ANON_KEY || SERVICE_ROLE_KEY);
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return client;
}

describe.skipIf(!LIVE)('Live RLS policy enforcement', () => {
  let admin;
  let recruiterClient;
  let adminClient;
  let noRoleClient;
  const createdUserIds = [];
  const seededIds = { operational: null, adminOnly: null };

  beforeAll(async () => {
    admin = createClient(TEST_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const recruiter = await makeUser(admin, 'Recruiter');
    const adminUser = await makeUser(admin, 'Admin');
    const noRole = await makeUser(admin, null);
    createdUserIds.push(recruiter.userId, adminUser.userId, noRole.userId);

    // Seed one row into each representative table via the service role so that
    // "denied" vs "allowed" reads are distinguishable (a policy that denies
    // returns zero rows even though rows exist).
    seededIds.operational = `rls-test-op-${Date.now()}`;
    seededIds.adminOnly = `rls-test-admin-${Date.now()}`;
    await admin
      .from(OPERATIONAL_TABLE)
      .upsert({ id: seededIds.operational }, { onConflict: 'id' });
    await admin
      .from(ADMIN_ONLY_TABLE)
      .upsert({ id: seededIds.adminOnly }, { onConflict: 'id' });

    recruiterClient = await signIn(recruiter);
    adminClient = await signIn(adminUser);
    noRoleClient = await signIn(noRole);
  }, 60_000);

  afterAll(async () => {
    if (!admin) return;
    // Best-effort cleanup of seeded rows and users.
    if (seededIds.operational) {
      await admin.from(OPERATIONAL_TABLE).delete().eq('id', seededIds.operational);
    }
    if (seededIds.adminOnly) {
      await admin.from(ADMIN_ONLY_TABLE).delete().eq('id', seededIds.adminOnly);
    }
    for (const id of createdUserIds) {
      await admin.auth.admin.deleteUser(id).catch(() => {});
    }
  });

  it('Recruiter can read operational data (Req 4.2)', async () => {
    const { data, error } = await recruiterClient.from(OPERATIONAL_TABLE).select('*');
    expect(error).toBeNull();
    expect(Array.isArray(data)).toBe(true);
    expect(data.some((r) => r.id === seededIds.operational)).toBe(true);
  });

  it('Recruiter is denied admin-only data — zero rows (Req 4.3, 10.4)', async () => {
    const { data, error } = await recruiterClient.from(ADMIN_ONLY_TABLE).select('*');
    // Deny-by-default surfaces as an empty result set (not necessarily an error).
    expect(error).toBeNull();
    expect(data).toEqual([]);
  });

  it('Recruiter write to an admin-only table changes nothing (Req 4.3, 4.5)', async () => {
    const { data } = await recruiterClient
      .from(ADMIN_ONLY_TABLE)
      .insert({ id: `rls-illegal-${Date.now()}` })
      .select();
    // RLS blocks the insert: either an error or zero returned rows, and the
    // service-role read still shows only the originally seeded row.
    const { data: allRows } = await admin.from(ADMIN_ONLY_TABLE).select('id');
    expect(data == null || data.length === 0).toBe(true);
    expect(allRows.some((r) => String(r.id).startsWith('rls-illegal-'))).toBe(false);
  });

  it('Admin can read operational and admin-only data (Req 4.4)', async () => {
    const op = await adminClient.from(OPERATIONAL_TABLE).select('*');
    const adminOnly = await adminClient.from(ADMIN_ONLY_TABLE).select('*');
    expect(op.error).toBeNull();
    expect(adminOnly.error).toBeNull();
    expect(op.data.some((r) => r.id === seededIds.operational)).toBe(true);
    expect(adminOnly.data.some((r) => r.id === seededIds.adminOnly)).toBe(true);
  });

  it('a user with no role is denied everywhere (Req 4.7)', async () => {
    const op = await noRoleClient.from(OPERATIONAL_TABLE).select('*');
    const adminOnly = await noRoleClient.from(ADMIN_ONLY_TABLE).select('*');
    expect(op.data ?? []).toEqual([]);
    expect(adminOnly.data ?? []).toEqual([]);
  });

  it('anon-key requests (no session) remain RLS-constrained (Req 4.6)', async () => {
    const anon = createClient(TEST_URL, ANON_KEY || SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data } = await anon.from(OPERATIONAL_TABLE).select('*');
    // With no authenticated session the role resolves to NULL ⇒ deny-by-default.
    expect(data ?? []).toEqual([]);
  });
});
