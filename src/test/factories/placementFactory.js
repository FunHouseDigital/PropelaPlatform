let placementCounter = 0;

/**
 * Reset the placement counter. Useful for test isolation.
 */
export function resetPlacementCounter() {
  placementCounter = 0;
}

/**
 * Generate a unique ID suffix using counter + random component
 * to avoid cross-test collisions even without explicit resets.
 */
function uniqueId() {
  placementCounter++;
  const random = Math.random().toString(36).slice(2, 6);
  return `placement-test-${String(placementCounter).padStart(3, '0')}-${random}`;
}

/**
 * Factory function to generate mock placement objects.
 * Based on the shape from src/data/seedPlacements.js.
 * Pass overrides to customize specific fields.
 */
export function createPlacement(overrides = {}) {
  const id = uniqueId();

  return {
    id,
    nurseId: `nurse-test-${String(placementCounter).padStart(3, '0')}`,
    nurseName: 'Lilian Majola',
    targetCountry: 'UK',
    facilityId: 'uk-001',
    facilityName: 'Royal London Hospital',
    currentStage: 'Ready for Placement',
    daysInStage: 5,
    matchScore: 82,
    specialty: 'Medical/Surgical',
    visaStatus: 'Not Started',
    contractDetails: {
      startDate: '2026-01-15',
      salaryBand: 'Band 5 (GBP 28,407-34,581)',
      role: 'Medical/Surgical Nurse',
    },
    relocationChecklist: [
      { item: 'Accommodation arranged', checked: false },
      { item: 'Bank account opened', checked: false },
      { item: 'NMC registration submitted', checked: false },
      { item: 'Right to work confirmed', checked: false },
      { item: 'Airport pickup scheduled', checked: false },
      { item: 'Orientation date set', checked: false },
      { item: 'Uniform ordered', checked: false },
      { item: 'IT access requested', checked: false },
    ],
    stageHistory: [
      {
        stage: 'Ready for Placement',
        enteredAt: '2025-06-01',
      },
    ],
    ...overrides,
  };
}

/**
 * Create a placed placement (further along in the pipeline).
 */
export function createPlacedPlacement(overrides = {}) {
  return createPlacement({
    currentStage: 'Placed',
    visaStatus: 'Approved',
    relocationChecklist: [
      { item: 'Accommodation arranged', checked: true },
      { item: 'Bank account opened', checked: true },
      { item: 'NMC registration submitted', checked: true },
      { item: 'Right to work confirmed', checked: true },
      { item: 'Airport pickup scheduled', checked: true },
      { item: 'Orientation date set', checked: true },
      { item: 'Uniform ordered', checked: false },
      { item: 'IT access requested', checked: false },
    ],
    stageHistory: [
      { stage: 'Ready for Placement', enteredAt: '2025-03-01' },
      { stage: 'CV Sent', enteredAt: '2025-03-10' },
      { stage: 'Interview Scheduled', enteredAt: '2025-03-20' },
      { stage: 'Offer Received', enteredAt: '2025-04-01' },
      { stage: 'Visa Processing', enteredAt: '2025-04-15' },
      { stage: 'Placed', enteredAt: '2025-05-20' },
    ],
    ...overrides,
  });
}

/**
 * Create multiple placement objects at once.
 */
export function createPlacements(count, overrides = {}) {
  return Array.from({ length: count }, () => createPlacement(overrides));
}
