let cohortCounter = 0;

/**
 * Factory function to generate mock cohort objects.
 * Based on the shape from src/data/seedCohorts.js.
 * Pass overrides to customize specific fields.
 */
export function createCohort(overrides = {}) {
  cohortCounter++;
  const id = `cohort-test-${cohortCounter}`;

  return {
    id,
    name: `Cohort ${cohortCounter} - May 2026`,
    status: 'Training',
    sourceCountries: ['South Africa'],
    targetNurses: 10,
    recruitmentOpen: '2025-09-01',
    recruitmentClose: '2025-11-30',
    trainingStart: '2026-01-15',
    trainingEnd: '2026-04-30',
    oetExamDateTarget: '2026-05-17',
    oetResultsExpected: '2026-06-14',
    targetFirstPlacementDate: '2026-09-01',
    trainingProvider: {
      name: 'Lingua Franca Training',
      contact: 'Dr Sarah Mitchell - sarah@linguafranca.co.za',
      format: 'Hybrid',
      costPerNurse: 6000,
      lessonsPlanned: 48,
      formalAssessment: true,
      prePostProficiencyTracking: true,
      perCandidateProgressReports: true,
      examReadinessCriteriaDefined: true,
      providerNotes: 'Excellent track record with healthcare professionals.',
    },
    budget: {
      totalBudget: 90000,
      propelaContribution: 60000,
      trainingCostActual: 54000,
      oetExamCostActual: 22000,
      otherCosts: 4500,
    },
    outcomes: {
      oetPassRateTarget: 80,
      placementRateTarget: 70,
      totalPlacementFees: 0,
      cohortLearnings: '',
    },
    createdAt: '2025-08-15',
    updatedAt: '2026-02-01',
    ...overrides,
  };
}

/**
 * Create multiple cohort objects at once.
 */
export function createCohorts(count, overrides = {}) {
  return Array.from({ length: count }, () => createCohort(overrides));
}
