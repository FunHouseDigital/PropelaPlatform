import fc from 'fast-check';
import { describe, expect, it, vi } from 'vitest';

import {
  createBlankNurseDraft,
  normalizeNurseCreateDraft,
  NURSE_SELECT_OPTIONS,
  SCORECARD_FIELD_NAMES,
  validateNurseDraft,
} from '../nurses/nurseWorkflow';
import { MAX_LENGTHS } from '../validation';

const ASCII_LETTERS = [...'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'];
const SHORT_TEXT_FIELDS = ['province', 'city', 'contactNumber', 'qualificationInstitution'];
const LONG_TEXT_FIELDS = ['motivations', 'questions', 'notesFlags'];
const CREATE_METADATA_FIELDS = ['ownerId', 'version', 'createdAt', 'updatedAt'];
const UPDATE_METADATA_FIELDS = ['id', ...CREATE_METADATA_FIELDS];

const validNameArb = fc
  .array(fc.constantFrom(...ASCII_LETTERS), { minLength: 1, maxLength: 40 })
  .map((characters) => characters.join(''));

const confirmedStateArb = fc.array(
  fc.record({
    id: fc.uuid().map((id) => `nurse-${id}`),
    fullName: validNameArb,
    version: fc.integer({ min: 1, max: 1000 }),
  }),
  { maxLength: 8 }
);

const invalidNameArb = fc.oneof(
  fc.constantFrom('', ' ', '\t\r\n', '\u0000\u007f'),
  fc
    .integer({ min: MAX_LENGTHS.NAME + 1, max: MAX_LENGTHS.NAME + 80 })
    .map((length) => 'N'.repeat(length))
);

const invalidEmailArb = fc.oneof(
  fc.constantFrom(
    'missing-at.example.com',
    'missing-domain@',
    'missing-tld@example',
    'two@@example.com',
    'space in@email.example'
  ),
  fc
    .integer({ min: MAX_LENGTHS.EMAIL + 1, max: MAX_LENGTHS.EMAIL + 80 })
    .map((length) => `${'e'.repeat(length)}@example.com`)
);

const invalidEnumArb = fc
  .tuple(fc.constantFrom(...Object.keys(NURSE_SELECT_OPTIONS)), fc.uuid())
  .map(([field, token]) => ({ field, value: `unsupported-${token}` }));

const invalidScorecardArb = fc
  .tuple(
    fc.constantFrom(...SCORECARD_FIELD_NAMES),
    fc.oneof(
      fc.integer({ min: -100, max: -1 }),
      fc.integer({ min: 6, max: 100 }),
      fc.constantFrom(0.5, 4.5, Number.NaN, Number.POSITIVE_INFINITY)
    )
  )
  .map(([field, value]) => ({ field, value }));

const invalidEnglishPointsArb = fc.oneof(
  fc.integer({ min: -100, max: -1 }),
  fc.integer({ min: 4, max: 100 }),
  fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY)
);

const invalidEfSetScoreArb = fc.oneof(
  fc.integer({ min: -100, max: -1 }),
  fc.constantFrom(Number.NaN, Number.POSITIVE_INFINITY)
);

const invalidCertificationsArb = fc.oneof(
  fc.constantFrom('not-an-array', 42, { certification: 'ACLS' }),
  fc.constantFrom([''], ['   '], [42]),
  fc
    .integer({ min: MAX_LENGTHS.SHORT_TEXT + 1, max: MAX_LENGTHS.SHORT_TEXT + 80 })
    .map((length) => ['C'.repeat(length)])
);

const invalidCommunicationLogArb = fc.oneof(
  fc.constantFrom('not-an-array', 42, [null], ['not-an-entry']),
  fc.uuid().map((token) => [
    { date: '2026-01-01', channel: `unsupported-${token}`, summary: 'Called nurse' },
  ]),
  fc.constant([{ date: '2026-01-01', channel: 'Email', summary: '   ' }]),
  fc
    .integer({ min: MAX_LENGTHS.LONG_TEXT + 1, max: MAX_LENGTHS.LONG_TEXT + 80 })
    .map((length) => [
      { date: '2026-01-01', channel: 'Phone', summary: 'S'.repeat(length) },
    ]),
  fc
    .integer({ min: MAX_LENGTHS.SHORT_TEXT + 1, max: MAX_LENGTHS.SHORT_TEXT + 80 })
    .map((length) => [
      {
        date: '2026-01-01',
        channel: 'WhatsApp',
        summary: 'Sent message',
        nextAction: 'A'.repeat(length),
      },
    ])
);

const invalidShortTextArb = fc
  .tuple(
    fc.constantFrom(...SHORT_TEXT_FIELDS),
    fc.integer({ min: MAX_LENGTHS.SHORT_TEXT + 1, max: MAX_LENGTHS.SHORT_TEXT + 80 })
  )
  .map(([field, length]) => ({ field, value: 'S'.repeat(length) }));

const invalidLongTextArb = fc
  .tuple(
    fc.constantFrom(...LONG_TEXT_FIELDS),
    fc.integer({ min: MAX_LENGTHS.LONG_TEXT + 1, max: MAX_LENGTHS.LONG_TEXT + 80 })
  )
  .map(([field, length]) => ({ field, value: 'L'.repeat(length) }));

const unknownFieldArb = fc.uuid().map((token) => ({
  field: `unknown_${token.replaceAll('-', '_')}`,
  value: `unsupported-value-${token}`,
}));

const createMetadataArb = fc
  .tuple(fc.constantFrom(...CREATE_METADATA_FIELDS), fc.uuid())
  .map(([field, token]) => ({ field, value: `user-supplied-${token}` }));

const updateMetadataArb = fc
  .tuple(fc.constantFrom(...UPDATE_METADATA_FIELDS), fc.uuid())
  .map(([field, token]) => ({ field, value: `changed-${token}` }));

const invalidInputSetArb = fc.record({
  draftUuid: fc.uuid(),
  fullName: validNameArb,
  confirmedState: confirmedStateArb,
  invalidName: invalidNameArb,
  invalidEmail: invalidEmailArb,
  invalidEnum: invalidEnumArb,
  invalidScorecard: invalidScorecardArb,
  invalidEnglishPoints: invalidEnglishPointsArb,
  invalidEfSetScore: invalidEfSetScoreArb,
  invalidCertifications: invalidCertificationsArb,
  invalidCommunicationLog: invalidCommunicationLogArb,
  invalidShortText: invalidShortTextArb,
  invalidLongText: invalidLongTextArb,
  unknownField: unknownFieldArb,
  createMetadata: createMetadataArb,
  updateMetadata: updateMetadataArb,
});

function submitAfterValidation({ draft, mode = 'create', originalBase = null, write }) {
  const validation = validateNurseDraft(draft, { mode, originalBase });
  if (validation.valid) write(validation.value);
  return validation;
}

function createAuthoritativeBase(draft) {
  const normalized = normalizeNurseCreateDraft(draft);
  expect(normalized.valid).toBe(true);
  return {
    ...normalized.value,
    ownerId: '123e4567-e89b-42d3-a456-426614174099',
    version: 7,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z',
  };
}

describe('Property 15: Invalid or unsupported input causes no write', () => {
  // **Validates: Requirements 4.9, 4.10, 8.1, 8.2, 8.3, 8.4, 8.5, 8.6, 8.7, 8.8, 8.9, 8.10, 8.11, 8.12**
  it('rejects every invalid input category while preserving draft and confirmed state', () => {
    fc.assert(
      fc.property(invalidInputSetArb, (generated) => {
        const validDraft = {
          ...createBlankNurseDraft({
            now: new Date(2026, 0, 9),
            randomUUID: () => generated.draftUuid,
          }),
          fullName: generated.fullName,
          email: 'valid.nurse@example.com',
        };
        const originalBase = createAuthoritativeBase(validDraft);
        const persistenceWrite = vi.fn();
        const confirmedState = structuredClone(generated.confirmedState);
        const confirmedStateSnapshot = structuredClone(confirmedState);

        const createScenarios = [
          { ...validDraft, fullName: generated.invalidName },
          { ...validDraft, email: generated.invalidEmail },
          {
            ...validDraft,
            [generated.invalidEnum.field]: generated.invalidEnum.value,
          },
          {
            ...validDraft,
            scorecardFields: {
              ...validDraft.scorecardFields,
              [generated.invalidScorecard.field]: generated.invalidScorecard.value,
            },
          },
          { ...validDraft, englishPts: generated.invalidEnglishPoints },
          { ...validDraft, efSetScore: generated.invalidEfSetScore },
          {
            ...validDraft,
            additionalCertifications: generated.invalidCertifications,
          },
          { ...validDraft, communicationLog: generated.invalidCommunicationLog },
          {
            ...validDraft,
            [generated.invalidShortText.field]: generated.invalidShortText.value,
          },
          {
            ...validDraft,
            [generated.invalidLongText.field]: generated.invalidLongText.value,
          },
          {
            ...validDraft,
            [generated.unknownField.field]: generated.unknownField.value,
          },
          {
            ...validDraft,
            [generated.createMetadata.field]: generated.createMetadata.value,
          },
        ];

        for (const draft of createScenarios) {
          const draftSnapshot = structuredClone(draft);
          const validation = submitAfterValidation({ draft, write: persistenceWrite });

          expect(validation.valid).toBe(false);
          expect(validation.value).toBeNull();
          expect(validation.firstInvalidField).not.toBeNull();
          expect(draft).toEqual(draftSnapshot);
          expect(confirmedState).toEqual(confirmedStateSnapshot);
        }

        const updateDraft = {
          ...structuredClone(originalBase),
          [generated.updateMetadata.field]: generated.updateMetadata.value,
        };
        const updateDraftSnapshot = structuredClone(updateDraft);
        const updateValidation = submitAfterValidation({
          draft: updateDraft,
          mode: 'update',
          originalBase,
          write: persistenceWrite,
        });

        expect(updateValidation.valid).toBe(false);
        expect(updateValidation.value).toBeNull();
        expect(updateValidation.errors[generated.updateMetadata.field]).toBeDefined();
        expect(updateDraft).toEqual(updateDraftSnapshot);
        expect(originalBase).toEqual(createAuthoritativeBase(validDraft));
        expect(confirmedState).toEqual(confirmedStateSnapshot);
        expect(persistenceWrite).not.toHaveBeenCalled();
      }),
      { numRuns: 100 }
    );
  });
});
