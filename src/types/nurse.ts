export type PipelineStage =
  | 'Applied'
  | 'CV Submitted'
  | 'CV + English Submitted'
  | 'Under Review'
  | 'Shortlisted -- Yes'
  | 'Shortlisted -- Maybe'
  | 'Not Selected'
  | "Didn't Qualify"
  | 'Selected for Cohort'
  | 'Reserve'
  | 'Cohort Confirmed'
  | 'Training Active'
  | 'OET Registered'
  | 'OET Passed'
  | 'OET Failed'
  | 'Placement Ready'
  | 'Placed'
  | 'Deferred'
  | 'Dropped Out'
  | 'Recommended Pathway';

export type ReadinessStatus =
  | 'Not Ready'
  | 'Placement Ready'
  | 'Placed'
  | 'Dropped Out'
  | 'Deferred'
  | 'Not Selected'
  | 'Recommended Pathway';

export type NextAction =
  | 'Send Welcome Email'
  | 'Request CV'
  | 'Review CV'
  | 'Schedule EfSet Test'
  | 'Review EfSet Results'
  | 'Schedule Interview'
  | 'Conduct Interview'
  | 'Make Shortlist Decision'
  | 'Send Selection Notification'
  | 'Send Agreement'
  | 'Follow Up Agreement'
  | 'Confirm Commitment Fee'
  | 'Register for OET'
  | 'Confirm OET Results'
  | 'Schedule OET Retake'
  | 'Begin Placement Matching'
  | 'Confirm Placement'
  | 'Send Placement Invoice'
  | 'Follow Up Payment'
  | 'Schedule Check-in'
  | 'Update Records'
  | 'No Action Required';

export interface Nurse {
  // HEADER
  id: number;
  profilePhoto: string | null;
  fullName: string;
  preferredName: string | null;
  pipelineStage: PipelineStage;
  nextAction: NextAction | null;
  readinessStatus: ReadinessStatus;
  flagCount: number;
  lastContacted: Date | null;
  cohort: string | null;
  submittedAt: Date | null;

  // PERSONAL
  email: string | null;
  contactNumber: string | null;
  gender: string | null;
  ageGroup: string | null;
  provinceCity: string | null;

  // PROFESSIONAL
  sancRegistered: boolean;
  rnInSA: boolean;
  sancNumber: string | null;
  sancApcExpiry: Date | null;
  sancApcStatus: string | null;
  highestQualification: string | null;
  institution: string | null;
  yearsExperience: number;
  primaryClinicalSpecialty: string | null;
  additionalCertifications: string | null;
  employmentStatus: string | null;
  currentEmployer: string | null;
  validPassport: boolean;
  passportExpiry: Date | null;

  // ENGLISH - EFSET
  previouslyTakenTest: boolean;
  efSetScore: number | null;
  efSetLevel: string | null;
  englishPts: number | null;
  proficiencyLevel: string | null;

  // ENGLISH - OET
  oetStatus: string | null;
  oetExamDate: Date | null;
  oetExamCentre: string | null;
  oetWriting: number | null;
  oetSpeaking: number | null;
  oetListening: number | null;
  oetReading: number | null;
  oetOverallResult: string | null;
  oetRetakeRequired: boolean;
  oetRetakeComponents: string | null;

  // SCORECARD
  hospitalExp: number;
  sancStatusScore: number;
  englishProficiency: number;
  qualifications: number;
  specialisation: number;
  validPassportScore: number;
  financialReadiness: number;
  motivationScore: number;
  cvScore: number | null;
  finalScore: number | null;
  tier: string | null;

  // SELECTION
  shortlistDecision: string | null;
  firstInterviewDate: Date | null;
  nonSelectionReason: string | null;
  recommendedPathway: string | null;

  // COHORT TRACKING
  cohortAssigned: string | null;
  agreementSent: boolean;
  agreementSentDate: Date | null;
  agreementSigned: boolean;
  agreementSignedDate: Date | null;
  commitmentFeeStatus: string | null;
  commitmentFeeDate: Date | null;

  // PLACEMENT
  placementStatus: string | null;
  destinationCountry: string | null;
  employer: string | null;
  placementDate: Date | null;
  placementFeeInvoiced: boolean;
  placementFeeReceived: boolean;

  // NOTES
  motivations: string | null;
  questions: string | null;
  notesFlags: string | null;
  source: string | null;
  sourceRecord: string | null;
  communicationLog: string | null;
}
