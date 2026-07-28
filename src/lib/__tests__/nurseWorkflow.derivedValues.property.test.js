import { describe, expect, it } from 'vitest';

import { assertProperty, fc } from '../../test/pbt';
import {
  calculateCVScore,
  calculateFinalScore,
  calculateReadinessStatus,
  calculateTier,
} from '../calculations';
import { PIPELINE_STAGES } from '../constants';
import {
  createBlankNurseDraft,
  normalizeNurseCreateDraft,
} from '../nurses/nurseWorkflow';

const scorecardArbitrary = fc.record({
  hospitalExp: fc.integer({ min: 0, max: 5 }),
  sancStatus: fc.integer({ min: 0, max: 5 }),
  qualifications: fc.integer({ min: 0, max: 5 }),
  specialisation: fc.integer({ min: 0, max: 5 }),
  financialReadiness: fc.integer({ min: 0, max: 5 }),
  motivation: fc.integer({ min: 0, max: 5 }),
  passport: fc.integer({ min: 0, max: 5 }),
});

const validDerivedInputArbitrary = fc.record({
  draftUuid: fc.uuid(),
  pipelineStage: fc.constantFrom(...PIPELINE_STAGES),
  scorecardFields: scorecardArbitrary,
  englishPts: fc.integer({ min: 0, max: 300 }).map((points) => points / 100),
});

describe('Property 16: Derived fields equal authoritative helper outputs', () => {
  // **Validates: Requirements 8.13, 8.14, and 8.15**
  it('derives persistence-ready readiness and score values only through authoritative helpers', () => {
    assertProperty(
      validDerivedInputArbitrary,
      ({ draftUuid, pipelineStage, scorecardFields, englishPts }) => {
        const draft = {
          ...createBlankNurseDraft({
            now: new Date(2026, 0, 9),
            randomUUID: () => draftUuid,
          }),
          fullName: 'Generated Nurse',
          pipelineStage,
          scorecardFields,
          englishPts,
          readinessStatus: 'untrusted readiness',
          cvScore: 999,
          finalScore: 999,
          tier: 'untrusted tier',
        };

        const result = normalizeNurseCreateDraft(draft);
        const authoritativeInput = { scorecardFields, englishPts };
        const expectedFinalScore = calculateFinalScore(authoritativeInput);

        expect(result.valid).toBe(true);
        expect(result.value).toMatchObject({
          readinessStatus: calculateReadinessStatus(pipelineStage),
          cvScore: calculateCVScore(authoritativeInput),
          finalScore: expectedFinalScore,
          tier: calculateTier(expectedFinalScore),
        });
      },
      { numRuns: 100 }
    );
  });
});
