import fc from 'fast-check';
import { describe, expect, it } from 'vitest';

import { DataErrorCode } from '../errors';
import {
  DEFAULT_NURSE_ATTRIBUTES,
  DEFAULT_SCORECARD_FIELDS,
  fromNurseRow,
  fromNurseRows,
  NURSE_ATTRIBUTE_FIELDS,
  NURSE_METADATA_FIELD_MAP,
  NURSE_SCORECARD_FIELDS,
  NURSE_TYPED_FIELD_MAP,
  toNurseCreateRow,
  toNurseUpdatePatch,
} from '../nurseCodec';

/**
 * Property 5: Nurse codec boundary safety and round trip.
 *
 * **Validates: Requirements 4.1–4.12**
 */

const NUM_RUNS = 100;
const METADATA_FIELDS = Object.keys(NURSE_METADATA_FIELD_MAP);
const METADATA_COLUMNS = Object.values(NURSE_METADATA_FIELD_MAP);
const TYPED_FIELDS = Object.keys(NURSE_TYPED_FIELD_MAP);
const TYPED_COLUMNS = Object.values(NURSE_TYPED_FIELD_MAP);
const PRECEDENCE_KEYS = [
  ...TYPED_FIELDS,
  ...TYPED_COLUMNS,
  ...METADATA_FIELDS,
  ...METADATA_COLUMNS,
];
const NUMERIC_ATTRIBUTE_FIELDS = new Set([
  'flags',
  'efSetScore',
  'englishPts',
  'cvScore',
]);
const TEXT_ATTRIBUTE_FIELDS = NURSE_ATTRIBUTE_FIELDS.filter(
  (field) =>
    !NUMERIC_ATTRIBUTE_FIELDS.has(field) && field !== 'agreementSigned',
);

const textArb = fc.string({ maxLength: 40 });
const nonEmptyTextArb = fc.string({ minLength: 1, maxLength: 40 });
const finiteNumberArb = fc.double({
  min: -100_000,
  max: 100_000,
  noNaN: true,
  noDefaultInfinity: true,
});
const nullableFiniteNumberArb = fc.oneof(finiteNumberArb, fc.constant(null));
const emptyOrFiniteNumberArb = fc.oneof(finiteNumberArb, fc.constant(''));

const scorecardArb = fc.record(
  Object.fromEntries(
    NURSE_SCORECARD_FIELDS.map((field) => [field, finiteNumberArb]),
  ),
);

const communicationEntryArb = fc.oneof(
  fc.record({
    date: textArb,
    channel: textArb,
    summary: textArb,
  }),
  fc.record({
    date: textArb,
    channel: textArb,
    summary: textArb,
    nextAction: textArb,
  }),
);

const attributesArb = fc.record({
  ...Object.fromEntries(TEXT_ATTRIBUTE_FIELDS.map((field) => [field, textArb])),
  flags: finiteNumberArb,
  efSetScore: emptyOrFiniteNumberArb,
  englishPts: emptyOrFiniteNumberArb,
  cvScore: finiteNumberArb,
  agreementSigned: fc.boolean(),
});

const validDraftArb = fc
  .tuple(
    fc.record({
      fullName: nonEmptyTextArb,
      preferredName: textArb,
      pipelineStage: textArb,
      readinessStatus: textArb,
      cohortAssigned: textArb,
      oetStatus: textArb,
      finalScore: nullableFiniteNumberArb,
      tier: textArb,
      email: textArb,
      scorecardFields: scorecardArb,
      additionalCertifications: fc.array(textArb, { maxLength: 5 }),
      communicationLog: fc.array(communicationEntryArb, { maxLength: 5 }),
    }),
    attributesArb,
  )
  .map(([typed, attributes]) => ({ ...typed, ...attributes }));

const validCaseArb = fc.record({
  draft: validDraftArb,
  id: nonEmptyTextArb,
  ownerId: nonEmptyTextArb,
  version: fc.integer({ min: 1, max: 1_000_000 }),
  createdAt: nonEmptyTextArb,
  updatedAt: nonEmptyTextArb,
});

const unknownKeyArb = fc
  .array(fc.constantFrom(...'abcdefghijklmnopqrstuvwxyz'), {
    minLength: 1,
    maxLength: 16,
  })
  .map((characters) => `extra_${characters.join('')}`);

const arbitraryExtraKeysArb = fc.dictionary(
  fc.constantFrom(...PRECEDENCE_KEYS),
  fc.jsonValue(),
  { minKeys: 1, maxKeys: PRECEDENCE_KEYS.length },
);

const metadataMutationKeyArb = fc.constantFrom(
  ...METADATA_FIELDS,
  ...METADATA_COLUMNS,
);

function toCompleteRow({ draft, id, ownerId, version, createdAt, updatedAt }) {
  return {
    ...toNurseCreateRow(draft, { id, ownerId }),
    version,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

function expectedNurse({ draft, id, ownerId, version, createdAt, updatedAt }) {
  return {
    ...draft,
    id,
    ownerId,
    version,
    createdAt,
    updatedAt,
  };
}

function expectValidationFailure(action) {
  expect(action).toThrowError(
    expect.objectContaining({ code: DataErrorCode.VALIDATION }),
  );
}

function malformedRow(row, kind, unknownKey, extraValue) {
  switch (kind) {
    case 0:
      return null;
    case 1:
      return [];
    case 2:
      return { ...row, id: '' };
    case 3:
      return { ...row, owner_id: 42 };
    case 4:
      return { ...row, version: 0 };
    case 5:
      return { ...row, created_at: '' };
    case 6:
      return { ...row, attributes: [] };
    case 7:
      return { ...row, attributes: { [unknownKey]: extraValue } };
    case 8:
      return { ...row, scorecard_fields: { unexpectedScore: 1 } };
    case 9:
      return { ...row, additional_certifications: [42] };
    case 10:
      return {
        ...row,
        communication_log: [{ date: 'today', channel: 'Email' }],
      };
    case 11: {
      const withoutRequiredColumn = { ...row };
      delete withoutRequiredColumn.full_name;
      return withoutRequiredColumn;
    }
    default:
      return { ...row, [unknownKey]: extraValue };
  }
}

describe('Property 5: Nurse codec boundary safety and round trip', () => {
  it('round-trips every supported business field with exact typed mappings and allowlisted attributes', () => {
    fc.assert(
      fc.property(validCaseArb, (testCase) => {
        const row = toCompleteRow(testCase);
        const decoded = fromNurseRow(row);
        const updatePatch = toNurseUpdatePatch(testCase.draft);

        expect(decoded).toEqual(expectedNurse(testCase));
        expect(Object.keys(row).sort()).toEqual(
          [
            'id',
            'owner_id',
            ...TYPED_COLUMNS,
            'attributes',
            'version',
            'created_at',
            'updated_at',
          ].sort(),
        );
        expect(Object.keys(row.attributes).sort()).toEqual(
          [...NURSE_ATTRIBUTE_FIELDS].sort(),
        );

        for (const [field, column] of Object.entries(NURSE_TYPED_FIELD_MAP)) {
          expect(row).toHaveProperty(column);
          expect(decoded).toHaveProperty(field);
          expect(updatePatch).toHaveProperty(column);
        }
        for (const field of NURSE_ATTRIBUTE_FIELDS) {
          expect(row.attributes).toHaveProperty(field);
          expect(decoded).toHaveProperty(field);
        }
        for (const field of [...METADATA_FIELDS, ...METADATA_COLUMNS]) {
          expect(updatePatch).not.toHaveProperty(field);
        }
        expect(Object.keys(updatePatch).sort()).toEqual(
          [...TYPED_COLUMNS, 'attributes'].sort(),
        );
      }),
      { numRuns: NUM_RUNS },
    );
  });

  it('gives typed columns and authoritative metadata precedence over arbitrary conflicting attribute keys', () => {
    fc.assert(
      fc.property(
        validCaseArb,
        arbitraryExtraKeysArb,
        (testCase, conflictingAttributes) => {
          const row = toCompleteRow(testCase);
          const withConflicts = {
            ...row,
            attributes: { ...row.attributes, ...conflictingAttributes },
          };

          expect(fromNurseRow(withConflicts)).toEqual(expectedNurse(testCase));
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('normalizes nullable typed values, JSON defaults, and finite numeric strings', () => {
    fc.assert(
      fc.property(
        validCaseArb,
        fc.integer({ min: -100_000, max: 100_000 }),
        fc.integer({ min: -100_000, max: 100_000 }),
        fc.integer({ min: -100_000, max: 100_000 }),
        (testCase, finalScore, hospitalExp, flags) => {
          const row = {
            ...toCompleteRow(testCase),
            preferred_name: null,
            pipeline_stage: null,
            readiness_status: null,
            cohort_assigned: null,
            oet_status: null,
            final_score: String(finalScore),
            tier: null,
            email: null,
            scorecard_fields: { hospitalExp: String(hospitalExp) },
            additional_certifications: null,
            communication_log: null,
            attributes: { flags: String(flags) },
          };

          expect(fromNurseRow(row)).toEqual({
            ...DEFAULT_NURSE_ATTRIBUTES,
            flags,
            id: testCase.id,
            ownerId: testCase.ownerId,
            fullName: testCase.draft.fullName,
            preferredName: '',
            pipelineStage: '',
            readinessStatus: '',
            cohortAssigned: '',
            oetStatus: '',
            finalScore,
            tier: '',
            email: '',
            scorecardFields: {
              ...DEFAULT_SCORECARD_FIELDS,
              hospitalExp,
            },
            additionalCertifications: [],
            communicationLog: [],
            version: testCase.version,
            createdAt: testCase.createdAt,
            updatedAt: testCase.updatedAt,
          });
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('rejects arbitrary unsupported row, attribute, and draft keys without mutating input', () => {
    fc.assert(
      fc.property(
        validCaseArb,
        unknownKeyArb,
        fc.jsonValue(),
        (testCase, unknownKey, extraValue) => {
          const row = toCompleteRow(testCase);
          const rowWithExtra = { ...row, [unknownKey]: extraValue };
          const attributesWithExtra = {
            ...row,
            attributes: { ...row.attributes, [unknownKey]: extraValue },
          };
          const draftWithExtra = {
            ...testCase.draft,
            [unknownKey]: extraValue,
          };
          const rowSnapshot = structuredClone(rowWithExtra);
          const attributesSnapshot = structuredClone(attributesWithExtra);
          const draftSnapshot = structuredClone(draftWithExtra);

          expectValidationFailure(() => fromNurseRow(rowWithExtra));
          expectValidationFailure(() => fromNurseRow(attributesWithExtra));
          expectValidationFailure(() => toNurseUpdatePatch(draftWithExtra));
          expectValidationFailure(() =>
            toNurseCreateRow(draftWithExtra, {
              id: testCase.id,
              ownerId: testCase.ownerId,
            }),
          );

          expect(rowWithExtra).toEqual(rowSnapshot);
          expect(attributesWithExtra).toEqual(attributesSnapshot);
          expect(draftWithExtra).toEqual(draftSnapshot);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('rejects every generated metadata mutation before a create or update can be emitted', () => {
    fc.assert(
      fc.property(
        validCaseArb,
        metadataMutationKeyArb,
        fc.jsonValue(),
        (testCase, metadataKey, metadataValue) => {
          const mutatedDraft = {
            ...testCase.draft,
            [metadataKey]: metadataValue,
          };
          const confirmedState = expectedNurse(testCase);
          let nextState = confirmedState;
          let writeCount = 0;

          const attemptUpdate = () => {
            const changes = toNurseUpdatePatch(mutatedDraft);
            writeCount += 1;
            nextState = changes;
          };
          const attemptCreate = () => {
            const changes = toNurseCreateRow(mutatedDraft, {
              id: testCase.id,
              ownerId: testCase.ownerId,
            });
            writeCount += 1;
            nextState = changes;
          };

          expectValidationFailure(attemptUpdate);
          expectValidationFailure(attemptCreate);
          expect(writeCount).toBe(0);
          expect(nextState).toBe(confirmedState);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });

  it('rejects malformed rows and malformed lists atomically without exposing a partial nurse', () => {
    fc.assert(
      fc.property(
        fc.array(validCaseArb, { minLength: 1, maxLength: 8 }),
        fc.nat(),
        fc.integer({ min: 0, max: 12 }),
        unknownKeyArb,
        fc.jsonValue(),
        (testCases, rawIndex, kind, unknownKey, extraValue) => {
          const rows = testCases.map(toCompleteRow);
          const invalidIndex = rawIndex % rows.length;
          const invalidRow = malformedRow(
            rows[invalidIndex],
            kind,
            unknownKey,
            extraValue,
          );
          const malformedRows = rows.map((row, index) =>
            index === invalidIndex ? invalidRow : row,
          );
          const inputSnapshot = structuredClone(malformedRows);
          const confirmedState = [expectedNurse(testCases[0])];
          let nextState = confirmedState;

          expectValidationFailure(() => fromNurseRow(invalidRow));
          expectValidationFailure(() => {
            const decoded = fromNurseRows(malformedRows);
            nextState = decoded;
          });

          expect(nextState).toBe(confirmedState);
          expect(malformedRows).toEqual(inputSnapshot);
        },
      ),
      { numRuns: NUM_RUNS },
    );
  });
});
