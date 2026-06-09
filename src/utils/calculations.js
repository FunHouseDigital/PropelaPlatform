import { SCORECARD_WEIGHTS, CV_SCORE_WEIGHTS } from '../data/constants.js'

/**
 * Calculate CV Score from pre-interview scorecard components.
 * Formula: (Hospital Exp x3 + SANC x3 + Qualifications x2 + Specialisation x1) / 9
 * Returns score out of 5.
 */
export function calculateCvScore(scorecard) {
  if (!scorecard) return 0

  const { hospitalExp = 0, sancStatus = 0, qualifications = 0, specialisation = 0 } = scorecard
  const totalWeight = CV_SCORE_WEIGHTS.hospitalExp + CV_SCORE_WEIGHTS.sancStatus +
    CV_SCORE_WEIGHTS.qualifications + CV_SCORE_WEIGHTS.specialisation // = 9

  const weightedSum =
    (hospitalExp * CV_SCORE_WEIGHTS.hospitalExp) +
    (sancStatus * CV_SCORE_WEIGHTS.sancStatus) +
    (qualifications * CV_SCORE_WEIGHTS.qualifications) +
    (specialisation * CV_SCORE_WEIGHTS.specialisation)

  return Math.round((weightedSum / totalWeight) * 10) / 10
}

/**
 * Calculate Final Score from all 8 scorecard criteria.
 * Formula: Sum of all weighted scores / 15 = out of 5.0
 */
export function calculateFinalScore(scorecard) {
  if (!scorecard) return 0

  const {
    hospitalExp = 0,
    sancStatus = 0,
    englishProficiency = 0,
    qualifications = 0,
    specialisation = 0,
    validPassport = 0,
    financialReadiness = 0,
    motivation = 0,
  } = scorecard

  const totalWeight = Object.values(SCORECARD_WEIGHTS).reduce((sum, w) => sum + w, 0) // = 15

  const weightedSum =
    (hospitalExp * SCORECARD_WEIGHTS.hospitalExp) +
    (sancStatus * SCORECARD_WEIGHTS.sancStatus) +
    (englishProficiency * SCORECARD_WEIGHTS.englishProficiency) +
    (qualifications * SCORECARD_WEIGHTS.qualifications) +
    (specialisation * SCORECARD_WEIGHTS.specialisation) +
    (validPassport * SCORECARD_WEIGHTS.validPassport) +
    (financialReadiness * SCORECARD_WEIGHTS.financialReadiness) +
    (motivation * SCORECARD_WEIGHTS.motivation)

  return Math.round((weightedSum / totalWeight) * 10) / 10
}

/**
 * Calculate Tier from final score.
 * 4.0-5.0: Tier 1 Priority
 * 3.0-3.9: Tier 1 Standard
 * 2.0-2.9: Tier 2 Development
 * 1.0-1.9: Tier 3
 * Below 1.0: Not Suitable
 */
export function calculateTier(finalScore) {
  if (finalScore >= 4.0) return 'Tier 1 Priority'
  if (finalScore >= 3.0) return 'Tier 1 Standard'
  if (finalScore >= 2.0) return 'Tier 2 Development'
  if (finalScore >= 1.0) return 'Tier 3'
  return 'Not Suitable'
}

/**
 * Calculate Readiness Status from pipeline stage.
 * Not Ready: Applied through OET Registered
 * Placement Ready: OET Passed, Placement Ready
 * Placed: Placed
 * Exit states show their own label.
 */
export function calculateReadinessStatus(pipelineStage) {
  const placementReadyStages = ['OET Passed', 'Placement Ready']
  const placedStages = ['Placed']
  const exitStages = ['Deferred', 'Dropped Out', 'Recommended Pathway', 'Not Selected']

  if (placedStages.includes(pipelineStage)) return 'Placed'
  if (placementReadyStages.includes(pipelineStage)) return 'Placement Ready'
  if (exitStages.includes(pipelineStage)) return pipelineStage
  return 'Not Ready'
}

/**
 * Get colour for Next Action badge based on urgency.
 * Red if overdue, amber if due today, teal if upcoming, grey if no action.
 */
export function getNextActionColour(nextAction, followUpDate) {
  if (!nextAction || nextAction === 'No action required') {
    return { bg: '#F3F4F6', text: '#6B7280' }
  }

  if (!followUpDate) {
    return { bg: '#E0F2F1', text: '#00897B' } // teal - no urgency
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const due = new Date(followUpDate)
  due.setHours(0, 0, 0, 0)

  const diffDays = Math.floor((due - today) / (1000 * 60 * 60 * 24))

  if (diffDays < 0) return { bg: '#FDE8EA', text: '#DC3545' } // red - overdue
  if (diffDays === 0) return { bg: '#FFF3E0', text: '#FF9800' } // amber - due today
  return { bg: '#E0F2F1', text: '#00897B' } // teal - upcoming
}

/**
 * Count [FLAG] occurrences in notes text.
 */
export function getFlagCount(notes) {
  if (!notes) return 0
  const matches = notes.match(/\[FLAG\]/gi)
  return matches ? matches.length : 0
}
