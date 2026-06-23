let nurseCounter = 0;

/**
 * Reset the nurse counter. Useful for test isolation.
 */
export function resetNurseCounter() {
  nurseCounter = 0;
}

/**
 * Generate a unique ID suffix using counter + random component
 * to avoid cross-test collisions even without explicit resets.
 */
function uniqueId() {
  nurseCounter++;
  const random = Math.random().toString(36).slice(2, 6);
  return `nurse-test-${String(nurseCounter).padStart(3, '0')}-${random}`;
}

/**
 * Factory function to generate mock nurse objects.
 * Based on the shape from src/data/seedNurses.js.
 * Pass overrides to customize specific fields.
 */
export function createNurse(overrides = {}) {
  const id = uniqueId();
  const firstName = 'Thandi';
  const lastName = 'Nkosi';

  return {
    id,
    fullName: `${firstName} ${lastName}`,
    preferredName: firstName,
    pipelineStage: 'Applied',
    nextAction: 'Needs: Chase CV, then scoring',
    readinessStatus: 'Not Ready',
    flags: 0,
    email: `thandi.nkosi${nurseCounter}@gmail.com`,
    contactNumber: '+27612345678',
    gender: 'Female',
    ageGroup: '30-35',
    province: 'Gauteng',
    city: 'Johannesburg',
    registeredWithSANC: 'Yes',
    registeredNurseInSA: 'Yes',
    sancNumber: '123456',
    sancAPCExpiry: '2027-03-15',
    sancAPCStatus: 'Active',
    highestQualification: "Bachelor's Degree",
    qualificationInstitution: 'University of Cape Town',
    yearsOfClinicalExperience: '3-5 years',
    primaryClinicalSpecialty: 'Medical/Surgical',
    additionalCertifications: ['ACLS'],
    employmentStatus: 'Employed',
    currentEmployer: 'Life Healthcare',
    validPassport: 'Yes',
    passportExpiryDate: '2029-06-01',
    efSetScore: 65,
    efSetLevel: 'B2',
    englishPts: 2,
    oetStatus: 'Not Started',
    scorecardFields: {
      hospitalExp: 4,
      sancStatus: 5,
      qualifications: 4,
      specialisation: 3,
      financialReadiness: 3,
      motivation: 4,
      passport: 5,
    },
    cvScore: 72,
    finalScore: 68,
    tier: 'B',
    shortlistDecision: '',
    cohortAssigned: '',
    agreementSigned: false,
    commitmentFeeStatus: 'Not Due',
    source: 'Direct application',
    motivations: 'I want to gain international experience and provide better healthcare.',
    questions: '',
    notesFlags: '',
    communicationLog: [],
    photoURL: '',
    submittedAt: '2025-06-01',
    nextActionDueDate: '2025-06-15',
    lastContacted: '2025-06-10',
    ...overrides,
  };
}

/**
 * Create multiple nurse objects at once.
 */
export function createNurses(count, overrides = {}) {
  return Array.from({ length: count }, () => createNurse(overrides));
}
