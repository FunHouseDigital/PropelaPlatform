import { useState } from 'react';
import {
  X,
  MapPin,
  Phone,
  Mail,
  Calendar,
  Flag,
  MessageSquare,
  ChevronDown,
  ChevronRight,
  Plus,
  Star,
  StarHalf,
} from 'lucide-react';
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
import { calculateCVScore, calculateFinalScore, calculateTier, calculateReadinessStatus } from '../../lib/calculations';
import { useDebounce } from '../../hooks/useDebounce';

function getNextActionColor(nurse) {
  if (!nurse.nextAction || nurse.nextAction === 'No action required') {
    return { bg: 'bg-gray-100', text: 'text-gray-600', border: 'border-gray-200' };
  }
  if (nurse.nextActionDueDate) {
    const due = new Date(nurse.nextActionDueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    due.setHours(0, 0, 0, 0);
    if (due < today) return { bg: 'bg-red-50', text: 'text-red-700', border: 'border-red-200' };
    if (due.getTime() === today.getTime()) return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
  }
  return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' };
}

function renderStars(score) {
  const stars = [];
  const fullStars = Math.floor(score);
  const hasHalf = score - fullStars >= 0.3 && score - fullStars < 0.8;
  const fullExtra = score - fullStars >= 0.8 ? 1 : 0;

  for (let i = 0; i < fullStars + fullExtra; i++) {
    stars.push(<Star key={`full-${i}`} size={14} className="fill-amber-400 text-amber-400" />);
  }
  if (hasHalf) {
    stars.push(<StarHalf key="half" size={14} className="fill-amber-400 text-amber-400" />);
  }
  const remaining = 5 - (fullStars + fullExtra + (hasHalf ? 1 : 0));
  for (let i = 0; i < remaining; i++) {
    stars.push(<Star key={`empty-${i}`} size={14} className="text-gray-300" />);
  }
  return stars;
}

function Section({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 py-3 px-4 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {title}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function FieldRow({ label, value, children }) {
  return (
    <div className="flex items-start py-1.5">
      <span className="text-xs text-gray-500 w-40 shrink-0">{label}</span>
      <span className="text-sm text-gray-900 flex-1">{children || value || '-'}</span>
    </div>
  );
}

function EditableSelect({ value, options, onChange, className = '' }) {
  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`text-sm border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-propela-purple ${className}`}
    >
      <option value="">-- Select --</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  );
}

function ScorecardField({ label, weight, value, onChange }) {
  return (
    <div className="flex items-center gap-2 py-1">
      <span className="text-xs text-gray-600 w-36 shrink-0">
        {label} <span className="text-gray-400">(x{weight})</span>
      </span>
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => onChange(n)}
            className={`w-7 h-7 rounded text-xs font-medium border ${
              value === n
                ? 'bg-propela-purple text-white border-propela-purple'
                : 'bg-white text-gray-600 border-gray-200 hover:border-propela-purple-mid'
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function NurseCard({ nurse, onClose, onUpdate }) {
  const [localNurse, setLocalNurse] = useState({ ...nurse });
  const [showAddComm, setShowAddComm] = useState(false);
  const [commForm, setCommForm] = useState({ channel: 'Email', summary: '', nextAction: '' });

  // Debounced version of onUpdate for text field changes (500ms delay)
  const debouncedUpdate = useDebounce((updatedNurse) => {
    onUpdate(updatedNurse);
  }, 500);

  const updateField = (field, value, { debounce = false } = {}) => {
    const updated = { ...localNurse, [field]: value };
    // Recalculate derived fields
    if (field === 'pipelineStage') {
      updated.readinessStatus = calculateReadinessStatus(value);
    }
    if (field === 'scorecardFields') {
      updated.cvScore = calculateCVScore(updated);
      updated.finalScore = calculateFinalScore(updated);
      updated.tier = calculateTier(updated.finalScore);
    }
    setLocalNurse(updated);
    if (debounce) {
      debouncedUpdate(updated);
    } else {
      onUpdate(updated);
    }
  };

  const updateFieldDebounced = (field, value) => {
    updateField(field, value, { debounce: true });
  };

  const updateScorecard = (key, value) => {
    const newScorecard = { ...localNurse.scorecardFields, [key]: value };
    const updated = { ...localNurse, scorecardFields: newScorecard };
    updated.cvScore = calculateCVScore(updated);
    updated.finalScore = calculateFinalScore(updated);
    updated.tier = calculateTier(updated.finalScore);
    setLocalNurse(updated);
    onUpdate(updated);
  };

  const addCommunication = () => {
    if (!commForm.summary.trim()) return;
    const entry = {
      date: new Date().toISOString().split('T')[0],
      channel: commForm.channel,
      summary: commForm.summary,
      nextAction: commForm.nextAction,
    };
    const log = [...(localNurse.communicationLog || []), entry];
    updateField('communicationLog', log);
    setCommForm({ channel: 'Email', summary: '', nextAction: '' });
    setShowAddComm(false);
  };

  const naColor = getNextActionColor(localNurse);
  const initials = localNurse.fullName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2);

  const isExitState = ['Dropped Out', 'Deferred', 'Recommended Pathway'].includes(
    localNurse.pipelineStage
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-6 pb-6">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-3rem)] flex flex-col">
        {/* Header - Always visible */}
        <div
          className={`p-5 border-b border-gray-100 shrink-0 rounded-t-xl ${
            localNurse.pipelineStage === 'Dropped Out'
              ? 'bg-red-50'
              : localNurse.pipelineStage === 'Deferred'
              ? 'bg-yellow-50'
              : 'bg-white'
          }`}
        >
          <div className="flex items-start justify-between mb-3">
            <div className="flex items-center gap-3">
              {localNurse.photoURL ? (
                <img
                  src={localNurse.photoURL}
                  alt={localNurse.fullName}
                  className="w-14 h-14 rounded-full object-cover"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-propela-purple flex items-center justify-center text-white font-semibold text-lg">
                  {initials}
                </div>
              )}
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {localNurse.fullName}
                  {localNurse.preferredName && localNurse.preferredName !== localNurse.fullName.split(' ')[0] && (
                    <span className="text-gray-400 font-normal text-sm ml-1">
                      ({localNurse.preferredName})
                    </span>
                  )}
                </h2>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  <EditableSelect
                    value={localNurse.pipelineStage}
                    options={PIPELINE_STAGES}
                    onChange={(v) => updateField('pipelineStage', v)}
                    className="text-xs"
                  />
                  {localNurse.cohortAssigned && (
                    <span className="text-xs bg-propela-purple-light text-propela-purple px-2 py-0.5 rounded-full">
                      {localNurse.cohortAssigned}
                    </span>
                  )}
                  {localNurse.flags > 0 && (
                    <span className="flex items-center gap-0.5 text-xs text-red-600">
                      <Flag size={12} className="fill-red-600" /> {localNurse.flags}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Next Action - Most Prominent */}
          <div className={`rounded-lg border p-3 ${naColor.bg} ${naColor.border}`}>
            <label className="text-xs font-medium text-gray-500 block mb-1">Next Action</label>
            <select
              value={localNurse.nextAction || ''}
              onChange={(e) => updateField('nextAction', e.target.value)}
              className={`w-full text-base font-semibold bg-transparent border-none focus:outline-none ${naColor.text}`}
            >
              <option value="">-- Select --</option>
              {NEXT_ACTION_VALUES.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Info Row */}
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 flex-wrap">
            <span className="flex items-center gap-1">
              <Calendar size={12} />
              Submitted: {localNurse.submittedAt || '-'}
            </span>
            {localNurse.lastContacted && (
              <span className="flex items-center gap-1">
                <MessageSquare size={12} />
                Last contacted: {localNurse.lastContacted}
              </span>
            )}
            {!isExitState && (
              <span
                className={`px-2 py-0.5 rounded-full font-medium ${
                  localNurse.readinessStatus === 'Placement Ready'
                    ? 'bg-green-100 text-green-700'
                    : localNurse.readinessStatus === 'Placed'
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {localNurse.readinessStatus}
              </span>
            )}
          </div>
        </div>

        {/* Scrollable Sections */}
        <div className="overflow-y-auto flex-1">
          <Section title="Personal Information" defaultOpen={true}>
            <div className="space-y-0.5">
              <FieldRow label="Email">
                <a href={`mailto:${localNurse.email}`} className="text-propela-purple hover:underline">
                  {localNurse.email}
                </a>
              </FieldRow>
              <FieldRow label="Phone" value={localNurse.contactNumber} />
              <FieldRow label="Gender" value={localNurse.gender} />
              <FieldRow label="Age Group" value={localNurse.ageGroup} />
              <FieldRow label="Province" value={localNurse.province} />
              <FieldRow label="City" value={localNurse.city} />
            </div>
          </Section>

          <Section title="Professional Profile">
            <div className="space-y-0.5">
              <FieldRow label="Registered with SANC" value={localNurse.registeredWithSANC} />
              <FieldRow label="Registered Nurse in SA" value={localNurse.registeredNurseInSA} />
              <FieldRow label="SANC Number" value={localNurse.sancNumber} />
              <FieldRow label="SANC APC Expiry" value={localNurse.sancAPCExpiry} />
              <FieldRow label="SANC APC Status" value={localNurse.sancAPCStatus} />
              <FieldRow label="Highest Qualification" value={localNurse.highestQualification} />
              <FieldRow label="Institution" value={localNurse.qualificationInstitution} />
              <FieldRow label="Years Experience" value={localNurse.yearsOfClinicalExperience} />
              <FieldRow label="Primary Specialty" value={localNurse.primaryClinicalSpecialty} />
              <FieldRow label="Additional Certs">
                {localNurse.additionalCertifications?.join(', ') || '-'}
              </FieldRow>
              <FieldRow label="Employment Status" value={localNurse.employmentStatus} />
              <FieldRow label="Current Employer" value={localNurse.currentEmployer} />
              <FieldRow label="Valid Passport" value={localNurse.validPassport} />
              <FieldRow label="Passport Expiry" value={localNurse.passportExpiryDate} />
            </div>
          </Section>

          <Section title="English Proficiency - Screening (EF SET)">
            <div className="space-y-0.5">
              <FieldRow label="EF SET Score" value={localNurse.efSetScore} />
              <FieldRow label="EF SET Level" value={localNurse.efSetLevel} />
              <FieldRow label="English Pts" value={localNurse.englishPts} />
            </div>
          </Section>

          <Section title="English Proficiency - Qualification (OET)">
            <div className="space-y-0.5">
              <FieldRow label="OET Status">
                <EditableSelect
                  value={localNurse.oetStatus}
                  options={OET_STATUSES}
                  onChange={(v) => updateField('oetStatus', v)}
                />
              </FieldRow>
              <FieldRow label="OET Exam Date" value={localNurse.oetExamDate || '-'} />
              {localNurse.oetScores && (
                <>
                  <FieldRow label="Writing" value={localNurse.oetScores.writing} />
                  <FieldRow label="Speaking" value={localNurse.oetScores.speaking} />
                  <FieldRow label="Listening" value={localNurse.oetScores.listening} />
                  <FieldRow label="Reading" value={localNurse.oetScores.reading} />
                </>
              )}
              <FieldRow label="OET Overall Result" value={localNurse.oetOverallResult || '-'} />
            </div>
          </Section>

          <Section title="Scorecard" defaultOpen={true}>
            <div className="space-y-1 mb-3">
              <ScorecardField
                label="Hospital Exp"
                weight={3}
                value={localNurse.scorecardFields?.hospitalExp}
                onChange={(v) => updateScorecard('hospitalExp', v)}
              />
              <ScorecardField
                label="SANC Status"
                weight={3}
                value={localNurse.scorecardFields?.sancStatus}
                onChange={(v) => updateScorecard('sancStatus', v)}
              />
              <ScorecardField
                label="Qualifications"
                weight={2}
                value={localNurse.scorecardFields?.qualifications}
                onChange={(v) => updateScorecard('qualifications', v)}
              />
              <ScorecardField
                label="Specialisation"
                weight={1}
                value={localNurse.scorecardFields?.specialisation}
                onChange={(v) => updateScorecard('specialisation', v)}
              />
              <ScorecardField
                label="Financial Readiness"
                weight={1}
                value={localNurse.scorecardFields?.financialReadiness}
                onChange={(v) => updateScorecard('financialReadiness', v)}
              />
              <ScorecardField
                label="Motivation"
                weight={2}
                value={localNurse.scorecardFields?.motivation}
                onChange={(v) => updateScorecard('motivation', v)}
              />
              <ScorecardField
                label="Passport"
                weight={1}
                value={localNurse.scorecardFields?.passport}
                onChange={(v) => updateScorecard('passport', v)}
              />
            </div>
            <div className="bg-gray-50 rounded-lg p-3 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">CV Score</span>
                <div className="flex items-center gap-1">
                  {renderStars(localNurse.cvScore)}
                  <span className="text-sm font-medium text-gray-700 ml-1">
                    {localNurse.cvScore}/5
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Final Score</span>
                <span className="text-sm font-semibold text-gray-900">
                  {localNurse.finalScore}/5
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Tier</span>
                <span
                  className={`text-sm font-semibold px-2 py-0.5 rounded ${
                    localNurse.tier === 'Tier 1 Priority'
                      ? 'bg-green-100 text-green-700'
                      : localNurse.tier === 'Tier 1 Standard'
                      ? 'bg-blue-100 text-blue-700'
                      : localNurse.tier === 'Tier 2 Development'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {localNurse.tier}
                </span>
              </div>
            </div>
          </Section>

          <Section title="Selection and Pathway">
            <div className="space-y-0.5">
              <FieldRow label="Shortlist Decision">
                <EditableSelect
                  value={localNurse.shortlistDecision}
                  options={SHORTLIST_DECISIONS}
                  onChange={(v) => updateField('shortlistDecision', v)}
                />
              </FieldRow>
            </div>
          </Section>

          <Section title="Cohort and Commitment">
            <div className="space-y-0.5">
              <FieldRow label="Cohort Assigned" value={localNurse.cohortAssigned || 'Unassigned'} />
              <FieldRow label="Agreement Signed" value={localNurse.agreementSigned ? 'Yes' : 'No'} />
              <FieldRow label="Commitment Fee Status">
                <EditableSelect
                  value={localNurse.commitmentFeeStatus}
                  options={COMMITMENT_FEE_STATUSES}
                  onChange={(v) => updateField('commitmentFeeStatus', v)}
                />
              </FieldRow>
            </div>
          </Section>

          <Section title="Placement">
            <div className="space-y-0.5">
              <FieldRow label="Placement Status" value={localNurse.placementStatus || '-'} />
            </div>
          </Section>

          <Section title="Notes / Flags / Source">
            <div className="space-y-0.5">
              <FieldRow label="Source" value={localNurse.source} />
              <FieldRow label="Motivations" value={localNurse.motivations} />
              <FieldRow label="Questions" value={localNurse.questions} />
              <FieldRow label="Notes/Flags" value={localNurse.notesFlags} />
            </div>
          </Section>

          <Section title="Communication Log" defaultOpen={true}>
            <div className="space-y-2">
              {(localNurse.communicationLog || []).length === 0 ? (
                <p className="text-sm text-gray-400 italic">No communications logged yet.</p>
              ) : (
                [...(localNurse.communicationLog || [])]
                  .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
                  .map((entry, idx) => (
                    <div
                      key={idx}
                      className="bg-gray-50 rounded-lg p-2.5 text-sm"
                    >
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <span>{entry.date}</span>
                        <span className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">
                          {entry.channel}
                        </span>
                      </div>
                      <p className="text-gray-700">{entry.summary}</p>
                      {entry.nextAction && (
                        <p className="text-xs text-teal-600 mt-1">
                          Next: {entry.nextAction}
                        </p>
                      )}
                    </div>
                  ))
              )}

              {!showAddComm ? (
                <button
                  onClick={() => setShowAddComm(true)}
                  className="flex items-center gap-1 text-sm text-propela-purple hover:text-propela-purple-dark font-medium mt-2"
                >
                  <Plus size={14} /> Add Communication
                </button>
              ) : (
                <div className="bg-propela-purple-light rounded-lg p-3 space-y-2 mt-2">
                  <div className="flex gap-2">
                    <select
                      value={commForm.channel}
                      onChange={(e) => setCommForm({ ...commForm, channel: e.target.value })}
                      className="text-sm border border-gray-200 rounded px-2 py-1"
                    >
                      {['Email', 'WhatsApp', 'Phone', 'LinkedIn', 'In-person'].map((ch) => (
                        <option key={ch} value={ch}>
                          {ch}
                        </option>
                      ))}
                    </select>
                  </div>
                  <textarea
                    value={commForm.summary}
                    onChange={(e) => setCommForm({ ...commForm, summary: e.target.value })}
                    placeholder="Summary of communication..."
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 h-16 resize-none"
                  />
                  <input
                    value={commForm.nextAction}
                    onChange={(e) => setCommForm({ ...commForm, nextAction: e.target.value })}
                    placeholder="Next action set (optional)"
                    className="w-full text-sm border border-gray-200 rounded px-2 py-1.5"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={addCommunication}
                      className="px-3 py-1.5 text-sm bg-propela-purple text-white rounded hover:bg-propela-purple-dark"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setShowAddComm(false)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
