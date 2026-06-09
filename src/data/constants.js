// Pipeline stages from PRD Section 7.2
export const PIPELINE_STAGES = [
  // Application Funnel (pre-cohort selection)
  { value: 'Applied', label: 'Applied', category: 'Application Funnel' },
  { value: 'CV Submitted', label: 'CV Submitted', category: 'Application Funnel' },
  { value: 'CV + English Submitted', label: 'CV + English Submitted', category: 'Application Funnel' },
  { value: 'Under Review', label: 'Under Review', category: 'Application Funnel' },
  { value: 'Shortlisted - Yes', label: 'Shortlisted - Yes', category: 'Application Funnel' },
  { value: 'Shortlisted - Maybe', label: 'Shortlisted - Maybe', category: 'Application Funnel' },
  { value: 'Not Selected', label: 'Not Selected', category: 'Application Funnel' },
  { value: "Didn't Qualify", label: "Didn't Qualify", category: 'Application Funnel' },
  // Cohort Pipeline (post-selection)
  { value: 'Selected for Cohort', label: 'Selected for Cohort', category: 'Cohort Pipeline' },
  { value: 'Reserve', label: 'Reserve', category: 'Cohort Pipeline' },
  { value: 'Cohort Confirmed', label: 'Cohort Confirmed', category: 'Cohort Pipeline' },
  { value: 'Training Active', label: 'Training Active', category: 'Cohort Pipeline' },
  { value: 'OET Registered', label: 'OET Registered', category: 'Cohort Pipeline' },
  { value: 'OET Passed', label: 'OET Passed', category: 'Cohort Pipeline' },
  { value: 'OET Failed', label: 'OET Failed', category: 'Cohort Pipeline' },
  { value: 'Placement Ready', label: 'Placement Ready', category: 'Cohort Pipeline' },
  { value: 'Placed', label: 'Placed', category: 'Cohort Pipeline' },
  // Exit and Hold States
  { value: 'Deferred', label: 'Deferred', category: 'Exit/Hold' },
  { value: 'Dropped Out', label: 'Dropped Out', category: 'Exit/Hold' },
  { value: 'Recommended Pathway', label: 'Recommended Pathway', category: 'Exit/Hold' },
]

export const NEXT_ACTION_OPTIONS = [
  'Needs: Chase CV, then scoring',
  'Needs: Chase EF SET, then shortlist email',
  'Needs: Shortlist email (writing task)',
  'Needs: Non-selection email',
  'Needs: Non-selection email (English pathway)',
  'Needs: Review',
  'Needs: Send agreement',
  'Needs: Chase commitment fee',
  'Needs: OET registration',
  'Needs: Chase OET results',
  'Needs: Placement outreach',
  'No action required',
]

export const READINESS_STATUSES = [
  { value: 'Not Ready', label: 'Not Ready', color: '#6B7280' },
  { value: 'Placement Ready', label: 'Placement Ready', color: '#28A745' },
  { value: 'Placed', label: 'Placed', color: '#5B2D8E' },
]

export const GENDER_OPTIONS = ['Female', 'Male', 'Non-binary', 'Prefer not to say']

export const AGE_GROUP_OPTIONS = ['25-29', '30-35', '35-40', '40+']

export const QUALIFICATION_OPTIONS = [
  'Diploma',
  "Bachelor's Degree",
  'Postgraduate',
  "Bachelor's + Postgrad",
  'Other',
]

export const EXPERIENCE_OPTIONS = [
  'Less than 1 year',
  '1-2 years',
  '3-5 years',
  '5+ years',
]

export const SPECIALTY_OPTIONS = [
  'Medical/Surgical',
  'ICU',
  'Theatre',
  'Paediatrics',
  'Midwifery',
  'Mental Health',
  'Emergency',
  'Oncology',
  'PHC-Community',
  'Maternity',
  'Renal',
  'Other',
]

export const OET_STATUS_OPTIONS = [
  'Not Started',
  'Studying',
  'Registered',
  'Sat',
  'Passed',
  'Failed',
  'Exemption Pending',
]

export const COMMITMENT_FEE_OPTIONS = [
  'Not Due',
  'Invoiced',
  'Paid',
  'Refunded',
  'Waived',
  'Overdue',
]

export const PLACEMENT_STATUS_OPTIONS = [
  'Not Ready',
  'Ready',
  'In Process',
  'Placed',
  'Declined',
]

export const PROVINCE_OPTIONS = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Mpumalanga',
  'Limpopo',
  'North West',
  'Northern Cape',
]

export const SOURCE_OPTIONS = [
  'Direct application',
  'Organisation referral',
  'Community channel',
  'Referral from placed nurse',
  'Event',
  'LinkedIn',
  'WhatsApp',
  'Word of mouth',
  'Other',
]

export const SHORTLIST_OPTIONS = ['YES', 'MAYBE', 'NO']

export const TIER_LABELS = {
  'Tier 1 Priority': { min: 4.0, max: 5.0, color: '#5B2D8E', bg: '#5B2D8E', textColor: '#fff' },
  'Tier 1 Standard': { min: 3.0, max: 3.99, color: '#5B2D8E', bg: '#F3EDF9', textColor: '#5B2D8E' },
  'Tier 2 Development': { min: 2.0, max: 2.99, color: '#E68A00', bg: '#FFF3E0', textColor: '#E68A00' },
  'Tier 3': { min: 1.0, max: 1.99, color: '#DC3545', bg: '#FDE8EA', textColor: '#DC3545' },
  'Not Suitable': { min: 0, max: 0.99, color: '#6B7280', bg: '#F3F4F6', textColor: '#6B7280' },
}

export const SCORECARD_WEIGHTS = {
  hospitalExp: 3,
  sancStatus: 3,
  englishProficiency: 2,
  qualifications: 2,
  specialisation: 1,
  validPassport: 1,
  financialReadiness: 1,
  motivation: 2,
}

// CV Score only uses pre-interview components
export const CV_SCORE_WEIGHTS = {
  hospitalExp: 3,
  sancStatus: 3,
  qualifications: 2,
  specialisation: 1,
}

export const SANC_APC_STATUS_OPTIONS = ['Active', 'Lapsed', 'Unverified']

export const EF_SET_LEVEL_OPTIONS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']

export const EMPLOYMENT_STATUS_OPTIONS = [
  'Employed',
  'Unemployed',
  'Freelancing',
  'Prefer not to say',
]

export const DESTINATION_COUNTRY_OPTIONS = ['UK', 'Ireland', 'Other']

export const RECOMMENDED_PATHWAY_OPTIONS = [
  'Obtain RN qualification, reapply',
  'Self-funded English training, reapply at B2+',
  'Waitlisted for future cohort',
  'Included in current cohort',
  'Other',
]

// Acquisition Hub pipeline stages (Section 8.2)
export const ACQUISITION_STAGES = [
  'Identified',
  'Outreach Sent',
  'Follow-Up Pending',
  'Responded',
  'Engaged / Meeting Set',
  'Active',
  'Dormant',
  'Closed',
]
