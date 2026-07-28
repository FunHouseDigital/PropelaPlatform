import { describe, expect, it } from 'vitest';

import { transformCollectionRecord } from '../../migration/transform';
import { getDomain } from '../domains';
import { DataErrorCode } from '../errors';
import {
  DEFAULT_NURSE_ATTRIBUTES,
  DEFAULT_SCORECARD_FIELDS,
  fromNurseRow,
  fromNurseRows,
  NURSE_ATTRIBUTE_FIELDS,
  NURSE_TYPED_FIELD_MAP,
  toNurseCreateRow,
  toNurseUpdatePatch,
} from '../nurseCodec';

const timestamps = {
  created_at: '2026-01-01T10:00:00.000Z',
  updated_at: '2026-01-02T10:00:00.000Z',
};

function validRow(overrides = {}) {
  return {
    id: 'nurse-123',
    owner_id: '2d7c6166-244a-4c75-9254-862913c71ba3',
    full_name: 'Ada Nurse',
    preferred_name: 'Ada',
    pipeline_stage: 'Applied',
    readiness_status: 'Not Ready',
    cohort_assigned: null,
    oet_status: 'Not Started',
    final_score: 3.5,
    tier: 'B',
    email: 'ada@example.test',
    scorecard_fields: { ...DEFAULT_SCORECARD_FIELDS, motivation: 4 },
    additional_certifications: ['ACLS'],
    communication_log: [
      {
        date: '2026-01-02',
        channel: 'Email',
        summary: 'Initial contact',
        nextAction: 'Follow up',
      },
    ],
    attributes: {
      nextAction: 'Needs: Review',
      flags: 1,
      englishPts: 2,
      agreementSigned: true,
    },
    version: 2,
    ...timestamps,
    ...overrides,
  };
}

function completeDraft(overrides = {}) {
  return {
    fullName: 'Ada Nurse',
    preferredName: 'Ada',
    pipelineStage: 'Applied',
    readinessStatus: 'Not Ready',
    cohortAssigned: '',
    oetStatus: 'Not Started',
    finalScore: 3.5,
    tier: 'B',
    email: 'ada@example.test',
    scorecardFields: { ...DEFAULT_SCORECARD_FIELDS, motivation: 4 },
    additionalCertifications: ['ACLS'],
    communicationLog: [
      { date: '2026-01-02', channel: 'Email', summary: 'Initial contact' },
    ],
    ...DEFAULT_NURSE_ATTRIBUTES,
    nextAction: 'Needs: Review',
    flags: 1,
    contactNumber: '+27000000000',
    englishPts: 2,
    efSetScore: '',
    cvScore: 4.25,
    agreementSigned: true,
    ...overrides,
  };
}

function expectValidationFailure(action) {
  expect(action).toThrowError(
    expect.objectContaining({ code: DataErrorCode.VALIDATION }),
  );
}

describe('nurseCodec row decoding', () => {
  it('maps every typed column and gives typed metadata precedence over attributes', () => {
    const nurse = fromNurseRow(
      validRow({
        final_score: '4.75',
        scorecard_fields: { hospitalExp: '3' },
        attributes: {
          fullName: 'Attribute name must lose',
          full_name: 'Snake attribute must also lose',
          ownerId: 'attribute-owner',
          version: 999,
          finalScore: 99,
          flags: '2',
          efSetScore: '71.5',
          englishPts: '',
        },
      }),
    );

    expect(nurse).toMatchObject({
      id: 'nurse-123',
      ownerId: '2d7c6166-244a-4c75-9254-862913c71ba3',
      fullName: 'Ada Nurse',
      preferredName: 'Ada',
      pipelineStage: 'Applied',
      readinessStatus: 'Not Ready',
      cohortAssigned: '',
      oetStatus: 'Not Started',
      finalScore: 4.75,
      tier: 'B',
      email: 'ada@example.test',
      scorecardFields: { ...DEFAULT_SCORECARD_FIELDS, hospitalExp: 3 },
      additionalCertifications: ['ACLS'],
      version: 2,
      createdAt: timestamps.created_at,
      updatedAt: timestamps.updated_at,
      flags: 2,
      efSetScore: 71.5,
      englishPts: '',
    });
  });

  it('normalizes nullable text and JSONB columns to documented defaults', () => {
    const nurse = fromNurseRow(
      validRow({
        owner_id: null,
        preferred_name: null,
        pipeline_stage: null,
        readiness_status: null,
        cohort_assigned: null,
        oet_status: null,
        final_score: null,
        tier: null,
        email: null,
        scorecard_fields: null,
        additional_certifications: null,
        communication_log: null,
        attributes: null,
      }),
    );

    expect(nurse).toMatchObject({
      ownerId: null,
      preferredName: '',
      pipelineStage: '',
      readinessStatus: '',
      cohortAssigned: '',
      oetStatus: '',
      finalScore: null,
      tier: '',
      email: '',
      scorecardFields: DEFAULT_SCORECARD_FIELDS,
      additionalCertifications: [],
      communicationLog: [],
      ...DEFAULT_NURSE_ATTRIBUTES,
    });
  });

  it.each([
    ['non-object row', null],
    ['invalid id', validRow({ id: '' })],
    ['invalid metadata', validRow({ version: '2' })],
    ['attributes array', validRow({ attributes: [] })],
    ['unknown attribute', validRow({ attributes: { unsupported: true } })],
    ['invalid scorecard', validRow({ scorecard_fields: { unknown: 1 } })],
    ['invalid certification array', validRow({ additional_certifications: [7] })],
    ['invalid communication array', validRow({ communication_log: [{ summary: 'Only' }] })],
    ['unknown row column', validRow({ unexpected_column: true })],
  ])('rejects a %s without returning a partial nurse', (_label, row) => {
    expectValidationFailure(() => fromNurseRow(row));
  });

  it('rejects a complete list when any row is malformed', () => {
    const rows = [validRow(), validRow({ id: 'nurse-456', attributes: [] })];
    expectValidationFailure(() => fromNurseRows(rows));
  });
});

describe('nurseCodec create and update encoding', () => {
  it('encodes all business fields with explicit snake_case and attributes mappings', () => {
    const draft = completeDraft();
    const row = toNurseCreateRow(draft, {
      id: 'nurse-created',
      ownerId: '61bbfc20-0b2a-40b9-a02d-b0bf90c22150',
    });

    expect(row).toMatchObject({
      id: 'nurse-created',
      owner_id: '61bbfc20-0b2a-40b9-a02d-b0bf90c22150',
      full_name: 'Ada Nurse',
      preferred_name: 'Ada',
      pipeline_stage: 'Applied',
      readiness_status: 'Not Ready',
      cohort_assigned: null,
      oet_status: 'Not Started',
      final_score: 3.5,
      tier: 'B',
      email: 'ada@example.test',
      scorecard_fields: draft.scorecardFields,
      additional_certifications: ['ACLS'],
      communication_log: draft.communicationLog,
    });
    expect(Object.keys(row.attributes).sort()).toEqual(
      [...NURSE_ATTRIBUTE_FIELDS].sort(),
    );
    expect(row.attributes).toMatchObject({
      nextAction: 'Needs: Review',
      flags: 1,
      englishPts: 2,
      efSetScore: '',
      cvScore: 4.25,
      agreementSigned: true,
    });
    expect(row).not.toHaveProperty('version');
    expect(row).not.toHaveProperty('created_at');
    expect(row).not.toHaveProperty('updated_at');
  });

  it('encodes a partial update without authoritative metadata', () => {
    const patch = toNurseUpdatePatch({
      preferredName: '',
      finalScore: '5.25',
      flags: '3',
      agreementSigned: false,
    });

    expect(patch).toEqual({
      preferred_name: null,
      final_score: 5.25,
      attributes: { flags: 3, agreementSigned: false },
    });
    for (const field of ['id', 'owner_id', 'version', 'created_at', 'updated_at']) {
      expect(patch).not.toHaveProperty(field);
    }
  });

  it.each([
    ['unknown field', { fullName: 'Ada', unexpected: true }],
    ['id metadata', { fullName: 'Ada', id: 'nurse-forged' }],
    ['owner metadata', { fullName: 'Ada', ownerId: 'forged-owner' }],
    ['version metadata', { fullName: 'Ada', version: 8 }],
    ['timestamp metadata', { fullName: 'Ada', updatedAt: timestamps.updated_at }],
  ])('rejects create/update input containing an %s', (_label, input) => {
    expectValidationFailure(() => toNurseUpdatePatch(input));
    expectValidationFailure(() =>
      toNurseCreateRow(input, {
        id: 'nurse-created',
        ownerId: '61bbfc20-0b2a-40b9-a02d-b0bf90c22150',
      }),
    );
  });

  it('preserves every supported business field through encode/decode normalization', () => {
    const draft = completeDraft();
    const encoded = toNurseCreateRow(draft, {
      id: 'nurse-round-trip',
      ownerId: '61bbfc20-0b2a-40b9-a02d-b0bf90c22150',
    });
    const decoded = fromNurseRow({ ...encoded, version: 1, ...timestamps });

    expect(decoded).toEqual({
      ...draft,
      cohortAssigned: '',
      id: 'nurse-round-trip',
      ownerId: '61bbfc20-0b2a-40b9-a02d-b0bf90c22150',
      version: 1,
      createdAt: timestamps.created_at,
      updatedAt: timestamps.updated_at,
    });
  });
});

describe('nurse migration/runtime mapping alignment', () => {
  it('uses the same typed columns and exact attributes allowlist', () => {
    const draft = completeDraft({ unsupportedMigrationField: 'must not migrate' });
    // The runtime codec rejects unsupported input; migration filters it so rows
    // produced from historical source data remain valid at the runtime boundary.
    expectValidationFailure(() =>
      toNurseCreateRow(draft, {
        id: 'nurse-migration',
        ownerId: '61bbfc20-0b2a-40b9-a02d-b0bf90c22150',
      }),
    );

    const migrated = transformCollectionRecord(getDomain('nurses'), {
      id: 'nurse-migration',
      ...draft,
    });
    expect(Object.keys(migrated.attributes).sort()).toEqual(
      [...NURSE_ATTRIBUTE_FIELDS].sort(),
    );
    expect(migrated.attributes).not.toHaveProperty('unsupportedMigrationField');
    expect(
      Object.values(NURSE_TYPED_FIELD_MAP).every((column) =>
        Object.prototype.hasOwnProperty.call(migrated, column),
      ),
    ).toBe(true);
  });
});
