import { createClient } from '@supabase/supabase-js';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import * as adapter from '../supabaseAdapter';

/**
 * Live integration tests against a local Supabase/Postgres (Task 13.3).
 *
 * Requirements: 1.1, 2.1, 2.2, 6.2, 6.4
 *
 * These drive the REAL Supabase adapter (`supabaseAdapter.js`) against a running
 * database via the adapter's injectable client seam (`__setClientFactory`), so
 * they cover the genuine read/write paths, the `bump_version` trigger, and the
 * manual-edit visibility guarantee. They are SKIPPED by default and never touch
 * the network unless the SUPABASE_TEST_* env vars are present — `describe.skipIf`
 * keeps `beforeAll` (the only client-creating hook) from running otherwise.
 *
 * ── How to run locally / in CI ──────────────────────────────────────────────
 *   supabase start
 *   supabase db reset                       # applies supabase/migrations/*.sql
 *   export SUPABASE_TEST_URL="http://127.0.0.1:54321"
 *   export SUPABASE_TEST_SERVICE_ROLE_KEY="<service_role key>"
 *   npx vitest run src/lib/dataLayer/__tests__/supabase.integration.live.test.js
 *
 * We inject a service_role client so the adapter's writes/reads are not filtered
 * by RLS (RLS enforcement is covered by rlsPolicy.live.test.js). This isolates
 * the data-path behavior: round-trip, versioning, and manual-edit visibility.
 */

const TEST_URL = process.env.SUPABASE_TEST_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const LIVE = Boolean(TEST_URL && SERVICE_ROLE_KEY);

const DOMAIN = 'facilities';
const TABLE = 'facilities';

describe.skipIf(!LIVE)('Live Supabase adapter integration', () => {
  let serviceClient;
  const createdIds = [];

  beforeAll(() => {
    serviceClient = createClient(TEST_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    adapter.__setClientFactory(() => serviceClient);
  });

  afterEach(async () => {
    // Clean up rows created during a test so runs stay idempotent.
    if (serviceClient && createdIds.length > 0) {
      await serviceClient.from(TABLE).delete().in('id', createdIds);
      createdIds.length = 0;
    }
  });

  afterAll(() => {
    adapter.__setClientFactory(null);
  });

  it('creates then reads back a record (write-then-read, Req 1.1, 6.4)', async () => {
    const id = `int-fac-${Date.now()}`;
    createdIds.push(id);

    const created = await adapter.create(DOMAIN, {
      id,
      name: 'Integration General Hospital',
      province: 'Gauteng',
    });
    expect(created.error).toBeNull();
    expect(created.data.id).toBe(id);
    expect(created.data.version).toBe(1);

    const read = await adapter.getById(DOMAIN, id);
    expect(read.error).toBeNull();
    expect(read.data.id).toBe(id);
    expect(read.data.name).toBe('Integration General Hospital');
  });

  it('lists records with pagination and server-side filtering (Req 6.2, 2.1)', async () => {
    const id = `int-fac-list-${Date.now()}`;
    createdIds.push(id);
    await adapter.create(DOMAIN, { id, name: 'Filterable Clinic', province: 'Western Cape' });

    const listed = await adapter.list(DOMAIN, {
      page: 1,
      pageSize: 25,
      filters: { province: 'Western Cape' },
    });
    expect(listed.error).toBeNull();
    expect(listed.data.every((r) => r.province === 'Western Cape')).toBe(true);
    expect(listed.data.some((r) => r.id === id)).toBe(true);
  });

  it('conditional update advances the version via the bump_version trigger (Req 2.1)', async () => {
    const id = `int-fac-upd-${Date.now()}`;
    createdIds.push(id);
    const created = await adapter.create(DOMAIN, { id, name: 'Before', province: 'KZN' });

    const updated = await adapter.update(DOMAIN, id, { name: 'After' }, created.data.version);
    expect(updated.error).toBeNull();
    expect(updated.conflict).toBeUndefined();
    expect(updated.data.name).toBe('After');
    expect(updated.data.version).toBe(created.data.version + 1);

    // A stale-version update is rejected as a conflict, leaving the value intact.
    const stale = await adapter.update(DOMAIN, id, { name: 'Stale' }, created.data.version);
    expect(stale.data).toBeNull();
    expect(stale.conflict).toBeDefined();
    expect(stale.conflict.current.name).toBe('After');
  });

  it('surfaces a manual edit on the next read (manual-edit visibility, Req 2.2)', async () => {
    const id = `int-fac-manual-${Date.now()}`;
    createdIds.push(id);
    await adapter.create(DOMAIN, { id, name: 'Original', province: 'Free State' });

    // Simulate a Manual_Edit made directly in the database (e.g. Supabase editor
    // or SQL) outside the adapter's write path.
    const { error: manualErr } = await serviceClient
      .from(TABLE)
      .update({ name: 'Manually Edited' })
      .eq('id', id);
    expect(manualErr).toBeNull();

    // Reading through the adapter reflects the committed manual change.
    const read = await adapter.getById(DOMAIN, id);
    expect(read.error).toBeNull();
    expect(read.data.name).toBe('Manually Edited');
  });
});
