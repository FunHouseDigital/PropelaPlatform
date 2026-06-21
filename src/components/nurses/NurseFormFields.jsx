import {
  PIPELINE_STAGES,
  NEXT_ACTION_VALUES,
  SPECIALTIES,
  PROVINCES,
  QUALIFICATION_TYPES,
  YEARS_EXPERIENCE,
  OET_STATUSES,
  COMMITMENT_FEE_STATUSES,
  SHORTLIST_DECISIONS,
  SOURCE_OPTIONS,
  SANC_APC_STATUSES,
  EFSET_LEVELS,
  GENDERS,
  AGE_GROUPS,
  EMPLOYMENT_STATUSES,
} from '../../lib/constants';

/**
 * Reusable form field components for nurse card edit mode.
 * Dropdowns use constants from src/lib/constants.js.
 * Scorecard fields show weight multiplier next to each criterion.
 */

export function SelectField({ label, value, options, onChange, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs text-gray-500 font-medium">{label}</label>}
      <select
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
      >
        <option value="">-- Select --</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  );
}

export function TextField({ label, value, onChange, type = 'text', placeholder = '', className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs text-gray-500 font-medium">{label}</label>}
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
      />
    </div>
  );
}

export function TextAreaField({ label, value, onChange, rows = 3, className = '' }) {
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      {label && <label className="text-xs text-gray-500 font-medium">{label}</label>}
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple resize-none"
      />
    </div>
  );
}

export function ScorecardInput({ label, weight, value, onChange }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-sm text-gray-700 w-44 shrink-0">
        {label} <span className="text-xs text-gray-400">(x{weight})</span>
      </span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onChange(n)}
            className={`w-8 h-8 rounded-md text-sm font-medium border transition-colors ${
              value === n
                ? 'bg-propela-purple text-white border-propela-purple'
                : 'bg-white text-gray-600 border-gray-200 hover:border-propela-purple-mid'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
      {value && (
        <span className="text-xs text-gray-400 ml-1">
          Weighted: {value * weight}
        </span>
      )}
    </div>
  );
}

/**
 * Field config for dropdowns (maps field names to their option lists).
 */
export const FIELD_OPTIONS = {
  pipelineStage: PIPELINE_STAGES,
  nextAction: NEXT_ACTION_VALUES,
  primaryClinicalSpecialty: SPECIALTIES,
  province: PROVINCES,
  highestQualification: QUALIFICATION_TYPES,
  yearsOfClinicalExperience: YEARS_EXPERIENCE,
  oetStatus: OET_STATUSES,
  commitmentFeeStatus: COMMITMENT_FEE_STATUSES,
  shortlistDecision: SHORTLIST_DECISIONS,
  source: SOURCE_OPTIONS,
  sancAPCStatus: SANC_APC_STATUSES,
  efSetLevel: EFSET_LEVELS,
  gender: GENDERS,
  ageGroup: AGE_GROUPS,
  employmentStatus: EMPLOYMENT_STATUSES,
};

/**
 * Scorecard criteria config with weights.
 */
export const SCORECARD_CRITERIA = [
  { key: 'hospitalExp', label: 'Hospital Experience', weight: 3 },
  { key: 'sancStatus', label: 'SANC Status', weight: 3 },
  { key: 'qualifications', label: 'Qualifications', weight: 2 },
  { key: 'specialisation', label: 'Specialisation', weight: 1 },
  { key: 'financialReadiness', label: 'Financial Readiness', weight: 1 },
  { key: 'motivation', label: 'Motivation', weight: 2 },
  { key: 'passport', label: 'Valid Passport', weight: 1 },
];
