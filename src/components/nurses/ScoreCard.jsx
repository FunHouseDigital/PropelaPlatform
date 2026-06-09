import { SCORECARD_WEIGHTS } from '../../data/constants.js'
import { calculateCvScore, calculateFinalScore, calculateTier } from '../../utils/calculations.js'
import StarRating from '../shared/StarRating.jsx'
import Badge from '../shared/Badge.jsx'

const CRITERIA_LABELS = {
  hospitalExp: 'Hospital Experience',
  sancStatus: 'SANC Status',
  englishProficiency: 'English Proficiency',
  qualifications: 'Qualifications',
  specialisation: 'Specialisation',
  validPassport: 'Valid Passport',
  financialReadiness: 'Financial Readiness',
  motivation: 'Motivation',
}

export default function ScoreCard({ scorecard, onUpdate }) {
  const currentScorecard = scorecard || {}

  const cvScore = calculateCvScore(currentScorecard)
  const finalScore = calculateFinalScore(currentScorecard)
  const tier = calculateTier(finalScore)

  const handleScoreChange = (criterion, value) => {
    const numValue = Math.max(0, Math.min(5, parseInt(value) || 0))
    const updated = { ...currentScorecard, [criterion]: numValue }
    onUpdate(updated, {
      cvScore: calculateCvScore(updated),
      finalScore: calculateFinalScore(updated),
      tier: calculateTier(calculateFinalScore(updated)),
    })
  }

  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <h3 className="text-sm font-semibold text-dark mb-4">Scorecard</h3>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {Object.entries(CRITERIA_LABELS).map(([key, label]) => (
          <div key={key} className="flex items-center justify-between gap-3 bg-gray-50 rounded-lg px-3 py-2">
            <div className="flex-1">
              <span className="text-xs font-medium text-dark">{label}</span>
              <span className="text-[10px] text-grey ml-1">(x{SCORECARD_WEIGHTS[key]})</span>
            </div>
            <input
              type="number"
              min="0"
              max="5"
              value={currentScorecard[key] || ''}
              onChange={(e) => handleScoreChange(key, e.target.value)}
              placeholder="0-5"
              className="w-14 text-center text-sm border border-border rounded-md px-1 py-1 focus:outline-none focus:ring-1 focus:ring-purple"
            />
          </div>
        ))}
      </div>

      {/* Results */}
      <div className="mt-5 pt-4 border-t border-border grid grid-cols-3 gap-4">
        <div className="text-center">
          <p className="text-[10px] uppercase font-semibold text-grey mb-1">CV Score</p>
          <StarRating score={cvScore} size={16} />
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase font-semibold text-grey mb-1">Final Score</p>
          <span className="text-xl font-bold text-dark">{finalScore.toFixed(1)}</span>
          <span className="text-xs text-grey"> / 5.0</span>
        </div>
        <div className="text-center">
          <p className="text-[10px] uppercase font-semibold text-grey mb-1">Tier</p>
          <Badge variant="tier">{tier}</Badge>
        </div>
      </div>
    </div>
  )
}
