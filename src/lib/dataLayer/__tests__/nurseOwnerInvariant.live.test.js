import { createClient } from '@supabase/supabase-js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Live migration verification for nurse owner assignment and immutability.
 * Runs only against an explicitly configured test Supabase project.
 *
 * Validates: Requirements 3.4, 4.10, 9.1, 9.2, 9.4, 9.6
 */

const TEST_URL = process.env.SUPABASE_TEST_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_TEST_SERVICE_ROLE_KEY;
const ANON_KEY = process.env.SUPABASE_TEST_ANON_KEY;
const LIVE = Boolean(TEST_URL && SERVICE_ROLE_KEY && ANON_KEY);

async function createOperationalUser(serviceClient, label) {
  const email = `nurse-owner-${label}-${Date.now()}-${Math.random().toString(36).slice(2)}@example.test`;
  const password = `Pw-${Math.random().toString(36).slice(2)}-${Date.now()}`;
  const { data, error } = await serviceClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (error) throw error;

  const { error: profileError } = await serviceClient
    .from('profiles')
    .upsert({ user_id: data.user.id, role: 'Recruiter' }, { onConflict: 'user_id' });
  if (profileError) throw profileError;

  const client = createClient(TEST_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { error: signInError } = await client.auth.signInWithPassword({ email, password });
  if (signInError) throw signInError;

  return { client, userId: data.user.id };
}

describe.skipIf(!LIVE)('Live nurse owner invariant migration', () => {
  let serviceClient;
  let creator;
  let operator;
  const nurseIds = [];
  const userIds = [];

  beforeAll(async () => {
    serviceClient = createClient(TEST_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    creator = await createOperationalUser(serviceClient, 'creator');
    operator = await createOperationalUser(serviceClient, 'operator');
    userIds.push(creator.userId, operator.userId);
  }, 60_000);

  afterAll(async () => {
    if (!serviceClient) return;
    if (nurseIds.length > 0) {
      await serviceClient.from('nurses').delete().in('id', nurseIds);
    }
    for (const userId of userIds) {
      await serviceClient.auth.admin.deleteUser(userId).catch(() => {});
    }
  });

  it('assigns omitted owner_id from the public client session JWT', async () => {
    const id = `nurse-owner-default-${Date.now()}`;
    nurseIds.push(id);

    const { data, error } = await creator.client
      .from('nurses')
      .insert({ id, full_name: 'Owner Invariant Test' })
      .select('id, owner_id, version')
      .single();

    expect(error).toBeNull();
    expect(data).toMatchObject({ id, owner_id: creator.userId, version: 1 });
  });

  it('rejects an insert that supplies another user as owner_id', async () => {
    const id = `nurse-owner-spoof-${Date.now()}`;
    nurseIds.push(id);

    const attempted = await creator.client
      .from('nurses')
      .insert({ id, full_name: 'Spoof Attempt', owner_id: operator.userId })
      .select();

    expect(attempted.error).not.toBeNull();
    const persisted = await serviceClient.from('nurses').select('id').eq('id', id);
    expect(persisted.data).toEqual([]);
  });

  it('allows an operational user to update another owner’s nurse but not transfer ownership', async () => {
    const id = `nurse-owner-update-${Date.now()}`;
    nurseIds.push(id);

    const created = await creator.client
      .from('nurses')
      .insert({ id, full_name: 'Before Cross-owner Update' })
      .select('id, owner_id, version')
      .single();
    expect(created.error).toBeNull();

    const updated = await operator.client
      .from('nurses')
      .update({ full_name: 'After Cross-owner Update' })
      .eq('id', id)
      .select('owner_id, full_name, version')
      .single();
    expect(updated.error).toBeNull();
    expect(updated.data).toMatchObject({
      owner_id: creator.userId,
      full_name: 'After Cross-owner Update',
      version: created.data.version + 1,
    });

    const transfer = await operator.client
      .from('nurses')
      .update({ owner_id: operator.userId })
      .eq('id', id)
      .select();
    expect(transfer.error).not.toBeNull();

    const persisted = await serviceClient
      .from('nurses')
      .select('owner_id, full_name, version')
      .eq('id', id)
      .single();
    expect(persisted.data).toMatchObject({
      owner_id: creator.userId,
      full_name: 'After Cross-owner Update',
      version: updated.data.version,
    });
  });
});
