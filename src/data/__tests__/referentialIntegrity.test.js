import { describe, expect, it } from 'vitest';

import { seedNurses } from '../seedNurses';
import { seedPlacements } from '../seedPlacements';
import { seedDocuments } from '../seedDocuments';

/**
 * Referential-integrity guard for the seed generators.
 *
 * The Supabase schema (supabase/migrations/0001_core_schema.sql) enforces:
 *   - placements.nurse_id  → nurses(id)  (FK, ON DELETE RESTRICT)
 *   - documents.nurse_id   → nurses(id)  (FK, ON DELETE CASCADE)
 *
 * These tests assert, against the REAL seed output, that every nurse reference
 * emitted by the placement and document generators points at an EXISTING nurse,
 * so the migration loads cleanly. Placement facilities are DESTINATION
 * facilities (UK/Ireland, in the uk- / ie- namespace) and are intentionally NOT
 * part of the SA acquisition `facilities` table — so `facility_id` is a plain
 * column, validated here only for its expected destination namespace.
 */
describe('seed referential integrity', () => {
  const nurses = seedNurses();
  const nurseIds = new Set(nurses.map((n) => n.id));
  const nurseNameById = new Map(nurses.map((n) => [n.id, n.fullName]));

  it('produces a non-empty set of nurse ids', () => {
    expect(nurseIds.size).toBeGreaterThan(0);
  });

  describe('placements → nurses', () => {
    const placements = seedPlacements();

    it('every placement.nurseId references an existing nurse', () => {
      for (const p of placements) {
        expect(nurseIds.has(p.nurseId)).toBe(true);
      }
    });

    it('every placement.nurseName matches the referenced nurse fullName', () => {
      for (const p of placements) {
        expect(p.nurseName).toBe(nurseNameById.get(p.nurseId));
      }
    });

    it('every placement.facilityId is a UK/Ireland destination (uk-*/ie-*)', () => {
      for (const p of placements) {
        expect(p.facilityId).toMatch(/^(uk|ie)-\d+$/);
      }
    });
  });

  describe('documents → nurses', () => {
    const { documents, verificationQueue } = seedDocuments();

    it('every document.nurseId references an existing nurse', () => {
      for (const d of documents) {
        expect(nurseIds.has(d.nurseId)).toBe(true);
      }
    });

    it('every verificationQueue entry.nurseId references an existing nurse', () => {
      for (const vq of verificationQueue) {
        expect(nurseIds.has(vq.nurseId)).toBe(true);
      }
    });
  });
});
