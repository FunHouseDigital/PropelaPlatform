import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, User, Briefcase, GraduationCap, Globe, ClipboardList, Target, Users2, MapPin, FileText, Flag } from 'lucide-react'
import { getNurseById, updateNurse } from '../data/store.js'
import {
  PIPELINE_STAGES, GENDER_OPTIONS, AGE_GROUP_OPTIONS, QUALIFICATION_OPTIONS,
  EXPERIENCE_OPTIONS, SPECIALTY_OPTIONS, OET_STATUS_OPTIONS, COMMITMENT_FEE_OPTIONS,
  PLACEMENT_STATUS_OPTIONS, PROVINCE_OPTIONS, SOURCE_OPTIONS, SHORTLIST_OPTIONS,
  SANC_APC_STATUS_OPTIONS, EF_SET_LEVEL_OPTIONS, EMPLOYMENT_STATUS_OPTIONS,
  DESTINATION_COUNTRY_OPTIONS, RECOMMENDED_PATHWAY_OPTIONS, NEXT_ACTION_OPTIONS,
} from '../data/constants.js'
import { calculateCvScore, calculateFinalScore, calculateTier, calculateReadinessStatus, getFlagCount } from '../utils/calculations.js'
import NurseCardHeader from '../components/nurses/NurseCardHeader.jsx'
import ScoreCard from '../components/nurses/ScoreCard.jsx'
import CommunicationLog from '../components/nurses/CommunicationLog.jsx'

function FieldRow({ label, value, type = 'text', options, onChange, placeholder }) {
  if (type === 'select') {
    return (
      <div className="flex items-center justify-between py-2 border-b border-gray-50">
        <span className="text-xs font-medium text-grey">{label}</span>
        <select
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs border border-border rounded-md px-2 py-1 max-w-[200px] focus:outline-none focus:ring-1 focus:ring-purple"
        >
          <option value="">-</option>
          {options.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      </div>
    )
  }

  if (type === 'checkbox') {
    return (
      <div className="flex items-center justify-between py-2 border-b border-gray-50">
        <span className="text-xs font-medium text-grey">{label}</span>
        <input
          type="checkbox"
          checked={!!value}
          onChange={(e) => onChange(e.target.checked)}
          className="rounded border-border text-purple focus:ring-purple"
        />
      </div>
    )
  }

  if (type === 'date') {
    return (
      <div className="flex items-center justify-between py-2 border-b border-gray-50">
        <span className="text-xs font-medium text-grey">{label}</span>
        <input
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          className="text-xs border border-border rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-purple"
        />
      </div>
    )
  }

  if (type === 'textarea') {
    return (
      <div className="py-2 border-b border-gray-50">
        <span className="text-xs font-medium text-grey block mb-1">{label}</span>
        <textarea
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={3}
          className="w-full text-xs border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple resize-none"
        />
      </div>
    )
  }

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50">
      <span className="text-xs font-medium text-grey">{label}</span>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder || '-'}
        className="text-xs border border-border rounded-md px-2 py-1 max-w-[200px] text-right focus:outline-none focus:ring-1 focus:ring-purple"
      />
    </div>
  )
}

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="bg-white border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-5 py-3 text-left hover:bg-gray-50 transition-colors"
      >
        {Icon && <Icon className="w-4 h-4 text-purple" />}
        <span className="text-sm font-semibold text-dark flex-1">{title}</span>
        <span className="text-xs text-grey">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && <div className="px-5 pb-4">{children}</div>}
    </div>
  )
}

export default function NurseCard() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [nurse, setNurse] = useState(null)

  useEffect(() => {
    const data = getNurseById(id)
    if (data) setNurse(data)
  }, [id])

  const handleUpdate = useCallback((updates) => {
    if (!nurse) return
    const updated = { ...nurse, ...updates }
    updateNurse(nurse.id, updates)
    setNurse(updated)
  }, [nurse])

  const handleField = useCallback((field) => (value) => {
    handleUpdate({ [field]: value })
  }, [handleUpdate])

  const handleScorecardUpdate = useCallback((newScorecard, calculated) => {
    handleUpdate({
      scorecard: newScorecard,
      cvScore: calculated.cvScore,
      finalScore: calculated.finalScore,
      tier: calculated.tier,
    })
  }, [handleUpdate])

  const handleAddLogEntry = useCallback((entry) => {
    const currentLog = nurse.communicationLog || []
    const updatedLog = [entry, ...currentLog]
    handleUpdate({
      communicationLog: updatedLog,
      lastContacted: entry.date,
    })
  }, [nurse, handleUpdate])

  if (!nurse) {
    return (
      <div className="p-8 text-center">
        <p className="text-grey">Nurse not found</p>
        <button onClick={() => navigate('/nurses')} className="text-purple text-sm mt-2 hover:underline">
          Back to Database
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Back button */}
      <div className="px-6 pt-4 pb-2">
        <button
          onClick={() => navigate('/nurses')}
          className="flex items-center gap-1 text-sm text-grey hover:text-dark transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Database
        </button>
      </div>

      {/* Sticky Header */}
      <NurseCardHeader nurse={nurse} onUpdate={handleUpdate} />

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* Personal Information */}
        <Section title="Personal Information" icon={User}>
          <FieldRow label="Full Name" value={nurse.fullName} onChange={handleField('fullName')} />
          <FieldRow label="Preferred Name" value={nurse.preferredName} onChange={handleField('preferredName')} />
          <FieldRow label="Email" value={nurse.email} type="email" onChange={handleField('email')} />
          <FieldRow label="Contact Number" value={nurse.contactNumber} onChange={handleField('contactNumber')} />
          <FieldRow label="Gender" value={nurse.gender} type="select" options={GENDER_OPTIONS} onChange={handleField('gender')} />
          <FieldRow label="Age Group" value={nurse.ageGroup} type="select" options={AGE_GROUP_OPTIONS} onChange={handleField('ageGroup')} />
          <FieldRow label="Province" value={nurse.province} type="select" options={PROVINCE_OPTIONS} onChange={handleField('province')} />
          <FieldRow label="City" value={nurse.city} onChange={handleField('city')} />
        </Section>

        {/* Professional Profile */}
        <Section title="Professional Profile" icon={Briefcase}>
          <FieldRow label="Registered with SANC" value={nurse.registeredWithSANC} type="checkbox" onChange={handleField('registeredWithSANC')} />
          <FieldRow label="Registered Nurse in SA" value={nurse.registeredNurseInSA} type="checkbox" onChange={handleField('registeredNurseInSA')} />
          <FieldRow label="SANC Number" value={nurse.sancNumber} onChange={handleField('sancNumber')} />
          <FieldRow label="SANC APC Expiry" value={nurse.sancApcExpiry} type="date" onChange={handleField('sancApcExpiry')} />
          <FieldRow label="SANC APC Status" value={nurse.sancApcStatus} type="select" options={SANC_APC_STATUS_OPTIONS} onChange={handleField('sancApcStatus')} />
          <FieldRow label="Highest Qualification" value={nurse.highestQualification} type="select" options={QUALIFICATION_OPTIONS} onChange={handleField('highestQualification')} />
          <FieldRow label="Qualification Institution" value={nurse.qualificationInstitution} onChange={handleField('qualificationInstitution')} />
          <FieldRow label="Years of Clinical Experience" value={nurse.yearsOfClinicalExperience} type="select" options={EXPERIENCE_OPTIONS} onChange={handleField('yearsOfClinicalExperience')} />
          <FieldRow label="Primary Clinical Specialty" value={nurse.primaryClinicalSpecialty} type="select" options={SPECIALTY_OPTIONS} onChange={handleField('primaryClinicalSpecialty')} />
          <FieldRow label="Additional Certifications" value={nurse.additionalCertifications} onChange={handleField('additionalCertifications')} />
          <FieldRow label="Employment Status" value={nurse.employmentStatus} type="select" options={EMPLOYMENT_STATUS_OPTIONS} onChange={handleField('employmentStatus')} />
          <FieldRow label="Current Employer" value={nurse.currentEmployer} onChange={handleField('currentEmployer')} />
          <FieldRow label="Valid Passport" value={nurse.validPassport} type="checkbox" onChange={handleField('validPassport')} />
          <FieldRow label="Passport Expiry" value={nurse.passportExpiry} type="date" onChange={handleField('passportExpiry')} />
        </Section>

        {/* English Proficiency - EF SET */}
        <Section title="English Proficiency - EF SET" icon={Globe}>
          <FieldRow label="Previously Taken English Test" value={nurse.previouslyTakenEnglishTest} type="checkbox" onChange={handleField('previouslyTakenEnglishTest')} />
          <FieldRow label="EF SET Score" value={nurse.efSetScore} type="number" onChange={handleField('efSetScore')} />
          <FieldRow label="EF SET Level" value={nurse.efSetLevel} type="select" options={EF_SET_LEVEL_OPTIONS} onChange={handleField('efSetLevel')} />
          <FieldRow label="English Points" value={nurse.englishPts} type="number" onChange={handleField('englishPts')} />
          <FieldRow label="English Proficiency Level" value={nurse.englishProficiencyLevel} onChange={handleField('englishProficiencyLevel')} />
        </Section>

        {/* English Proficiency - OET */}
        <Section title="English Proficiency - OET" icon={GraduationCap}>
          <FieldRow label="OET Status" value={nurse.oetStatus} type="select" options={OET_STATUS_OPTIONS} onChange={handleField('oetStatus')} />
          <FieldRow label="OET Exam Date" value={nurse.oetExamDate} type="date" onChange={handleField('oetExamDate')} />
          <FieldRow label="OET Writing Score" value={nurse.oetWritingScore} type="number" onChange={handleField('oetWritingScore')} />
          <FieldRow label="OET Speaking Score" value={nurse.oetSpeakingScore} type="number" onChange={handleField('oetSpeakingScore')} />
          <FieldRow label="OET Listening Score" value={nurse.oetListeningScore} type="number" onChange={handleField('oetListeningScore')} />
          <FieldRow label="OET Reading Score" value={nurse.oetReadingScore} type="number" onChange={handleField('oetReadingScore')} />
          <FieldRow label="OET Overall Result" value={nurse.oetOverallResult} onChange={handleField('oetOverallResult')} />
          <FieldRow label="Retake Required" value={nurse.retakeRequired} type="checkbox" onChange={handleField('retakeRequired')} />
          <FieldRow label="Retake Components" value={nurse.retakeComponents} onChange={handleField('retakeComponents')} />
        </Section>

        {/* Scorecard */}
        <ScoreCard scorecard={nurse.scorecard} onUpdate={handleScorecardUpdate} />

        {/* Selection and Pathway */}
        <Section title="Selection and Pathway" icon={Target}>
          <FieldRow label="Shortlist Decision" value={nurse.shortlistDecision} type="select" options={SHORTLIST_OPTIONS} onChange={handleField('shortlistDecision')} />
          <FieldRow label="First Interview Date" value={nurse.firstInterviewDate} type="date" onChange={handleField('firstInterviewDate')} />
          <FieldRow label="Non-selection Reason" value={nurse.nonSelectionReason} onChange={handleField('nonSelectionReason')} />
          <FieldRow label="Recommended Pathway" value={nurse.recommendedPathway} type="select" options={RECOMMENDED_PATHWAY_OPTIONS} onChange={handleField('recommendedPathway')} />
        </Section>

        {/* Cohort and Commitment */}
        <Section title="Cohort and Commitment" icon={Users2}>
          <FieldRow label="Cohort Assigned" value={nurse.cohortAssigned} onChange={handleField('cohortAssigned')} />
          <FieldRow label="Agreement Sent" value={nurse.agreementSent} type="checkbox" onChange={handleField('agreementSent')} />
          <FieldRow label="Agreement Signed" value={nurse.agreementSigned} type="checkbox" onChange={handleField('agreementSigned')} />
          <FieldRow label="Commitment Fee Status" value={nurse.commitmentFeeStatus} type="select" options={COMMITMENT_FEE_OPTIONS} onChange={handleField('commitmentFeeStatus')} />
          <FieldRow label="Commitment Fee Date" value={nurse.commitmentFeeDate} type="date" onChange={handleField('commitmentFeeDate')} />
        </Section>

        {/* Placement */}
        <Section title="Placement" icon={MapPin}>
          <FieldRow label="Placement Status" value={nurse.placementStatus} type="select" options={PLACEMENT_STATUS_OPTIONS} onChange={handleField('placementStatus')} />
          <FieldRow label="Destination Country" value={nurse.destinationCountry} type="select" options={DESTINATION_COUNTRY_OPTIONS} onChange={handleField('destinationCountry')} />
        </Section>

        {/* Notes / Flags / Source */}
        <Section title="Notes, Flags and Source" icon={FileText}>
          <FieldRow label="Source" value={nurse.source} type="select" options={SOURCE_OPTIONS} onChange={handleField('source')} />
          <FieldRow
            label="Notes"
            value={nurse.notes}
            type="textarea"
            placeholder="Add notes here. Use [FLAG] to mark important items."
            onChange={(value) => {
              const flagCount = getFlagCount(value)
              handleUpdate({ notes: value, flags: flagCount })
            }}
          />
          {getFlagCount(nurse.notes) > 0 && (
            <div className="flex items-center gap-1 py-2 text-red">
              <Flag className="w-3.5 h-3.5 fill-red" />
              <span className="text-xs font-medium">{getFlagCount(nurse.notes)} active flag(s)</span>
            </div>
          )}
          <FieldRow label="Motivations" value={nurse.motivations} type="textarea" onChange={handleField('motivations')} />
          <FieldRow label="Questions" value={nurse.questions} type="textarea" onChange={handleField('questions')} />
          <FieldRow label="Follow-up Date" value={nurse.followUpDate} type="date" onChange={handleField('followUpDate')} />
        </Section>

        {/* Communication Log */}
        <CommunicationLog
          log={nurse.communicationLog || []}
          onAddEntry={handleAddLogEntry}
        />
      </div>
    </div>
  )
}
