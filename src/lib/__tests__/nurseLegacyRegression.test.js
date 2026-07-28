import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import * as storageAdapter from '../dataLayer/storageAdapter';
import { getNurses, initializeData, saveNurses } from '../storage';
import { STORAGE_PREFIX } from '../storageKeys';

/**
 * Final nurse-management regressions for the public legacy storage surface.
 *
 * **Validates: Requirements 10.2, 10.3, 10.4, 10.5, 10.6**
 */
describe('legacy nurse storage regressions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('initializeData, getNurses, and saveNurses preserve legacy seed and refresh semantics', () => {
    expect(getNurses()).toEqual([]);

    initializeData();

    const seeded = getNurses();
    expect(seeded).toHaveLength(7);
    expect(seeded.map(({ id }) => id)).toEqual([
      'nurse-001',
      'nurse-002',
      'nurse-003',
      'nurse-004',
      'nurse-005',
      'nurse-006',
      'nurse-007',
    ]);
    expect(seeded.every((nurse) => 'fullName' in nurse)).toBe(true);
    expect(seeded.every((nurse) => !('full_name' in nurse))).toBe(true);

    const persisted = [
      {
        id: 'legacy-custom-1',
        fullName: 'Legacy Custom Nurse',
        pipelineStage: 'Screening',
        scorecardFields: { hospitalExp: 4 },
        additionalCertifications: ['Critical Care'],
      },
    ];
    saveNurses(persisted);

    expect(getNurses()).toEqual(persisted);

    // A browser refresh runs initialization again. A non-empty persisted
    // collection remains authoritative and is not replaced by bundled samples.
    initializeData();
    expect(getNurses()).toEqual(persisted);
  });

  it('keeps the last persisted collection when a legacy adapter write fails', async () => {
    const persisted = [{ id: 'legacy-stable', fullName: 'Stable Nurse' }];
    const unsaved = [{ id: 'legacy-unsaved', fullName: 'Unsaved Nurse' }];
    saveNurses(persisted);

    const originalSetItem = localStorage.setItem.bind(localStorage);
    vi.spyOn(localStorage, 'setItem').mockImplementation((key, value) => {
      if (key === `${STORAGE_PREFIX}nurses`) {
        throw new DOMException('Quota exceeded', 'QuotaExceededError');
      }
      return originalSetItem(key, value);
    });

    const result = await storageAdapter.saveCollection('nurses', unsaved);

    expect(result.data).toBeNull();
    expect(result.error?.code).toBe('STORAGE');
    expect(getNurses()).toEqual(persisted);
  });
});
