import {
  calculateCVScore,
  calculateFinalScore,
  calculateReadinessStatus,
  calculateTier,
} from '../calculations';
import {
  AGE_GROUPS,
  COMMITMENT_FEE_STATUSES,
  EFSET_LEVELS,
  EMPLOYMENT_STATUSES,
  GENDERS,
  NEXT_ACTION_VALUES,
  OET_STATUSES,
  PIPELINE_STAGES,
  QUALIFICATION_TYPES,
  SANC_APC_STATUSES,
  SHORTLIST_DECISIONS,
  SOURCE_OPTIONS,
  SPECIALTIES,
  YEARS_EXPERIENCE,
  YES_NO,
} from '../constants';
import {
  MAX_LENGTHS,
  sanitizeText,
  validateEmail,
  validateForm,
  validateNumber,
} from '../validation';

export const SCORECARD_FIELD_NAMES = Object.freeze([
  'hospitalExp',
  'sancStatus',
  'qualifications',
  'specialisation',
  'financialReadiness',
  'motivation',
  'passport',
]);

export const NURSE_ATTRIBUTE_FIELDS = Object.freeze([
  'nextAction',
  'flags',
  'contactNumber',
  'gender',
  'ageGroup',
  'province',
  'city',
  'registeredWithSANC',
  'registeredNurseInSA',
  'sancNumber',
  'sancAPCExpiry',
  'sancAPCStatus',
  'highestQualification',
  'qualificationInstitution',
  'yearsOfClinicalExperience',
  'primaryClinicalSpecialty',
  'employmentStatus',
  'currentEmployer',
  'validPassport',
  'passportExpiryDate',
  'efSetScore',
  'efSetLevel',
  'englishPts',
  'cvScore',
  'shortlistDecision',
  'agreementSigned',
  'commitmentFeeStatus',
  'source',
  'motivations',
  'questions',
  'notesFlags',
  'photoURL',
  'submittedAt',
  'nextActionDueDate',
  'lastContacted',
]);

const TYPED_BUSINESS_FIELDS = Object.freeze([
  'fullName',
  'preferredName',
  'pipelineStage',
  'readinessStatus',
  'cohortAssigned',
  'oetStatus',
  'finalScore',
  'tier',
  'email',
  'scorecardFields',
  'additionalCertifications',
  'communicationLog',
]);

export const NURSE_BUSINESS_FIELDS = Object.freeze([
  ...TYPED_BUSINESS_FIELDS,
  ...NURSE_ATTRIBUTE_FIELDS,
]);

export const NURSE_METADATA_FIELDS = Object.freeze([
  'id',
  'ownerId',
  'version',
  'createdAt',
  'updatedAt',
]);

export const COMMUNICATION_CHANNELS = Object.freeze([
  'Email',
  'WhatsApp',
  'Phone',
  'LinkedIn',
  'In-person',
]);

export const NURSE_SELECT_OPTIONS = Object.freeze({
  pipelineStage: PIPELINE_STAGES,
  nextAction: NEXT_ACTION_VALUES,
  gender: GENDERS,
  ageGroup: AGE_GROUPS,
  registeredWithSANC: YES_NO,
  registeredNurseInSA: YES_NO,
  sancAPCStatus: SANC_APC_STATUSES,
  highestQualification: QUALIFICATION_TYPES,
  yearsOfClinicalExperience: YEARS_EXPERIENCE,
  primaryClinicalSpecialty: SPECIALTIES,
  employmentStatus: EMPLOYMENT_STATUSES,
  validPassport: YES_NO,
  efSetLevel: EFSET_LEVELS,
  oetStatus: OET_STATUSES,
  shortlistDecision: SHORTLIST_DECISIONS,
  commitmentFeeStatus: COMMITMENT_FEE_STATUSES,
  source: SOURCE_OPTIONS,
});

const NAME_FIELDS = Object.freeze(['fullName', 'preferredName']);
const LONG_TEXT_FIELDS = Object.freeze(['motivations', 'questions', 'notesFlags']);
const SINGLE_LINE_FIELDS = Object.freeze([
  'fullName',
  'preferredName',
  'pipelineStage',
  'cohortAssigned',
  'oetStatus',
  'email',
  'nextAction',
  'contactNumber',
  'gender',
  'ageGroup',
  'province',
  'city',
  'registeredWithSANC',
  'registeredNurseInSA',
  'sancNumber',
  'sancAPCExpiry',
  'sancAPCStatus',
  'highestQualification',
  'qualificationInstitution',
  'yearsOfClinicalExperience',
  'primaryClinicalSpecialty',
  'employmentStatus',
  'currentEmployer',
  'validPassport',
  'passportExpiryDate',
  'efSetLevel',
  'shortlistDecision',
  'commitmentFeeStatus',
  'source',
  'photoURL',
  'submittedAt',
  'nextActionDueDate',
  'lastContacted',
]);

const NURSE_DRAFT_ID_RE = /^nurse-[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function cloneValue(value) {
  if (Array.isArray(value)) return value.map(cloneValue);
  if (isPlainObject(value)) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
  }
  return value;
}

function valuesEqual(left, right) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((item, index) => valuesEqual(item, right[index]));
  }
  if (isPlainObject(left) && isPlainObject(right)) {
    const leftKeys = Object.keys(left);
    const rightKeys = Object.keys(right);
    return (
      leftKeys.length === rightKeys.length &&
      leftKeys.every(
        (key) => Object.prototype.hasOwnProperty.call(right, key) && valuesEqual(left[key], right[key])
      )
    );
  }
  return false;
}

function currentLocalDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function zeroScorecard() {
  return Object.fromEntries(SCORECARD_FIELD_NAMES.map((field) => [field, 0]));
}

function emptyBusinessFields() {
  return {
    fullName: '',
    preferredName: '',
    pipelineStage: 'Applied',
    readinessStatus: calculateReadinessStatus('Applied'),
    cohortAssigned: '',
    oetStatus: 'Not Started',
    finalScore: 0,
    tier: '',
    email: '',
    scorecardFields: zeroScorecard(),
    additionalCertifications: [],
    communicationLog: [],
    nextAction: '',
    flags: 0,
    contactNumber: '',
    gender: '',
    ageGroup: '',
    province: '',
    city: '',
    registeredWithSANC: '',
    registeredNurseInSA: '',
    sancNumber: '',
    sancAPCExpiry: '',
    sancAPCStatus: '',
    highestQualification: '',
    qualificationInstitution: '',
    yearsOfClinicalExperience: '',
    primaryClinicalSpecialty: '',
    employmentStatus: '',
    currentEmployer: '',
    validPassport: '',
    passportExpiryDate: '',
    efSetScore: 0,
    efSetLevel: '',
    englishPts: 0,
    cvScore: 0,
    shortlistDecision: '',
    agreementSigned: false,
    commitmentFeeStatus: '',
    source: '',
    motivations: '',
    questions: '',
    notesFlags: '',
    photoURL: '',
    submittedAt: '',
    nextActionDueDate: '',
    lastContacted: '',
  };
}

/** Generate the internal identity assigned once when a create draft is opened. */
export function createNurseDraftId(randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto)) {
  if (typeof randomUUID !== 'function') {
    throw new Error('A cryptographic randomUUID implementation is required.');
  }
  return `nurse-${randomUUID()}`;
}

export function isNurseDraftId(value) {
  return typeof value === 'string' && NURSE_DRAFT_ID_RE.test(value);
}

/**
 * Build a complete create draft without consulting local storage or seed data.
 * Dependencies are injectable so tests can remain deterministic while production
 * uses the browser clock and crypto implementation.
 */
export function createBlankNurseDraft({
  now = new Date(),
  randomUUID = globalThis.crypto?.randomUUID?.bind(globalThis.crypto),
} = {}) {
  if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
    throw new TypeError('now must be a valid Date.');
  }

  return {
    id: createNurseDraftId(randomUUID),
    ...emptyBusinessFields(),
    submittedAt: currentLocalDate(now),
  };
}

function maxLengthForField(field) {
  if (NAME_FIELDS.includes(field)) return MAX_LENGTHS.NAME;
  if (field === 'email') return MAX_LENGTHS.EMAIL;
  if (LONG_TEXT_FIELDS.includes(field)) return MAX_LENGTHS.LONG_TEXT;
  return MAX_LENGTHS.SHORT_TEXT;
}

function sanitizeSingleLine(value, field) {
  return sanitizeText(value, { maxLength: maxLengthForField(field) });
}

function sanitizeMultiline(value) {
  return sanitizeText(value, {
    maxLength: MAX_LENGTHS.LONG_TEXT,
    allowNewlines: true,
  });
}

function normalizeNumber(value, fallback) {
  if (value === undefined || value === null) return fallback;
  if (value === '') return '';
  if (typeof value === 'number') return value;
  const trimmed = String(value).trim();
  return trimmed === '' ? '' : Number(trimmed);
}

function normalizeScorecard(value) {
  const scorecard = isPlainObject(value) ? value : {};
  return Object.fromEntries(
    SCORECARD_FIELD_NAMES.map((field) => [field, normalizeNumber(scorecard[field], 0)])
  );
}

function normalizeCertifications(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return value;
  return value.map((certification) =>
    typeof certification === 'string'
      ? sanitizeText(certification, { maxLength: MAX_LENGTHS.SHORT_TEXT })
      : certification
  );
}

function normalizeCommunicationLog(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) return value;
  return value.map((entry) => {
    if (!isPlainObject(entry)) return entry;
    return {
      ...entry,
      date: sanitizeText(entry.date, { maxLength: MAX_LENGTHS.SHORT_TEXT }),
      channel: sanitizeText(entry.channel, { maxLength: MAX_LENGTHS.SHORT_TEXT }),
      summary: sanitizeText(entry.summary, {
        maxLength: MAX_LENGTHS.LONG_TEXT,
        allowNewlines: true,
      }),
      nextAction: sanitizeText(entry.nextAction, { maxLength: MAX_LENGTHS.SHORT_TEXT }),
    };
  });
}

/** Recompute every derived value through the project's authoritative helpers. */
export function applyNurseDerivedFields(draft) {
  const withReadiness = {
    ...draft,
    readinessStatus: calculateReadinessStatus(draft.pipelineStage),
  };
  const cvScore = calculateCVScore(withReadiness);
  const finalScore = calculateFinalScore(withReadiness);
  return {
    ...withReadiness,
    cvScore,
    finalScore,
    tier: calculateTier(finalScore),
  };
}

function normalizeBusinessValues(draft) {
  const defaults = emptyBusinessFields();
  const normalized = { ...defaults };

  for (const field of SINGLE_LINE_FIELDS) {
    normalized[field] = sanitizeSingleLine(draft[field] ?? defaults[field], field);
  }
  for (const field of LONG_TEXT_FIELDS) {
    normalized[field] = sanitizeMultiline(draft[field] ?? defaults[field]);
  }

  normalized.flags = normalizeNumber(draft.flags, defaults.flags);
  normalized.efSetScore = normalizeNumber(draft.efSetScore, defaults.efSetScore);
  normalized.englishPts = normalizeNumber(draft.englishPts, defaults.englishPts);
  normalized.agreementSigned = draft.agreementSigned ?? defaults.agreementSigned;
  normalized.scorecardFields = normalizeScorecard(draft.scorecardFields);
  normalized.additionalCertifications = normalizeCertifications(draft.additionalCertifications);
  normalized.communicationLog = normalizeCommunicationLog(draft.communicationLog);

  return applyNurseDerivedFields(normalized);
}

function addError(errors, field, message) {
  if (!errors[field]) errors[field] = message;
}

function normalizedLengthWithoutCap(value, { allowNewlines = false } = {}) {
  return sanitizeText(value, { maxLength: Infinity, allowNewlines }).length;
}

function validateTextLengths(source, errors) {
  for (const field of SINGLE_LINE_FIELDS) {
    const maxLength = maxLengthForField(field);
    if (normalizedLengthWithoutCap(source[field]) > maxLength) {
      addError(errors, field, `${field} must be ${maxLength} characters or fewer.`);
    }
  }
  for (const field of LONG_TEXT_FIELDS) {
    if (normalizedLengthWithoutCap(source[field], { allowNewlines: true }) > MAX_LENGTHS.LONG_TEXT) {
      addError(errors, field, `${field} must be ${MAX_LENGTHS.LONG_TEXT} characters or fewer.`);
    }
  }
}

function validateAllowedFields(source, mode, originalBase, errors) {
  const allowed = new Set([...NURSE_BUSINESS_FIELDS, ...NURSE_METADATA_FIELDS]);
  for (const field of Object.keys(source)) {
    if (!allowed.has(field)) addError(errors, field, `${field} is not a supported nurse field.`);
  }

  if (mode === 'create') {
    for (const field of NURSE_METADATA_FIELDS) {
      if (field !== 'id' && Object.prototype.hasOwnProperty.call(source, field)) {
        addError(errors, field, `${field} is read-only.`);
      }
    }
    return;
  }

  if (!isPlainObject(originalBase)) {
    addError(errors, '_form', 'An original authoritative nurse is required for update validation.');
    return;
  }

  for (const field of NURSE_METADATA_FIELDS) {
    if (!valuesEqual(source[field], originalBase[field])) {
      addError(errors, field, `${field} is read-only.`);
    }
  }
}

function validateOptions(normalized, errors) {
  for (const [field, options] of Object.entries(NURSE_SELECT_OPTIONS)) {
    const value = normalized[field];
    if (field === 'pipelineStage') {
      if (!options.includes(value)) addError(errors, field, 'Pipeline stage is invalid.');
    } else if (value !== '' && !options.includes(value)) {
      addError(errors, field, `${field} is invalid.`);
    }
  }
}

function validateScorecard(source, normalized, errors) {
  if (source.scorecardFields !== undefined && !isPlainObject(source.scorecardFields)) {
    addError(errors, 'scorecardFields', 'Scorecard fields must be an object.');
    return;
  }
  if (isPlainObject(source.scorecardFields)) {
    for (const field of Object.keys(source.scorecardFields)) {
      if (!SCORECARD_FIELD_NAMES.includes(field)) {
        addError(errors, `scorecardFields.${field}`, `${field} is not a supported scorecard field.`);
      }
    }
  }
  for (const field of SCORECARD_FIELD_NAMES) {
    if (!validateNumber(normalized.scorecardFields[field], { min: 0, max: 5, integer: true })) {
      addError(errors, `scorecardFields.${field}`, `${field} must be a whole number from 0 to 5.`);
    }
  }
}

function validateCertifications(source, normalized, errors) {
  if (!Array.isArray(normalized.additionalCertifications)) {
    addError(errors, 'additionalCertifications', 'Additional certifications must be an array.');
    return;
  }
  normalized.additionalCertifications.forEach((certification, index) => {
    const field = `additionalCertifications.${index}`;
    if (typeof certification !== 'string' || certification.length === 0) {
      addError(errors, field, 'Each certification must be a non-empty string.');
      return;
    }
    const raw = Array.isArray(source.additionalCertifications)
      ? source.additionalCertifications[index]
      : certification;
    if (normalizedLengthWithoutCap(raw) > MAX_LENGTHS.SHORT_TEXT) {
      addError(errors, field, `Certification must be ${MAX_LENGTHS.SHORT_TEXT} characters or fewer.`);
    }
  });
}

function validateCommunicationLog(source, normalized, errors) {
  if (!Array.isArray(normalized.communicationLog)) {
    addError(errors, 'communicationLog', 'Communication log must be an array.');
    return;
  }

  normalized.communicationLog.forEach((entry, index) => {
    const prefix = `communicationLog.${index}`;
    if (!isPlainObject(entry)) {
      addError(errors, prefix, 'Each communication entry must be an object.');
      return;
    }
    for (const field of Object.keys(entry)) {
      if (!['date', 'channel', 'summary', 'nextAction'].includes(field)) {
        addError(errors, `${prefix}.${field}`, `${field} is not a supported communication field.`);
      }
    }
    if (!COMMUNICATION_CHANNELS.includes(entry.channel)) {
      addError(errors, `${prefix}.channel`, 'Communication channel is invalid.');
    }
    if (!entry.summary) {
      addError(errors, `${prefix}.summary`, 'Communication summary is required.');
    }

    const rawEntry = Array.isArray(source.communicationLog) ? source.communicationLog[index] : entry;
    if (isPlainObject(rawEntry)) {
      if (
        normalizedLengthWithoutCap(rawEntry.summary, { allowNewlines: true }) >
        MAX_LENGTHS.LONG_TEXT
      ) {
        addError(
          errors,
          `${prefix}.summary`,
          `Communication summary must be ${MAX_LENGTHS.LONG_TEXT} characters or fewer.`
        );
      }
      if (normalizedLengthWithoutCap(rawEntry.nextAction) > MAX_LENGTHS.SHORT_TEXT) {
        addError(
          errors,
          `${prefix}.nextAction`,
          `Communication next action must be ${MAX_LENGTHS.SHORT_TEXT} characters or fewer.`
        );
      }
    }
  });
}

function validateNormalizedDraft(source, normalized, { mode, originalBase }) {
  const errors = {};
  validateAllowedFields(source, mode, originalBase, errors);
  validateTextLengths(source, errors);

  const core = validateForm(normalized, {
    fullName: {
      label: 'Full name',
      required: true,
      minLength: 1,
      maxLength: MAX_LENGTHS.NAME,
    },
    email: {
      label: 'Email',
      email: true,
      maxLength: MAX_LENGTHS.EMAIL,
    },
  });
  Object.assign(errors, core.errors);

  if (normalized.email !== '' && !validateEmail(normalized.email)) {
    addError(errors, 'email', 'Email must be a valid email address.');
  }
  if (mode === 'create' && !isNurseDraftId(source.id)) {
    addError(errors, 'id', 'Create draft ID must be a nurse-prefixed UUID.');
  }
  if (mode === 'update' && (typeof source.id !== 'string' || source.id.trim() === '')) {
    addError(errors, 'id', 'Nurse ID is required.');
  }

  validateOptions(normalized, errors);
  validateScorecard(source, normalized, errors);

  if (!validateNumber(normalized.flags, { min: 0, integer: true })) {
    addError(errors, 'flags', 'Flags must be a non-negative whole number.');
  }
  if (
    normalized.englishPts !== '' &&
    !validateNumber(normalized.englishPts, { min: 0, max: 3 })
  ) {
    addError(errors, 'englishPts', 'English points must be empty or between 0 and 3.');
  }
  if (
    normalized.efSetScore !== '' &&
    !validateNumber(normalized.efSetScore, { min: 0 })
  ) {
    addError(errors, 'efSetScore', 'EF SET score must be empty or non-negative.');
  }
  if (typeof normalized.agreementSigned !== 'boolean') {
    addError(errors, 'agreementSigned', 'Agreement signed must be a boolean.');
  }

  validateCertifications(source, normalized, errors);
  validateCommunicationLog(source, normalized, errors);

  return errors;
}

function resultFor(source, normalized, options) {
  const errors = validateNormalizedDraft(source, normalized, options);
  const valid = Object.keys(errors).length === 0;
  return {
    valid,
    errors,
    firstInvalidField: valid ? null : Object.keys(errors)[0],
    draft: normalized,
    value: valid ? normalized : null,
  };
}

/** Normalize and validate a complete create draft without mutating it. */
export function normalizeNurseCreateDraft(draft) {
  if (!isPlainObject(draft)) {
    return {
      valid: false,
      errors: { _form: 'Nurse draft must be an object.' },
      firstInvalidField: '_form',
      draft: null,
      value: null,
    };
  }
  const normalized = {
    id: draft.id,
    ...normalizeBusinessValues(draft),
  };
  return resultFor(draft, normalized, { mode: 'create', originalBase: null });
}

/** Normalize and validate an edit draft against the authoritative base metadata. */
export function normalizeNurseUpdateDraft(draft, originalBase) {
  if (!isPlainObject(draft)) {
    return {
      valid: false,
      errors: { _form: 'Nurse draft must be an object.' },
      firstInvalidField: '_form',
      draft: null,
      value: null,
    };
  }
  const normalized = {
    ...normalizeBusinessValues(draft),
    ...Object.fromEntries(
      NURSE_METADATA_FIELDS.map((field) => [field, cloneValue(draft[field])])
    ),
  };
  return resultFor(draft, normalized, { mode: 'update', originalBase });
}

/** Field-level validation entry point for create and update forms. */
export function validateNurseDraft(draft, { mode = 'create', originalBase = null } = {}) {
  return mode === 'update'
    ? normalizeNurseUpdateDraft(draft, originalBase)
    : normalizeNurseCreateDraft(draft);
}

/** Return supported business fields whose local draft values differ from the edit base. */
export function diffNurseFields(originalBase, localDraft) {
  if (!isPlainObject(originalBase) || !isPlainObject(localDraft)) return [];
  return NURSE_BUSINESS_FIELDS.filter(
    (field) => !valuesEqual(originalBase[field], localDraft[field])
  );
}

/**
 * Copy only local business-field changes onto the latest committed nurse.
 * This helper is pure: it performs no persistence and leaves all inputs intact.
 */
export function rebaseNurseDraft(originalBase, localDraft, latestNurse) {
  if (!isPlainObject(originalBase) || !isPlainObject(localDraft) || !isPlainObject(latestNurse)) {
    throw new TypeError('Original base, local draft, and latest nurse must be objects.');
  }

  const rebased = cloneValue(latestNurse);
  for (const field of diffNurseFields(originalBase, localDraft)) {
    rebased[field] = cloneValue(localDraft[field]);
  }
  return rebased;
}
