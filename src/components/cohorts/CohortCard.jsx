import { useState, useMemo } from 'react';
import {
  X,
  Calendar,
  DollarSign,
  Users,
  GraduationCap,
  Target,
  BookOpen,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';
import { COHORT_STATUSES } from '../../lib/constants';
import { getNurses, saveCohorts, getCohorts } from '../../lib/storage';
import { sanitizeText, MAX_LENGTHS } from '../../lib/validation';
import CohortNurseTable from './CohortNurseTable';

function Section({ title, icon: Icon, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 py-3 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {Icon && <Icon size={16} className="text-propela-purple" />}
        {title}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function getStatusColor(status) {
  switch (status) {
    case 'Planning': return 'bg-gray-100 text-gray-700';
    case 'Recruiting': return 'bg-blue-100 text-blue-700';
    case 'Training': return 'bg-amber-100 text-amber-700';
    case 'OET Prep': return 'bg-purple-100 text-purple-700';
    case 'Exam Window': return 'bg-orange-100 text-orange-700';
    case 'Placement': return 'bg-green-100 text-green-700';
    case 'Closed': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function formatCurrency(amount) {
  if (!amount && amount !== 0) return '-';
  return 'R ' + Number(amount).toLocaleString('en-ZA');
}

export default function CohortCard({ cohort, onClose, onUpdate }) {
  const [data, setData] = useState(cohort);

  const cohortNurses = useMemo(() => {
    const allNurses = getNurses();
    return allNurses.filter((n) => n.cohortAssigned === data.name);
  }, [data.name]);

  const enrolledCount = cohortNurses.filter(
    (n) => !['Reserve', 'Not Selected', "Didn't Qualify", 'Dropped Out'].includes(n.pipelineStage)
  ).length;

  const reserveCount = cohortNurses.filter((n) => n.pipelineStage === 'Reserve').length;

  // Auto-calc budget fields
  const commitmentFeesCollected = cohortNurses.filter(
    (n) => n.commitmentFeeStatus === 'Paid'
  ).length * 2500; // R2,500 per nurse

  const totalSpent = (data.budget.trainingCostActual || 0) +
    (data.budget.oetExamCostActual || 0) +
    (data.budget.otherCosts || 0);

  const budgetRemaining = (data.budget.totalBudget || 0) - totalSpent;

  // OET outcomes
  const oetPassedCount = cohortNurses.filter((n) => n.oetStatus === 'Passed').length;
  const oetAttempted = cohortNurses.filter((n) => ['Passed', 'Failed'].includes(n.oetStatus)).length;
  const oetPassRateActual = oetAttempted > 0 ? Math.round((oetPassedCount / oetAttempted) * 100) : 0;

  const placedCount = cohortNurses.filter((n) => n.pipelineStage === 'Placed').length;
  const placementRateActual = enrolledCount > 0 ? Math.round((placedCount / enrolledCount) * 100) : 0;

  function updateField(path, value) {
    // Sanitize free-text edits (control-char strip + length cap) before they
    // are written to state/localStorage. trim:false preserves inline typing;
    // non-string values (numbers, arrays, booleans) pass through untouched.
    const cleanValue = typeof value === 'string'
      ? sanitizeText(value, { maxLength: MAX_LENGTHS.LONG_TEXT, trim: false })
      : value;
    const newData = { ...data };
    const parts = path.split('.');
    if (parts.length === 1) {
      newData[parts[0]] = cleanValue;
    } else if (parts.length === 2) {
      newData[parts[0]] = { ...newData[parts[0]], [parts[1]]: cleanValue };
    }
    setData(newData);

    // Save to localStorage
    const cohorts = getCohorts();
    const idx = cohorts.findIndex((c) => c.id === data.id);
    if (idx !== -1) {
      cohorts[idx] = newData;
      saveCohorts(cohorts);
    }
    if (onUpdate) onUpdate(newData);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative h-full w-full max-w-3xl bg-white shadow-xl overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">{data.name}</h2>
            <div className="flex items-center gap-3 mt-1">
              <select
                value={data.status}
                onChange={(e) => updateField('status', e.target.value)}
                className={`text-xs font-medium px-2.5 py-0.5 rounded-full border-0 cursor-pointer ${getStatusColor(data.status)}`}
              >
                {COHORT_STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <span className="text-sm text-gray-500">
                {enrolledCount}/{data.targetNurses} enrolled
                {reserveCount > 0 && ` + ${reserveCount} reserve`}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="divide-y divide-gray-100">
          {/* Identity & Status */}
          <Section title="Identity & Status" icon={Users} defaultOpen={true}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Cohort Name</label>
                <input
                  type="text"
                  value={data.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Source Countries</label>
                <input
                  type="text"
                  value={(data.sourceCountries || []).join(', ')}
                  onChange={(e) => updateField('sourceCountries', e.target.value.split(',').map((s) => s.trim()))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Target Nurses</label>
                <input
                  type="number"
                  value={data.targetNurses}
                  onChange={(e) => updateField('targetNurses', parseInt(e.target.value) || 0)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Enrolled (auto)</label>
                  <div className="text-sm font-medium text-gray-900 px-3 py-1.5 bg-gray-50 rounded-lg">{enrolledCount}</div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Reserve (auto)</label>
                  <div className="text-sm font-medium text-gray-900 px-3 py-1.5 bg-gray-50 rounded-lg">{reserveCount}</div>
                </div>
              </div>
            </div>
          </Section>

          {/* Timeline */}
          <Section title="Timeline" icon={Calendar}>
            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Recruitment Open', field: 'recruitmentOpen' },
                { label: 'Recruitment Close', field: 'recruitmentClose' },
                { label: 'Training Start', field: 'trainingStart' },
                { label: 'Training End', field: 'trainingEnd' },
                { label: 'OET Exam Date Target', field: 'oetExamDateTarget' },
                { label: 'OET Results Expected', field: 'oetResultsExpected' },
                { label: 'Target First Placement Date', field: 'targetFirstPlacementDate' },
              ].map(({ label, field }) => (
                <div key={field}>
                  <label className="text-xs font-medium text-gray-500 block mb-1">{label}</label>
                  <input
                    type="date"
                    value={data[field] || ''}
                    onChange={(e) => updateField(field, e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
              ))}
            </div>
          </Section>

          {/* Training Provider */}
          <Section title="Training Provider" icon={BookOpen}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Provider Name</label>
                <input
                  type="text"
                  value={data.trainingProvider?.name || ''}
                  onChange={(e) => updateField('trainingProvider.name', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Contact</label>
                <input
                  type="text"
                  value={data.trainingProvider?.contact || ''}
                  onChange={(e) => updateField('trainingProvider.contact', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Format</label>
                <select
                  value={data.trainingProvider?.format || ''}
                  onChange={(e) => updateField('trainingProvider.format', e.target.value)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                >
                  <option value="">Select...</option>
                  <option value="In-person">In-person</option>
                  <option value="Remote">Remote</option>
                  <option value="Hybrid">Hybrid</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Cost per Nurse (ZAR)</label>
                <input
                  type="number"
                  value={data.trainingProvider?.costPerNurse || ''}
                  onChange={(e) => updateField('trainingProvider.costPerNurse', parseInt(e.target.value) || 0)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Total Cost (auto)</label>
                <div className="text-sm font-medium text-gray-900 px-3 py-1.5 bg-gray-50 rounded-lg">
                  {formatCurrency((data.trainingProvider?.costPerNurse || 0) * enrolledCount)}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Lessons Planned</label>
                <input
                  type="number"
                  value={data.trainingProvider?.lessonsPlanned || ''}
                  onChange={(e) => updateField('trainingProvider.lessonsPlanned', parseInt(e.target.value) || 0)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
            </div>

            {/* Assessment checkboxes */}
            <div className="mt-4 space-y-2">
              <p className="text-xs font-medium text-gray-500 mb-2">Quality Checkboxes</p>
              {[
                { field: 'formalAssessment', label: 'Formal Assessment' },
                { field: 'prePostProficiencyTracking', label: 'Pre/Post Proficiency Tracking' },
                { field: 'perCandidateProgressReports', label: 'Per-Candidate Progress Reports' },
                { field: 'examReadinessCriteriaDefined', label: 'Exam Readiness Criteria Defined' },
              ].map(({ field, label }) => (
                <label key={field} className="flex items-center gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    checked={data.trainingProvider?.[field] || false}
                    onChange={(e) => updateField(`trainingProvider.${field}`, e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 text-propela-purple focus:ring-propela-purple"
                  />
                  <span className="flex items-center gap-1">
                    {!data.trainingProvider?.[field] && (
                      <AlertTriangle size={12} className="text-amber-500" />
                    )}
                    {data.trainingProvider?.[field] && (
                      <CheckCircle2 size={12} className="text-green-500" />
                    )}
                    [!] {label}
                  </span>
                </label>
              ))}
            </div>

            {/* Provider Notes */}
            <div className="mt-4">
              <label className="text-xs font-medium text-gray-500 block mb-1">Provider Notes</label>
              <textarea
                value={data.trainingProvider?.providerNotes || ''}
                onChange={(e) => updateField('trainingProvider.providerNotes', e.target.value)}
                rows={3}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple resize-none"
              />
            </div>
          </Section>

          {/* Budget */}
          <Section title="Budget" icon={DollarSign}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Total Budget</label>
                <input
                  type="number"
                  value={data.budget?.totalBudget || ''}
                  onChange={(e) => updateField('budget.totalBudget', parseInt(e.target.value) || 0)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Propela Contribution</label>
                <input
                  type="number"
                  value={data.budget?.propelaContribution || ''}
                  onChange={(e) => updateField('budget.propelaContribution', parseInt(e.target.value) || 0)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Commitment Fees Collected (auto)</label>
                <div className="text-sm font-medium text-gray-900 px-3 py-1.5 bg-gray-50 rounded-lg">
                  {formatCurrency(commitmentFeesCollected)}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Training Cost Actual</label>
                <input
                  type="number"
                  value={data.budget?.trainingCostActual || ''}
                  onChange={(e) => updateField('budget.trainingCostActual', parseInt(e.target.value) || 0)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">OET Exam Cost Actual</label>
                <input
                  type="number"
                  value={data.budget?.oetExamCostActual || ''}
                  onChange={(e) => updateField('budget.oetExamCostActual', parseInt(e.target.value) || 0)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Other Costs</label>
                <input
                  type="number"
                  value={data.budget?.otherCosts || ''}
                  onChange={(e) => updateField('budget.otherCosts', parseInt(e.target.value) || 0)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Total Spent (auto)</label>
                <div className="text-sm font-medium text-gray-900 px-3 py-1.5 bg-gray-50 rounded-lg">
                  {formatCurrency(totalSpent)}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Budget Remaining (auto)</label>
                <div className={`text-sm font-medium px-3 py-1.5 rounded-lg ${budgetRemaining >= 0 ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                  {formatCurrency(budgetRemaining)}
                </div>
              </div>
            </div>
          </Section>

          {/* Outcomes */}
          <Section title="Outcomes" icon={Target}>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">OET Pass Rate Target (%)</label>
                <input
                  type="number"
                  value={data.outcomes?.oetPassRateTarget || 80}
                  onChange={(e) => updateField('outcomes.oetPassRateTarget', parseInt(e.target.value) || 0)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">OET Pass Rate Actual (auto)</label>
                <div className={`text-sm font-medium px-3 py-1.5 rounded-lg ${oetPassRateActual >= (data.outcomes?.oetPassRateTarget || 80) ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {oetPassRateActual}%
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Placement Rate Target (%)</label>
                <input
                  type="number"
                  value={data.outcomes?.placementRateTarget || 70}
                  onChange={(e) => updateField('outcomes.placementRateTarget', parseInt(e.target.value) || 0)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Placement Rate Actual (auto)</label>
                <div className={`text-sm font-medium px-3 py-1.5 rounded-lg ${placementRateActual >= (data.outcomes?.placementRateTarget || 70) ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                  {placementRateActual}%
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Total Placement Fees</label>
                <input
                  type="number"
                  value={data.outcomes?.totalPlacementFees || ''}
                  onChange={(e) => updateField('outcomes.totalPlacementFees', parseInt(e.target.value) || 0)}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
            </div>
            <div className="mt-4">
              <label className="text-xs font-medium text-gray-500 block mb-1">Cohort Learnings</label>
              <textarea
                value={data.outcomes?.cohortLearnings || ''}
                onChange={(e) => updateField('outcomes.cohortLearnings', e.target.value)}
                rows={4}
                placeholder="Document key learnings from this cohort for future improvement..."
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple resize-none"
              />
            </div>
          </Section>

          {/* Nurse Progress Table */}
          <Section title={`Nurses (${cohortNurses.length})`} icon={GraduationCap} defaultOpen={true}>
            <CohortNurseTable cohortName={data.name} onNurseUpdate={() => {}} />
          </Section>
        </div>
      </div>
    </div>
  );
}
