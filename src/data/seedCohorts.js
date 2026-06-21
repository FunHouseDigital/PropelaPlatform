/**
 * Seed data for Cohort 1 - May 2026
 * Per PRD Section 9.2
 */
export function seedCohorts() {
  return [
    {
      id: 'cohort-1',
      name: 'Cohort 1 - May 2026',
      status: 'Training',
      sourceCountries: ['South Africa'],
      targetNurses: 10,
      // Timeline
      recruitmentOpen: '2025-09-01',
      recruitmentClose: '2025-11-30',
      trainingStart: '2026-01-15',
      trainingEnd: '2026-04-30',
      oetExamDateTarget: '2026-05-17',
      oetResultsExpected: '2026-06-14',
      targetFirstPlacementDate: '2026-09-01',
      // Training Provider
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
        providerNotes: 'Excellent track record with healthcare professionals. Specialises in OET preparation for nursing candidates. 85% first-attempt pass rate across all cohorts.',
      },
      // Budget (ZAR)
      budget: {
        totalBudget: 90000,
        propelaContribution: 60000,
        trainingCostActual: 54000,
        oetExamCostActual: 22000,
        otherCosts: 4500,
      },
      // Outcomes
      outcomes: {
        oetPassRateTarget: 80,
        placementRateTarget: 70,
        totalPlacementFees: 0,
        cohortLearnings: '',
      },
      // Metadata
      createdAt: '2025-08-15',
      updatedAt: '2026-02-01',
    },
  ];
}
