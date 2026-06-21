// Pipeline Stages (Section 7.2)
export const PIPELINE_STAGES = [
  // Application Funnel (pre-cohort selection)
  'Applied',
  'CV Submitted',
  'CV + English Submitted',
  'Under Review',
  'Shortlisted - Yes',
  'Shortlisted - Maybe',
  'Not Selected',
  "Didn't Qualify",
  // Cohort Pipeline (post-selection)
  'Selected for Cohort',
  'Reserve',
  'Cohort Confirmed',
  'Training Active',
  'OET Registered',
  'OET Passed',
  'OET Failed',
  'Placement Ready',
  'Placed',
  // Exit and Hold States
  'Deferred',
  'Dropped Out',
  'Recommended Pathway',
];

// Next Action dropdown values (Section 7.7)
export const NEXT_ACTION_VALUES = [
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
];

// Readiness Statuses (Section 7.3)
export const READINESS_STATUSES = [
  'Not Ready',
  'Placement Ready',
  'Placed',
  'Deferred',
  'Dropped Out',
  'Recommended Pathway',
];

// Primary Clinical Specialties (Section 7.7)
export const SPECIALTIES = [
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
];

// South African Provinces
export const PROVINCES = [
  'Gauteng',
  'Western Cape',
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Limpopo',
  'Mpumalanga',
  'North West',
  'Northern Cape',
];

// Qualification Types (Section 7.7)
export const QUALIFICATION_TYPES = [
  'Diploma',
  "Bachelor's Degree",
  'Postgraduate',
  "Bachelor's + Postgrad",
  'Other',
];

// Years of Experience (Section 7.7)
export const YEARS_EXPERIENCE = [
  'Less than 1 year',
  '1-2 years',
  '3-5 years',
  '5+ years',
];

// Gender options
export const GENDERS = [
  'Female',
  'Male',
  'Non-binary',
  'Prefer not to say',
];

// Age Groups
export const AGE_GROUPS = [
  '25-29',
  '30-35',
  '35-40',
  '40+',
];

// SANC APC Status
export const SANC_APC_STATUSES = [
  'Active',
  'Lapsed',
  'Unverified',
];

// EF SET Levels
export const EFSET_LEVELS = [
  'A1',
  'A2',
  'B1',
  'B2',
  'C1',
  'C2',
];

// OET Statuses
export const OET_STATUSES = [
  'Not Started',
  'Studying',
  'Registered',
  'Sat',
  'Passed',
  'Failed',
  'Exemption Pending',
];

// OET Overall Result
export const OET_RESULTS = [
  'Pass',
  'Fail',
  'Partial',
];

// Commitment Fee Statuses
export const COMMITMENT_FEE_STATUSES = [
  'Not Due',
  'Invoiced',
  'Paid',
  'Refunded',
  'Waived',
  'Overdue',
];

// Healthcare Groups (Section 8.3)
export const HEALTHCARE_GROUPS = [
  'Life Healthcare',
  'Mediclinic',
  'Netcare',
  'Public',
  'Independent',
  'Other',
];

// Facility Types
export const FACILITY_TYPES = [
  'Private',
  'Public',
];

// Organisation Stages (Section 8.2 - Shared Outreach Pipeline)
export const ORGANISATION_STAGES = [
  'Identified',
  'Outreach Sent',
  'Follow-Up Pending',
  'Responded',
  'Engaged / Meeting Set',
  'Active',
  'Dormant',
  'Closed',
];

// Tiers (Section 7.7 Scorecard)
export const TIERS = [
  'Tier 1 Priority',
  'Tier 1 Standard',
  'Tier 2 Development',
  'Tier 3',
  'Not Suitable',
];

// Shortlist Decisions
export const SHORTLIST_DECISIONS = [
  'YES',
  'MAYBE',
  'NO',
];

// Source Options (Section 7.7)
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
];

// Employment Statuses
export const EMPLOYMENT_STATUSES = [
  'Employed',
  'Unemployed',
  'Freelancing',
  'Prefer not to say',
];

// Placement Statuses
export const PLACEMENT_STATUSES = [
  'Not Ready',
  'Ready',
  'In Process',
  'Placed',
  'Declined',
];

// Destination Countries
export const DESTINATION_COUNTRIES = [
  'UK',
  'Ireland',
  'Other',
];

// Recommended Pathways
export const RECOMMENDED_PATHWAYS = [
  'Obtain RN qualification, reapply',
  'Self-funded English training, reapply at B2+',
  'Waitlisted for future cohort',
  'Included in current cohort',
  'Other',
];

// Outreach Approach (Section 8.3)
export const OUTREACH_APPROACHES = [
  'Info Session Partnership',
  'Job Fair Presence',
  'Nurse Referral Agreement',
  'Other',
];

// Preferred Channels
export const PREFERRED_CHANNELS = [
  'Email',
  'LinkedIn',
  'Phone',
  'WhatsApp',
  'In-person',
];

// Cohort Statuses (Section 9.2)
export const COHORT_STATUSES = [
  'Planning',
  'Recruiting',
  'Training',
  'OET Prep',
  'Exam Window',
  'Placement',
  'Closed',
];

// Organisation Types
export const ORGANISATION_TYPES = [
  'NEI',
  'Health Facility',
];
