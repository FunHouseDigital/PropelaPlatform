import { describe, expect, it } from 'vitest';

import { FakeSupabaseClient } from '../../dataLayer/__tests__/fakeSupabase';
import { getDomain } from '../../dataLayer/domains';
import {
  formatReport,
  migrateDomain,
  migrationOrder,
  runMigration,
} from '../engine';
import {
  getCatchAllColumn,
  snakeToCamel,
  toRows,
  transformCollectionRecord,
  transformSingleton,
} from '../transform';

/**
 * Task 11.5 — Unit tests for migration reporting + transform mapping.
 * Requirements: 5.5 (rollback + failing-record reporting), 5.6 (per-domain
 * counts), 5.7 (mismatch marks failed), plus 5.3/5.4/5.8 transform behavior.
 *
 * All tests use an in-memory fake store — no live database.
 */

// ---------------------------------------------------------------------------
// Transform mapping (Req 5.3 id preservation, typed/jsonb split)
// ---------------------------------------------------------------------------
describe('transform: seed → row mapping', () => {
  it('snakeToCamel converts column names to seed field names', () => {
    expect(snakeToCamel('pipeline_stage')).toBe('pipelineStage');
    expect(snakeToCamel('entity_id')).toBe('entityId');
    expect(snakeToCamel('name')).toBe('name');
  });

  it('preserves id and splits typed columns from a jsonb attributes remainder', () => {
    const nurses = getDomain('nurses');
    const row = transformCollectionRecord(nurses, {
      id: 'nurse-001',
      fullName: 'Emily Plaatjies',
      pipelineStage: 'Training Active',
      finalScore: 42,
      scorecardFields: { motivation: 3 },
      communicationLog: [{ note: 'called' }],
      source: 'referral',
      notesFlags: 'VIP',
    });

    expect(row.id).toBe('nurse-001'); // Req 5.3
    expect(row.full_name).toBe('Emily Plaatjies');
    expect(row.pipeline_stage).toBe('Training Active');
    expect(row.final_score).toBe(42);
    expect(row.scorecard_fields).toEqual({ motivation: 3 });
    expect(row.communication_log).toEqual([{ note: 'called' }]);
    // Unmapped fields fall into the catch-all `attributes`.
    expect(row.attributes).toEqual({ source: 'referral', notesFlags: 'VIP' });
    // Typed source fields are NOT duplicated into attributes.
    expect(row.attributes.fullName).toBeUndefined();
  });

  it('applies per-domain field overrides (facilities name, documents doc_type)', () => {
    const facilities = getDomain('facilities');
    const fRow = transformCollectionRecord(facilities, {
      id: 'facility-001',
      organisationName: 'Netcare Milpark',
      healthcareGroup: 'Netcare',
      province: 'Gauteng',
      city: 'Johannesburg',
    });
    expect(fRow.name).toBe('Netcare Milpark'); // name ← organisationName
    expect(fRow.group_name).toBe('Netcare'); // group_name ← healthcareGroup
    expect(fRow.province).toBe('Gauteng');

    const documents = getDomain('documents');
    const dRow = transformCollectionRecord(documents, {
      id: 'doc-0001',
      nurseId: 'nurse-001',
      type: 'Passport',
      status: 'Pending',
      expiryDate: '2027-01-01',
      fileName: 'passport.pdf',
    });
    expect(dRow.doc_type).toBe('Passport'); // doc_type ← type
    expect(dRow.nurse_id).toBe('nurse-001'); // FK preserved (Req 5.4)
    expect(dRow.expiry_date).toBe('2027-01-01');
    expect(dRow.attributes).toEqual({ fileName: 'passport.pdf' });
  });

  it('routes the audit_log remainder into its single detail jsonb column', () => {
    const auditLog = getDomain('auditLog');
    expect(getCatchAllColumn(auditLog)).toBe('detail');
    const row = transformCollectionRecord(auditLog, {
      id: 'al-001',
      timestamp: '2025-06-01T10:00:00',
      user: 'Aya Rahman',
      action: 'nurse.updated',
      entityType: 'nurse',
      entityId: 'ent-1234',
      ipAddress: '192.168.0.1',
      details: 'Updated compliance status',
      severity: 'info',
    });
    expect(row.actor).toBe('Aya Rahman'); // actor ← user
    expect(row.created_at).toBe('2025-06-01T10:00:00'); // created_at ← timestamp
    expect(row.entity_type).toBe('nurse');
    expect(row.entity_id).toBe('ent-1234');
    // Remaining meaningful fields preserved under `detail`.
    expect(row.detail).toEqual({
      ipAddress: '192.168.0.1',
      details: 'Updated compliance status',
      severity: 'info',
    });
  });

  it('drops fields with no destination column (placements has no catch-all)', () => {
    const placements = getDomain('placements');
    expect(getCatchAllColumn(placements)).toBeNull();
    const row = transformCollectionRecord(placements, {
      id: 'placement-001',
      nurseId: 'nurse-001',
      facilityId: 'uk-001',
      currentStage: 'CV Sent',
      matchScore: 88,
      contractDetails: { role: 'ICU Nurse' },
      relocationChecklist: [{ item: 'Visa', checked: false }],
      stageHistory: [],
      // denormalized display fields with no column — intentionally dropped
      nurseName: 'Lilian Majola',
      facilityName: 'Royal London Hospital',
      specialty: 'ICU',
    });
    expect(row.nurse_id).toBe('nurse-001');
    expect(row.facility_id).toBe('uk-001');
    expect(row.current_stage).toBe('CV Sent');
    expect(row.match_score).toBe(88);
    expect(row.contract_details).toEqual({ role: 'ICU Nurse' });
    expect(row.attributes).toBeUndefined();
    expect(row.nurseName).toBeUndefined();
    expect(row.facilityName).toBeUndefined();
  });

  it('transforms a singleton into a single value row with a stable id', () => {
    const settings = getDomain('settings');
    const obj = { organization: { name: 'Propela' }, users: [] };
    const row = transformSingleton(settings, obj);
    expect(row.id).toBe('settings');
    expect(row.value).toEqual(obj);
    // toRows yields exactly one row for a present singleton, zero for null.
    expect(toRows(settings, obj)).toHaveLength(1);
    expect(toRows(settings, null)).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// Ordering (Req 5.4)
// ---------------------------------------------------------------------------
describe('migration ordering', () => {
  it('loads independent tables before dependents (placements/documents last)', () => {
    const order = migrationOrder();
    const idx = (n) => order.indexOf(n);
    expect(idx('nurses')).toBeLessThan(idx('placements'));
    expect(idx('facilities')).toBeLessThan(idx('placements'));
    expect(idx('nurses')).toBeLessThan(idx('documents'));
  });
});

// ---------------------------------------------------------------------------
// Per-domain counts (Req 5.6) + idempotency (Req 5.8)
// ---------------------------------------------------------------------------
describe('migration reporting: per-domain counts', () => {
  const sources = {
    nurses: [
      { id: 'nurse-001', fullName: 'A' },
      { id: 'nurse-002', fullName: 'B' },
    ],
    facilities: [{ id: 'facility-001', organisationName: 'F1' }],
    settings: { organization: { name: 'Propela' } },
  };

  it('reports sourceCount/loadedCount/failedCount per domain', async () => {
    const client = new FakeSupabaseClient();
    const report = await runMigration({ client, sources });

    const nurses = report.domains.find((d) => d.domain === 'nurses');
    expect(nurses).toMatchObject({ sourceCount: 2, loadedCount: 2, failedCount: 0 });

    const facilities = report.domains.find((d) => d.domain === 'facilities');
    expect(facilities).toMatchObject({ sourceCount: 1, loadedCount: 1, failedCount: 0 });

    const settings = report.domains.find((d) => d.domain === 'settings');
    expect(settings).toMatchObject({ sourceCount: 1, loadedCount: 1, failedCount: 0 });

    // Domains with no seed source report an empty, successful set.
    const referrers = report.domains.find((d) => d.domain === 'referrers');
    expect(referrers).toMatchObject({ sourceCount: 0, loadedCount: 0, failedCount: 0 });

    expect(report.failed).toBe(false);
    expect(formatReport(report)).toContain('STATUS: SUCCESS');
  });

  it('is idempotent: a second run creates no duplicates and keeps counts stable', async () => {
    const client = new FakeSupabaseClient();
    await runMigration({ client, sources });
    await runMigration({ client, sources });
    expect(client.snapshot('nurses')).toHaveLength(2);
    expect(client.snapshot('facilities')).toHaveLength(1);
    expect(client.snapshot('settings')).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// Mismatch marks the migration failed (Req 5.7)
// ---------------------------------------------------------------------------
describe('migration reporting: mismatch marks failed', () => {
  it('marks the whole migration FAILED when loadedCount != sourceCount', async () => {
    // A client that silently loads one fewer row than submitted for `nurses`.
    const partialClient = {
      from(table) {
        return {
          _rows: null,
          upsert(rows) {
            this._rows = rows;
            return this;
          },
          select() {
            const loaded = table === 'nurses' ? this._rows.slice(1) : this._rows;
            return Promise.resolve({ data: loaded, error: null });
          },
        };
      },
    };

    const report = await runMigration({
      client: partialClient,
      sources: { nurses: [{ id: 'n1' }, { id: 'n2' }, { id: 'n3' }] },
      order: ['nurses'],
    });

    const nurses = report.domains.find((d) => d.domain === 'nurses');
    expect(nurses.sourceCount).toBe(3);
    expect(nurses.loadedCount).toBe(2);
    expect(nurses.failedCount).toBe(1);
    expect(report.failed).toBe(true); // Req 5.7
    expect(formatReport(report)).toContain('STATUS: FAILED');
  });
});

// ---------------------------------------------------------------------------
// Rollback + failing-record reporting on a constraint violation (Req 5.5)
// ---------------------------------------------------------------------------
describe('migration reporting: rollback on a constraint-violating record', () => {
  /**
   * In-memory client whose bulk upsert is all-or-none: if any row's id is in the
   * poison set, the whole statement fails atomically (nothing is written) and
   * the driver surfaces the offending id under `details` (mirroring a Postgres
   * constraint violation rolling back the entire INSERT ... ON CONFLICT).
   */
  function makeConstraintClient(poison) {
    const store = new Map();
    return {
      store,
      from(table) {
        return {
          _rows: null,
          upsert(rows) {
            this._rows = rows;
            return this;
          },
          select() {
            const bad = this._rows.find((r) => poison.has(r.id));
            if (bad) {
              return Promise.resolve({
                data: null,
                error: {
                  message: `null value in column violates constraint`,
                  details: bad.id,
                  constraint: 'documents_nurse_id_fkey',
                },
              });
            }
            if (!store.has(table)) store.set(table, []);
            const rows = store.get(table);
            for (const r of this._rows) {
              const idx = rows.findIndex((x) => x.id === r.id);
              if (idx === -1) rows.push({ ...r });
              else rows[idx] = { ...r };
            }
            return Promise.resolve({ data: this._rows, error: null });
          },
        };
      },
    };
  }

  it('rolls back the set and reports the failing record + constraint', async () => {
    const client = makeConstraintClient(new Set(['doc-bad']));
    const documents = getDomain('documents');
    const source = [
      { id: 'doc-0001', nurseId: 'nurse-001', type: 'Passport' },
      { id: 'doc-bad', nurseId: 'nurse-999', type: 'Visa' },
      { id: 'doc-0003', nurseId: 'nurse-001', type: 'OET Certificate' },
    ];

    const result = await migrateDomain(client, documents, source);

    // All-or-none: nothing committed for the set (Req 5.5).
    expect(client.store.get('documents')).toBeUndefined();
    expect(result.loadedCount).toBe(0);
    expect(result.failedCount).toBe(3);
    // Failing record + violated constraint are reported.
    expect(result.failures).toHaveLength(1);
    expect(result.failures[0].id).toBe('doc-bad');
    expect(result.failures[0].constraint).toBe('documents_nurse_id_fkey');

    // And the whole migration is marked failed.
    const report = await runMigration({
      client,
      sources: { documents: source },
      order: ['documents'],
    });
    expect(report.failed).toBe(true);
  });
});
