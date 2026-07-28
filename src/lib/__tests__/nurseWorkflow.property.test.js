import { afterEach, describe, expect, it, vi } from 'vitest';

import { assertProperty, fc } from '../../test/pbt';
import {
  NURSE_BUSINESS_FIELDS,
  NURSE_METADATA_FIELDS,
  diffNurseFields,
  rebaseNurseDraft,
} from '../nurses/nurseWorkflow';

const shortStringArbitrary = fc.string({ maxLength: 40 });
const scorecardArbitrary = fc.record({
  hospitalExp: fc.integer({ min: 0, max: 5 }),
  sancStatus: fc.integer({ min: 0, max: 5 }),
  qualifications: fc.integer({ min: 0, max: 5 }),
  specialisation: fc.integer({ min: 0, max: 5 }),
  financialReadiness: fc.integer({ min: 0, max: 5 }),
  motivation: fc.integer({ min: 0, max: 5 }),
  passport: fc.integer({ min: 0, max: 5 }),
});
const communicationEntryArbitrary = fc.record({
  date: shortStringArbitrary,
  channel: shortStringArbitrary,
  summary: shortStringArbitrary,
  nextAction: shortStringArbitrary,
});

function arbitraryForBusinessField(field) {
  switch (field) {
    case 'scorecardFields':
      return scorecardArbitrary;
    case 'additionalCertifications':
      return fc.array(shortStringArbitrary, { maxLength: 4 });
    case 'communicationLog':
      return fc.array(communicationEntryArbitrary, { maxLength: 4 });
    case 'flags':
    case 'cvScore':
      return fc.integer({ min: 0, max: 100 });
    case 'efSetScore':
    case 'englishPts':
      return fc.oneof(fc.integer({ min: 0, max: 100 }), fc.constant(''));
    case 'finalScore':
      return fc.oneof(fc.integer({ min: 0, max: 100 }), fc.constant(null));
    case 'agreementSigned':
      return fc.boolean();
    default:
      return shortStringArbitrary;
  }
}

const businessArbitraries = Object.fromEntries(
  NURSE_BUSINESS_FIELDS.map((field) => [field, arbitraryForBusinessField(field)])
);

const nurseArbitrary = fc.record({
  ...businessArbitraries,
  id: fc.uuid().map((uuid) => `nurse-${uuid}`),
  ownerId: fc.oneof(fc.uuid(), fc.constant(null)),
  version: fc.integer({ min: 1, max: 10_000 }),
  createdAt: shortStringArbitrary,
  updatedAt: shortStringArbitrary,
});

const locallySelectedFieldsArbitrary = fc.subarray([...NURSE_BUSINESS_FIELDS]);

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('Property 12: Field-level conflict rebase preserves intent', () => {
  // **Validates: Requirements 6.9, 6.11–6.15**
  it('rebases exactly local supported changes onto latest without mutation or persistence', () => {
    const storageWrite = vi.spyOn(Storage.prototype, 'setItem');
    const networkWrite = vi.fn();
    vi.stubGlobal('fetch', networkWrite);

    assertProperty(
      [
        nurseArbitrary,
        nurseArbitrary,
        nurseArbitrary,
        locallySelectedFieldsArbitrary,
        fc.jsonValue(),
        fc.jsonValue(),
      ],
      (original, localCandidate, latest, selectedFields, localOnly, serverOnly) => {
        const local = structuredClone(original);
        for (const field of selectedFields) {
          local[field] = structuredClone(localCandidate[field]);
        }
        for (const field of NURSE_METADATA_FIELDS) {
          local[field] = structuredClone(localCandidate[field]);
        }
        local.localOnly = structuredClone(localOnly);
        latest.serverOnly = structuredClone(serverOnly);

        const originalSnapshot = structuredClone(original);
        const localSnapshot = structuredClone(local);
        const latestSnapshot = structuredClone(latest);
        const locallyChangedFields = diffNurseFields(original, local);

        const rebased = rebaseNurseDraft(original, local, latest);
        const expected = structuredClone(latest);
        for (const field of locallyChangedFields) {
          expected[field] = structuredClone(local[field]);
        }

        expect(rebased).toEqual(expected);
        for (const field of NURSE_BUSINESS_FIELDS) {
          expect(rebased[field]).toEqual(
            locallyChangedFields.includes(field) ? local[field] : latest[field]
          );
        }
        for (const field of NURSE_METADATA_FIELDS) {
          expect(rebased[field]).toEqual(latest[field]);
        }
        expect(rebased.version).toBe(latest.version);
        expect(rebased).not.toHaveProperty('localOnly');
        expect(rebased.serverOnly).toEqual(latest.serverOnly);

        expect(original).toEqual(originalSnapshot);
        expect(local).toEqual(localSnapshot);
        expect(latest).toEqual(latestSnapshot);
        expect(storageWrite).not.toHaveBeenCalled();
        expect(networkWrite).not.toHaveBeenCalled();
      },
      { numRuns: 100 }
    );
  });
});
