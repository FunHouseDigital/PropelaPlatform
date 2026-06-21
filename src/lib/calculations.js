/**
 * Calculate CV Score from pre-interview components.
 * Formula: (Hospital Exp x3 + SANC Status x3 + Qualifications x2 + Specialisation x1) / 9
 * Result: 0-5 scale
 */
export function calculateCVScore(nurse) {
  const scorecard = nurse.scorecardFields || {};
  const hospitalExp = scorecard.hospitalExp || 0;
  const sancStatus = scorecard.sancStatus || 0;
  const qualifications = scorecard.qualifications || 0;
  const specialisation = scorecard.specialisation || 0;

  const weightedSum =
    hospitalExp * 3 +
    sancStatus * 3 +
    qualifications * 2 +
    specialisation * 1;

  const totalWeight = 3 + 3 + 2 + 1; // = 9

  if (totalWeight === 0) return 0;
  const score = weightedSum / totalWeight;
  return Math.round(score * 10) / 10; // 1 decimal place
}

/**
 * Calculate Final Score from all 8 criteria.
 * Formula: (Hospital Exp x3 + SANC Status x3 + English Proficiency x2 + Qualifications x2 +
 *           Specialisation x1 + Valid Passport x1 + Financial Readiness x1 + Motivation x2) / 15
 * Result: 0-5 scale
 */
export function calculateFinalScore(nurse) {
  const scorecard = nurse.scorecardFields || {};
  const hospitalExp = scorecard.hospitalExp || 0;
  const sancStatus = scorecard.sancStatus || 0;
  const qualifications = scorecard.qualifications || 0;
  const specialisation = scorecard.specialisation || 0;
  const financialReadiness = scorecard.financialReadiness || 0;
  const motivation = scorecard.motivation || 0;
  const passport = scorecard.passport || 0;

  // English Proficiency auto from English Pts field
  const englishProficiency = nurse.englishPts || 0;

  const weightedSum =
    hospitalExp * 3 +
    sancStatus * 3 +
    englishProficiency * 2 +
    qualifications * 2 +
    specialisation * 1 +
    passport * 1 +
    financialReadiness * 1 +
    motivation * 2;

  const totalWeight = 3 + 3 + 2 + 2 + 1 + 1 + 1 + 2; // = 15

  if (totalWeight === 0) return 0;
  const score = weightedSum / totalWeight;
  return Math.round(score * 10) / 10; // 1 decimal place
}

/**
 * Calculate Tier based on Final Score.
 * 4.0 - 5.0 = Tier 1 Priority
 * 3.0 - 3.9 = Tier 1 Standard
 * 2.0 - 2.9 = Tier 2 Development
 * 1.0 - 1.9 = Tier 3
 * Below 1.0 = Not Suitable
 */
export function calculateTier(finalScore) {
  if (finalScore >= 4.0) return 'Tier 1 Priority';
  if (finalScore >= 3.0) return 'Tier 1 Standard';
  if (finalScore >= 2.0) return 'Tier 2 Development';
  if (finalScore >= 1.0) return 'Tier 3';
  return 'Not Suitable';
}

/**
 * Calculate Readiness Status from pipeline stage (Section 7.3 / Appendix B).
 * - Applied through OET Registered = Not Ready
 * - OET Passed, Placement Ready = Placement Ready
 * - Placed = Placed
 * - Exit states show their own label
 */
export function calculateReadinessStatus(pipelineStage) {
  const notReadyStages = [
    'Applied',
    'CV Submitted',
    'CV + English Submitted',
    'Under Review',
    'Shortlisted - Yes',
    'Shortlisted - Maybe',
    'Not Selected',
    "Didn't Qualify",
    'Selected for Cohort',
    'Reserve',
    'Cohort Confirmed',
    'Training Active',
    'OET Registered',
    'OET Failed',
  ];

  const placementReadyStages = ['OET Passed', 'Placement Ready'];
  const placedStages = ['Placed'];
  const exitStates = ['Deferred', 'Dropped Out', 'Recommended Pathway'];

  if (placedStages.includes(pipelineStage)) return 'Placed';
  if (placementReadyStages.includes(pipelineStage)) return 'Placement Ready';
  if (exitStates.includes(pipelineStage)) return pipelineStage;
  if (notReadyStages.includes(pipelineStage)) return 'Not Ready';

  return 'Not Ready';
}
