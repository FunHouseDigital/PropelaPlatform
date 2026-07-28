import {
  calculateCVScore,
  calculateFinalScore,
  calculateReadinessStatus,
  calculateTier,
} from '../calculations';
import {
  NURSE_SELECT_OPTIONS,
  SCORECARD_FIELD_NAMES,
  applyNurseDerivedFields,
  createBlankNurseDraft,
  createNurseDraftId,
  diffNurseFields,
  normalizeNurseCreateDraft,
  normalizeNurseUpdateDraft,
  rebaseNurseDraft,
} from '../nurses/nurseWorkflow';
import { MAX_LENGTHS } from '../validation';

const UUID = '123e4567-e89b-42d3-a456-426614174000';
const OTHER_UUID = '223e4567-e89b-42d3-a456-426614174001';

function blankDraft(overrides = {}) {
  return {
    ...createBlankNurseDraft({
      now: new Date(2026, 0, 9, 23, 30),
      randomUUID: () => UUID,
    }),
    fullName: 'Test Nurse',
    ...overrides,
  };
}

describe('nurse workflow helpers', () => {
  describe('blank create drafts and stable identity', () => {
    it('creates a seed-independent complete blank draft with one retained crypto identity', () => {
      const randomUUID = vi.fn(() => UUID);

      const draft = createBlankNurseDraft({
        now: new Date(2026, 0, 9, 23, 30),
        randomUUID,
      });

      expect(randomUUID).toHaveBeenCalledTimes(1);
      expect(draft).toMatchObject({
        id: `nurse-${UUID}`,
        fullName: '',
        preferredName: '',
        pipelineStage: 'Applied',
        readinessStatus: calculateReadinessStatus('Applied'),
        oetStatus: 'Not Started',
        submittedAt: '2026-01-09',
        flags: 0,
        efSetScore: 0,
        englishPts: 0,
        cvScore: 0,
        finalScore: 0,
        tier: '',
        agreementSigned: false,
        additionalCertifications: [],
        communicationLog: [],
      });
      expect(draft.scorecardFields).toEqual(
        Object.fromEntries(SCORECARD_FIELD_NAMES.map((field) => [field, 0]))
      );
      expect(Object.values(draft)).not.toContain('Emily Plaatjies');

      const normalized = normalizeNurseCreateDraft({ ...draft, fullName: 'New Nurse' });
      expect(normalized.valid).toBe(true);
      expect(normalized.value.id).toBe(draft.id);
      expect(randomUUID).toHaveBeenCalledTimes(1);
    });

    it('requires a cryptographic UUID implementation and prefixes its value', () => {
      expect(createNurseDraftId(() => OTHER_UUID)).toBe(`nurse-${OTHER_UUID}`);
      expect(() => createNurseDraftId(null)).toThrow('cryptographic randomUUID');
    });
  });

  describe('normalization, validation, and derived values', () => {
    it('sanitizes supported values, normalizes numbers, and uses authoritative calculations', () => {
      const source = blankDraft({
        fullName: '  Test\u0000 Nurse  ',
        preferredName: '  Tess\u007f  ',
        email: '  TEST.NURSE@example.com  ',
        pipelineStage: 'Placement Ready',
        englishPts: '2.5',
        efSetScore: '72',
        additionalCertifications: ['  ACLS\u0000  ', 'BLS'],
        communicationLog: [
          {
            date: ' 2026-01-09 ',
            channel: 'Email',
            summary: ' Line 1\r\n\tLine 2\u0000 ',
            nextAction: ' Follow up\u007f ',
          },
        ],
        scorecardFields: {
          hospitalExp: '5',
          sancStatus: 4,
          qualifications: 3,
          specialisation: 2,
          financialReadiness: 1,
          motivation: 5,
          passport: 4,
        },
      });
      const snapshot = structuredClone(source);

      const result = normalizeNurseCreateDraft(source);

      expect(result.valid).toBe(true);
      expect(result.value).toMatchObject({
        id: `nurse-${UUID}`,
        fullName: 'Test Nurse',
        preferredName: 'Tess',
        email: 'TEST.NURSE@example.com',
        pipelineStage: 'Placement Ready',
        readinessStatus: calculateReadinessStatus('Placement Ready'),
        englishPts: 2.5,
        efSetScore: 72,
        additionalCertifications: ['ACLS', 'BLS'],
      });
      expect(result.value.communicationLog[0]).toEqual({
        date: '2026-01-09',
        channel: 'Email',
        summary: 'Line 1\n\tLine 2',
        nextAction: 'Follow up',
      });
      expect(result.value.cvScore).toBe(calculateCVScore(result.value));
      expect(result.value.finalScore).toBe(calculateFinalScore(result.value));
      expect(result.value.tier).toBe(calculateTier(result.value.finalScore));
      expect(source).toEqual(snapshot);
    });

    it.each(Object.keys(NURSE_SELECT_OPTIONS))(
      'rejects a value outside the configured %s option set',
      (field) => {
        const result = normalizeNurseCreateDraft(
          blankDraft({ [field]: 'not-a-configured-option' })
        );

        expect(result.valid).toBe(false);
        expect(result.errors[field]).toBeDefined();
        expect(result.value).toBeNull();
      }
    );

    it('returns field-level errors for unsupported fields, metadata, bounds, arrays, and communication entries', () => {
      const result = normalizeNurseCreateDraft(
        blankDraft({
          ownerId: 'user-controlled-owner',
          unsupportedField: 'not allowed',
          email: `${'a'.repeat(MAX_LENGTHS.EMAIL)}@example.com`,
          englishPts: 3.1,
          efSetScore: -1,
          flags: -1,
          scorecardFields: {
            hospitalExp: 6,
            sancStatus: 0,
            qualifications: 0,
            specialisation: 0,
            financialReadiness: 0,
            motivation: 0,
            passport: 0,
            extra: 1,
          },
          additionalCertifications: ['', 42],
          communicationLog: [
            { date: '', channel: 'SMS', summary: ' ', nextAction: '', extra: true },
          ],
        })
      );

      expect(result.valid).toBe(false);
      expect(result.firstInvalidField).not.toBeNull();
      expect(result.errors).toMatchObject({
        ownerId: expect.any(String),
        unsupportedField: expect.any(String),
        email: expect.any(String),
        englishPts: expect.any(String),
        efSetScore: expect.any(String),
        flags: expect.any(String),
        'scorecardFields.hospitalExp': expect.any(String),
        'scorecardFields.extra': expect.any(String),
        'additionalCertifications.0': expect.any(String),
        'additionalCertifications.1': expect.any(String),
        'communicationLog.0.channel': expect.any(String),
        'communicationLog.0.summary': expect.any(String),
        'communicationLog.0.extra': expect.any(String),
      });
      expect(result.value).toBeNull();
    });

    it('normalizes multiline controls while rejecting text that exceeds configured limits', () => {
      const result = normalizeNurseCreateDraft(
        blankDraft({
          motivations: `  first\r\nsecond\tline\u0000  ${'x'.repeat(MAX_LENGTHS.LONG_TEXT)}`,
          additionalCertifications: ['x'.repeat(MAX_LENGTHS.SHORT_TEXT + 1)],
          communicationLog: [
            {
              date: '',
              channel: 'Phone',
              summary: 'x'.repeat(MAX_LENGTHS.LONG_TEXT + 1),
              nextAction: 'x'.repeat(MAX_LENGTHS.SHORT_TEXT + 1),
            },
          ],
        })
      );

      expect(result.valid).toBe(false);
      expect(result.draft.motivations).not.toContain('\r');
      expect(result.draft.motivations).not.toContain('\u0000');
      expect(result.errors.motivations).toBeDefined();
      expect(result.errors['additionalCertifications.0']).toBeDefined();
      expect(result.errors['communicationLog.0.summary']).toBeDefined();
      expect(result.errors['communicationLog.0.nextAction']).toBeDefined();
    });

    it('recomputes all derived fields instead of trusting submitted values', () => {
      const draft = blankDraft({
        pipelineStage: 'Placed',
        readinessStatus: 'forged',
        englishPts: 3,
        cvScore: 99,
        finalScore: 99,
        tier: 'forged',
        scorecardFields: Object.fromEntries(SCORECARD_FIELD_NAMES.map((field) => [field, 5])),
      });

      const derived = applyNurseDerivedFields(draft);

      expect(derived.readinessStatus).toBe(calculateReadinessStatus('Placed'));
      expect(derived.cvScore).toBe(calculateCVScore(derived));
      expect(derived.finalScore).toBe(calculateFinalScore(derived));
      expect(derived.tier).toBe(calculateTier(derived.finalScore));
    });

    it('allows unchanged authoritative metadata on update and rejects metadata changes', () => {
      const createResult = normalizeNurseCreateDraft(blankDraft());
      const original = {
        ...createResult.value,
        ownerId: '123e4567-e89b-42d3-a456-426614174099',
        version: 4,
        createdAt: '2026-01-01T00:00:00.000Z',
        updatedAt: '2026-01-02T00:00:00.000Z',
      };

      const validUpdate = normalizeNurseUpdateDraft(
        { ...original, preferredName: 'Changed locally' },
        original
      );
      const invalidUpdate = normalizeNurseUpdateDraft(
        { ...original, ownerId: '223e4567-e89b-42d3-a456-426614174099' },
        original
      );

      expect(validUpdate.valid).toBe(true);
      expect(validUpdate.value.preferredName).toBe('Changed locally');
      expect(validUpdate.value.version).toBe(4);
      expect(invalidUpdate.valid).toBe(false);
      expect(invalidUpdate.errors.ownerId).toBeDefined();
    });
  });

  describe('field diff and conflict rebase', () => {
    it('copies only local supported changes onto latest and adopts latest metadata without mutation', () => {
      const normalized = normalizeNurseCreateDraft(blankDraft()).value;
      const original = {
        ...normalized,
        ownerId: 'owner-1',
        version: 2,
        createdAt: 'created',
        updatedAt: 'old-update',
      };
      const local = {
        ...structuredClone(original),
        preferredName: 'Local preference',
        scorecardFields: { ...original.scorecardFields, motivation: 5 },
      };
      const latest = {
        ...structuredClone(original),
        fullName: 'Server Name',
        city: 'Server City',
        ownerId: 'owner-1',
        version: 7,
        updatedAt: 'latest-update',
      };
      const snapshots = [original, local, latest].map((value) => structuredClone(value));

      const changedFields = diffNurseFields(original, local);
      const rebased = rebaseNurseDraft(original, local, latest);

      expect(changedFields).toEqual(['preferredName', 'scorecardFields']);
      expect(rebased).toMatchObject({
        fullName: 'Server Name',
        preferredName: 'Local preference',
        city: 'Server City',
        version: 7,
        updatedAt: 'latest-update',
      });
      expect(rebased.scorecardFields.motivation).toBe(5);
      expect(rebased.scorecardFields).not.toBe(local.scorecardFields);
      expect([original, local, latest]).toEqual(snapshots);
    });
  });
});
