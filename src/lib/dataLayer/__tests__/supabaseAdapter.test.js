import { afterAll, beforeEach, describe, expect, it } from 'vitest';

import { DataErrorCode } from '../errors';
import * as adapter from '../supabaseAdapter';
import { perDomain } from '../supabaseAdapter';
import { FakeSupabaseClient } from './fakeSupabase';

/**
 * Task 5 — example-based unit tests for the Supabase adapter generic operations,
 * the per-domain bindings, and the whole-collection saveX diff shim. Runs against
 * the in-memory fake client (see ./fakeSupabase.js) via the injectable factory.
 */

let client;

beforeEach(() => {
  client = new FakeSupabaseClient({
    nurses: [
      { id: 'nurse-001', tier: 'A', pipeline_stage: 'screening', version: 1 },
      { id: 'nurse-002', tier: 'B', pipeline_stage: 'offer', version: 3 },
    ],
  });
  adapter.__setClientFactory(() => client);
});

afterAll(() => {
  adapter.__setClientFactory(null);
});

describe('list', () => {
  it('paginates via range and reports the exact total', async () => {
    const res = await adapter.list('nurses', { page: 1, pageSize: 1 });
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(1);
    expect(res.total).toBe(2);
    expect(res.pageSize).toBe(1);
  });

  it('returns a VALIDATION error for an unknown domain', async () => {
    const res = await adapter.list('not-a-domain');
    expect(res.error?.code).toBe(DataErrorCode.VALIDATION);
    expect(res.data).toEqual([]);
  });
});

describe('get / create', () => {
  it('getById returns the row or null', async () => {
    expect((await adapter.getById('nurses', 'nurse-001')).data.tier).toBe('A');
    expect((await adapter.getById('nurses', 'missing')).data).toBeNull();
  });

  it('create validates then inserts, returning the committed row with version', async () => {
    const res = await adapter.create('nurses', { id: 'nurse-003', tier: 'C', version: 1 });
    expect(res.error).toBeNull();
    expect(res.data.id).toBe('nurse-003');
    expect(client.snapshot('nurses')).toHaveLength(3);
  });

  it('create rejects a record without a string id (VALIDATION), issuing no write', async () => {
    const res = await adapter.create('nurses', { tier: 'C' });
    expect(res.error?.code).toBe(DataErrorCode.VALIDATION);
    expect(client.snapshot('nurses')).toHaveLength(2);
  });
});

describe('update / remove conflict detection', () => {
  it('update commits when the base version matches and bumps version', async () => {
    const res = await adapter.update('nurses', 'nurse-001', { tier: 'S' }, 1);
    expect(res.error).toBeNull();
    expect(res.data.tier).toBe('S');
    expect(res.data.version).toBe(2);
  });

  it('update returns a conflict with the current value on a stale base version', async () => {
    const res = await adapter.update('nurses', 'nurse-002', { tier: 'S' }, 1);
    expect(res.data).toBeNull();
    expect(res.error).toBeNull();
    expect(res.conflict.current.version).toBe(3);
    expect(res.conflict.current.tier).toBe('B');
  });

  it('remove deletes on a matching version', async () => {
    const res = await adapter.remove('nurses', 'nurse-001', 1);
    expect(res.error).toBeNull();
    expect(res.conflict).toBeUndefined();
    expect(client.snapshot('nurses').some((r) => r.id === 'nurse-001')).toBe(false);
  });

  it('remove returns a conflict on a stale version, leaving the row intact', async () => {
    const res = await adapter.remove('nurses', 'nurse-002', 1);
    expect(res.conflict.current.version).toBe(3);
    expect(client.snapshot('nurses').some((r) => r.id === 'nurse-002')).toBe(true);
  });

  it('remove of an absent row is an idempotent no-op (no conflict)', async () => {
    const res = await adapter.remove('nurses', 'missing', 1);
    expect(res.error).toBeNull();
    expect(res.conflict).toBeUndefined();
  });
});

describe('saveCollection diff shim', () => {
  it('creates new rows, updates changed rows, and deletes removed rows', async () => {
    const next = [
      { id: 'nurse-001', tier: 'A', pipeline_stage: 'screening', version: 1 }, // unchanged
      { id: 'nurse-003', tier: 'C', pipeline_stage: 'placed', version: 1 }, // new
    ];
    // nurse-002 dropped -> should be deleted.
    const res = await adapter.saveCollection('nurses', next);
    expect(res.error).toBeNull();

    const rows = client.snapshot('nurses');
    const ids = rows.map((r) => r.id).sort();
    expect(ids).toEqual(['nurse-001', 'nurse-003']);
  });

  it('updates an existing row when its business fields change', async () => {
    const next = [
      { id: 'nurse-001', tier: 'Z', pipeline_stage: 'screening' },
      { id: 'nurse-002', tier: 'B', pipeline_stage: 'offer', version: 3 },
    ];
    await adapter.saveCollection('nurses', next);
    const updated = client.snapshot('nurses').find((r) => r.id === 'nurse-001');
    expect(updated.tier).toBe('Z');
    expect(updated.version).toBe(2); // bumped by the conditional update
  });
});

describe('bulkUpdate (atomic RPC)', () => {
  it('applies the whole batch via the bulk_update RPC and returns committed rows', async () => {
    const res = await adapter.bulkUpdate('nurses', [
      { id: 'nurse-001', version: 1, tier: 'X' },
      { id: 'nurse-002', version: 3, tier: 'Y' },
    ]);
    expect(res.error).toBeNull();
    expect(res.conflict).toBeUndefined();
    expect(res.data).toHaveLength(2);

    // The RPC was issued to the (fake) DB with the domain's table + payload.
    const rpcCall = client.calls.find((c) => c.operation === 'rpc');
    expect(rpcCall.fn).toBe('bulk_update');
    expect(rpcCall.args.table_name).toBe('nurses');

    // Committed rows are visible on a subsequent read, versions bumped.
    const read = await adapter.getById('nurses', 'nurse-001');
    expect(read.data.tier).toBe('X');
    expect(read.data.version).toBe(2);
  });

  it('returns a conflict and commits nothing when any element is stale', async () => {
    const before = client.snapshot('nurses');
    const res = await adapter.bulkUpdate('nurses', [
      { id: 'nurse-001', version: 1, tier: 'X' }, // valid
      { id: 'nurse-002', version: 1, tier: 'Y' }, // stale: committed version is 3
    ]);
    expect(res.data).toBeNull();
    expect(res.error).toBeNull();
    expect(res.conflict).toBeDefined();
    expect(res.conflict.ids).toContain('nurse-002');
    // All-or-none: the store is untouched.
    expect(client.snapshot('nurses')).toEqual(before);
  });

  it('rejects a batch with a missing version as VALIDATION, issuing no RPC', async () => {
    const res = await adapter.bulkUpdate('nurses', [{ id: 'nurse-001', tier: 'X' }]);
    expect(res.error?.code).toBe(DataErrorCode.VALIDATION);
    expect(client.calls.some((c) => c.operation === 'rpc')).toBe(false);
  });

  it('treats an empty batch as a successful no-op', async () => {
    const res = await adapter.bulkUpdate('nurses', []);
    expect(res.error).toBeNull();
    expect(res.data).toEqual([]);
  });
});

describe('per-domain bindings', () => {
  it('exposes generated names like listNurses / getNurse / saveNurses / bulkUpdateNurses', async () => {
    expect(typeof perDomain.listNurses).toBe('function');
    expect(typeof perDomain.getNurse).toBe('function');
    expect(typeof perDomain.createNurse).toBe('function');
    expect(typeof perDomain.updateNurse).toBe('function');
    expect(typeof perDomain.deleteNurse).toBe('function');
    expect(typeof perDomain.saveNurses).toBe('function');
    expect(typeof perDomain.bulkUpdateNurses).toBe('function');

    const res = await perDomain.listNurses({ pageSize: 10 });
    expect(res.error).toBeNull();
    expect(res.data).toHaveLength(2);
  });
});
