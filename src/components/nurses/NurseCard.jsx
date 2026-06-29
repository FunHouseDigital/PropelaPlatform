import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Flag,
  MessageSquare,
  Plus,
  Star,
  StarHalf,
  X,
} from 'lucide-react';
import { useState } from 'react';

import { useDebounce } from '../../hooks/useDebounce';
import {
  calculateCVScore,
  calculateFinalScore,
  calculateReadinessStatus,
  calculateTier,
} from '../../lib/calculations';
import {
  AGE_GROUPS,
  COMMITMENT_FEE_STATUSES,
  DESTINATION_COUNTRIES,
  EFSET_LEVELS,
  EMPLOYMENT_STATUSES,
  GENDERS,
  NEXT_ACTION_VALUES,
  OET_RESULTS,
  OET_STATUSES,
  PIPELINE_STAGES,
  PLACEMENT_STATUSES,
  QUALIFICATION_TYPES,
  RECOMMENDED_PATHWAYS,
  SANC_APC_STATUSES,
  SHORTLIST_DECISIONS,
  SOURCE_OPTIONS,
  SPECIALTIES,
  YEARS_EXPERIENCE,
  YES_NO,
} from '../../lib/constants';

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
    if (due.getTime() === today.getTime())
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
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

// Shared input styling: subtle by default, clearly editable on focus.
const INPUT_CLASS =
  'w-full text-sm text-gray-900 bg-transparent border border-transparent hover:border-gray-200 rounded px-2 py-1 focus:outline-none focus:bg-white focus:border-gray-300 focus:ring-1 focus:ring-propela-purple';

function EditableText({ value, onChange, placeholder = '', className = '' }) {
  return (
    <input
      type="text"
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${INPUT_CLASS} ${className}`}
    />
  );
}

function EditableNumber({ value, onChange, placeholder = '', min, max, step, className = '' }) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(e) => {
        const raw = e.target.value;
        onChange(raw === '' ? '' : Number(raw));
      }}
      placeholder={placeholder}
      min={min}
      max={max}
      step={step}
      className={`${INPUT_CLASS} ${className}`}
    />
  );
}

function EditableDate({ value, onChange, className = '' }) {
  return (
    <input
      type="date"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className={`${INPUT_CLASS} ${className}`}
    />
  );
}

function EditableTextarea({ value, onChange, placeholder = '', rows = 3, className = '' }) {
  return (
    <textarea
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      className={`${INPUT_CLASS} resize-y leading-snug ${className}`}
    />
  );
}

// Maps a stored boolean (e.g. agreementSigned) to a Yes / No dropdown
// without changing the underlying data type used elsewhere in the app.
function EditableYesNoBoolean({ value, onChange, className = '' }) {
  return (
    <EditableSelect
      value={value ? 'Yes' : 'No'}
      options={YES_NO}
      onChange={(v) => onChange(v === 'Yes')}
      className={className}
    />
  );
}

// Comma-separated text input backed by an array field. Keeps its own raw
// text state so typing stays smooth, while persisting a cleaned array.
function EditableCertifications({ value, onChange, placeholder = '' }) {
  const [text, setText] = useState((value || []).join(', '));
  return (
    <input
      type="text"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(
          e.target.value
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        );
      }}
      placeholder={placeholder}
      className={INPUT_CLASS}
    />
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

  // Flush any pending debounced save before closing the card
  const handleClose = () => {
    debouncedUpdate.flush();
    onClose();
  };

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

  const updateOetScore = (key, value) => {
    const newScores = { ...(localNurse.oetScores || {}), [key]: value };
    updateField('oetScores', newScores);
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
      <div className="absolute inset-0 bg-black/30" onClick={handleClose} />
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
                  {localNurse.preferredName &&
                    localNurse.preferredName !== localNurse.fullName.split(' ')[0] && (
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
            <button onClick={handleClose} className="p-1 hover:bg-gray-100 rounded">
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
                <EditableText
                  value={localNurse.email}
                  onChange={(v) => updateFieldDebounced('email', v)}
                  placeholder="email@example.com"
                />
              </FieldRow>
              <FieldRow label="Phone">
                <EditableText
                  value={localNurse.contactNumber}
                  onChange={(v) => updateFieldDebounced('contactNumber', v)}
                  placeholder="+27..."
                />
              </FieldRow>
              <FieldRow label="Gender">
                <EditableSelect
                  value={localNurse.gender}
                  options={GENDERS}
                  onChange={(v) => updateField('gender', v)}
                />
              </FieldRow>
              <FieldRow label="Age Group">
                <EditableSelect
                  value={localNurse.ageGroup}
                  options={AGE_GROUPS}
                  onChange={(v) => updateField('ageGroup', v)}
                />
              </FieldRow>
              <FieldRow label="Province">
                <EditableText
                  value={localNurse.province}
                  onChange={(v) => updateFieldDebounced('province', v)}
                  placeholder="Province"
                />
              </FieldRow>
              <FieldRow label="City">
                <EditableText
                  value={localNurse.city}
                  onChange={(v) => updateFieldDebounced('city', v)}
                  placeholder="City"
                />
              </FieldRow>
            </div>
          </Section>

          <Section title="Professional Profile">
            <div className="space-y-0.5">
              <FieldRow label="Registered with SANC">
                <EditableSelect
                  value={localNurse.registeredWithSANC}
                  options={YES_NO}
                  onChange={(v) => updateField('registeredWithSANC', v)}
                />
              </FieldRow>
              <FieldRow label="Registered Nurse in SA">
                <EditableSelect
                  value={localNurse.registeredNurseInSA}
                  options={YES_NO}
                  onChange={(v) => updateField('registeredNurseInSA', v)}
                />
              </FieldRow>
              <FieldRow label="SANC Number">
                <EditableText
                  value={localNurse.sancNumber}
                  onChange={(v) => updateFieldDebounced('sancNumber', v)}
                  placeholder="SANC registration number"
                />
              </FieldRow>
              <FieldRow label="SANC APC Expiry">
                <EditableDate
                  value={localNurse.sancAPCExpiry}
                  onChange={(v) => updateField('sancAPCExpiry', v)}
                />
              </FieldRow>
              <FieldRow label="SANC APC Status">
                <EditableSelect
                  value={localNurse.sancAPCStatus}
                  options={SANC_APC_STATUSES}
                  onChange={(v) => updateField('sancAPCStatus', v)}
                />
              </FieldRow>
              <FieldRow label="Highest Qualification">
                <EditableSelect
                  value={localNurse.highestQualification}
                  options={QUALIFICATION_TYPES}
                  onChange={(v) => updateField('highestQualification', v)}
                />
              </FieldRow>
              <FieldRow label="Institution">
                <EditableText
                  value={localNurse.qualificationInstitution}
                  onChange={(v) => updateFieldDebounced('qualificationInstitution', v)}
                  placeholder="Institution"
                />
              </FieldRow>
              <FieldRow label="Years Experience">
                <EditableSelect
                  value={localNurse.yearsOfClinicalExperience}
                  options={YEARS_EXPERIENCE}
                  onChange={(v) => updateField('yearsOfClinicalExperience', v)}
                />
              </FieldRow>
              <FieldRow label="Primary Specialty">
                <EditableSelect
                  value={localNurse.primaryClinicalSpecialty}
                  options={SPECIALTIES}
                  onChange={(v) => updateField('primaryClinicalSpecialty', v)}
                />
              </FieldRow>
              <FieldRow label="Additional Certs">
                <EditableCertifications
                  value={localNurse.additionalCertifications}
                  onChange={(v) => updateFieldDebounced('additionalCertifications', v)}
                  placeholder="Comma-separated, e.g. ACLS, BLS"
                />
              </FieldRow>
              <FieldRow label="Employment Status">
                <EditableSelect
                  value={localNurse.employmentStatus}
                  options={EMPLOYMENT_STATUSES}
                  onChange={(v) => updateField('employmentStatus', v)}
                />
              </FieldRow>
              <FieldRow label="Current Employer">
                <EditableText
                  value={localNurse.currentEmployer}
                  onChange={(v) => updateFieldDebounced('currentEmployer', v)}
                  placeholder="Current employer"
                />
              </FieldRow>
              <FieldRow label="Valid Passport">
                <EditableSelect
                  value={localNurse.validPassport}
                  options={YES_NO}
                  onChange={(v) => updateField('validPassport', v)}
                />
              </FieldRow>
              <FieldRow label="Passport Expiry">
                <EditableDate
                  value={localNurse.passportExpiryDate}
                  onChange={(v) => updateField('passportExpiryDate', v)}
                />
              </FieldRow>
            </div>
          </Section>

          <Section title="English Proficiency - Screening (EF SET)">
            <div className="space-y-0.5">
              <FieldRow label="EF SET Score">
                <EditableNumber
                  value={localNurse.efSetScore}
                  onChange={(v) => updateField('efSetScore', v)}
                  placeholder="Score"
                  min={0}
                />
              </FieldRow>
              <FieldRow label="EF SET Level">
                <EditableSelect
                  value={localNurse.efSetLevel}
                  options={EFSET_LEVELS}
                  onChange={(v) => updateField('efSetLevel', v)}
                />
              </FieldRow>
              <FieldRow label="English Pts">
                <EditableNumber
                  value={localNurse.englishPts}
                  onChange={(v) => updateField('englishPts', v)}
                  placeholder="0-3"
                  min={0}
                  max={3}
                />
              </FieldRow>
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
              <FieldRow label="OET Exam Date">
                <EditableDate
                  value={localNurse.oetExamDate}
                  onChange={(v) => updateField('oetExamDate', v)}
                />
              </FieldRow>
              <FieldRow label="OET Exam Centre">
                <EditableText
                  value={localNurse.oetExamCentre}
                  onChange={(v) => updateFieldDebounced('oetExamCentre', v)}
                  placeholder="Exam centre"
                />
              </FieldRow>
              <FieldRow label="Writing">
                <EditableNumber
                  value={localNurse.oetScores?.writing}
                  onChange={(v) => updateOetScore('writing', v)}
                  placeholder="Writing score"
                />
              </FieldRow>
              <FieldRow label="Speaking">
                <EditableNumber
                  value={localNurse.oetScores?.speaking}
                  onChange={(v) => updateOetScore('speaking', v)}
                  placeholder="Speaking score"
                />
              </FieldRow>
              <FieldRow label="Listening">
                <EditableNumber
                  value={localNurse.oetScores?.listening}
                  onChange={(v) => updateOetScore('listening', v)}
                  placeholder="Listening score"
                />
              </FieldRow>
              <FieldRow label="Reading">
                <EditableNumber
                  value={localNurse.oetScores?.reading}
                  onChange={(v) => updateOetScore('reading', v)}
                  placeholder="Reading score"
                />
              </FieldRow>
              <FieldRow label="OET Overall Result">
                <EditableSelect
                  value={localNurse.oetOverallResult}
                  options={OET_RESULTS}
                  onChange={(v) => updateField('oetOverallResult', v)}
                />
              </FieldRow>
              <FieldRow label="Retake Required">
                <EditableSelect
                  value={localNurse.retakeRequired}
                  options={YES_NO}
                  onChange={(v) => updateField('retakeRequired', v)}
                />
              </FieldRow>
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
              <FieldRow label="First Interview Date">
                <EditableDate
                  value={localNurse.firstInterviewDate}
                  onChange={(v) => updateField('firstInterviewDate', v)}
                />
              </FieldRow>
              <FieldRow label="Non-Selection Reason">
                <EditableText
                  value={localNurse.nonSelectionReason}
                  onChange={(v) => updateFieldDebounced('nonSelectionReason', v)}
                  placeholder="Reason"
                />
              </FieldRow>
              <FieldRow label="Recommended Pathway">
                <EditableSelect
                  value={localNurse.recommendedPathway}
                  options={RECOMMENDED_PATHWAYS}
                  onChange={(v) => updateField('recommendedPathway', v)}
                />
              </FieldRow>
            </div>
          </Section>

          <Section title="Cohort and Commitment">
            <div className="space-y-0.5">
              <FieldRow label="Cohort Assigned">
                <EditableText
                  value={localNurse.cohortAssigned}
                  onChange={(v) => updateFieldDebounced('cohortAssigned', v)}
                  placeholder="Unassigned"
                />
              </FieldRow>
              <FieldRow label="Agreement Sent">
                <EditableSelect
                  value={localNurse.agreementSent}
                  options={YES_NO}
                  onChange={(v) => updateField('agreementSent', v)}
                />
              </FieldRow>
              <FieldRow label="Agreement Sent Date">
                <EditableDate
                  value={localNurse.agreementSentDate}
                  onChange={(v) => updateField('agreementSentDate', v)}
                />
              </FieldRow>
              <FieldRow label="Agreement Signed">
                <EditableYesNoBoolean
                  value={localNurse.agreementSigned}
                  onChange={(v) => updateField('agreementSigned', v)}
                />
              </FieldRow>
              <FieldRow label="Agreement Signed Date">
                <EditableDate
                  value={localNurse.agreementSignedDate}
                  onChange={(v) => updateField('agreementSignedDate', v)}
                />
              </FieldRow>
              <FieldRow label="Commitment Fee Status">
                <EditableSelect
                  value={localNurse.commitmentFeeStatus}
                  options={COMMITMENT_FEE_STATUSES}
                  onChange={(v) => updateField('commitmentFeeStatus', v)}
                />
              </FieldRow>
              <FieldRow label="Commitment Fee Date Paid">
                <EditableDate
                  value={localNurse.commitmentFeeDatePaid}
                  onChange={(v) => updateField('commitmentFeeDatePaid', v)}
                />
              </FieldRow>
            </div>
          </Section>

          <Section title="Placement">
            <div className="space-y-0.5">
              <FieldRow label="Placement Status">
                <EditableSelect
                  value={localNurse.placementStatus}
                  options={PLACEMENT_STATUSES}
                  onChange={(v) => updateField('placementStatus', v)}
                />
              </FieldRow>
              <FieldRow label="Destination Country">
                <EditableSelect
                  value={localNurse.destinationCountry}
                  options={DESTINATION_COUNTRIES}
                  onChange={(v) => updateField('destinationCountry', v)}
                />
              </FieldRow>
              <FieldRow label="Employer">
                <EditableText
                  value={localNurse.placementEmployer}
                  onChange={(v) => updateFieldDebounced('placementEmployer', v)}
                  placeholder="Employer"
                />
              </FieldRow>
              <FieldRow label="Placement Date">
                <EditableDate
                  value={localNurse.placementDate}
                  onChange={(v) => updateField('placementDate', v)}
                />
              </FieldRow>
            </div>
          </Section>

          <Section title="Notes / Flags / Source">
            <div className="space-y-0.5">
              <FieldRow label="Source">
                <EditableSelect
                  value={localNurse.source}
                  options={SOURCE_OPTIONS}
                  onChange={(v) => updateField('source', v)}
                />
              </FieldRow>
              <FieldRow label="Motivations">
                <EditableTextarea
                  value={localNurse.motivations}
                  onChange={(v) => updateFieldDebounced('motivations', v)}
                  placeholder="Motivations"
                />
              </FieldRow>
              <FieldRow label="Questions">
                <EditableTextarea
                  value={localNurse.questions}
                  onChange={(v) => updateFieldDebounced('questions', v)}
                  placeholder="Questions"
                />
              </FieldRow>
              <FieldRow label="Notes/Flags">
                <EditableTextarea
                  value={localNurse.notesFlags}
                  onChange={(v) => updateFieldDebounced('notesFlags', v)}
                  placeholder="Notes / flags"
                />
              </FieldRow>
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
                    <div key={idx} className="bg-gray-50 rounded-lg p-2.5 text-sm">
                      <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
                        <span>{entry.date}</span>
                        <span className="bg-gray-200 px-1.5 py-0.5 rounded text-xs">
                          {entry.channel}
                        </span>
                      </div>
                      <p className="text-gray-700">{entry.summary}</p>
                      {entry.nextAction && (
                        <p className="text-xs text-teal-600 mt-1">Next: {entry.nextAction}</p>
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
