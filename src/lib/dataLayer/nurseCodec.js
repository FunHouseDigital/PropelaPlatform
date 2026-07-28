import { DataError, DataErrorCode } from './errors';

/**
 * Explicit camelCase UI field to snake_case nurse-table column mapping.
 * Keep this list in sync with the nurses entry in domains.js and the migration
 * transform; it is intentionally not inferred from arbitrary input keys.
 */
export const NURSE_TYPED_FIELD_MAP = Object.freeze({
  fullName: 'full_name',
  preferredName: 'preferred_name',
  pipelineStage: 'pipeline_stage',
  readinessStatus: 'readiness_status',
  cohortAssigned: 'cohort_assigned',
  oetStatus: 'oet_status',
  finalScore: 'final_score',
  tier: 'tier',
  email: 'email',
  scorecardFields: 'scorecard_fields',
  additionalCertifications: 'additional_certifications',
  communicationLog: 'communication_log',
});

export const NURSE_METADATA_FIELD_MAP = Object.freeze({
  id: 'id',
  ownerId: 'owner_id',
  version: 'version',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
});

/** The only UI business fields permitted in the nurses.attributes JSONB value. */
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

export const NURSE_SCORECARD_FIELDS = Object.freeze([
  'hospitalExp',
  'sancStatus',
  'qualifications',
  'specialisation',
  'financialReadiness',
  'motivation',
  'passport',
]);

const TYPED_FIELDS = Object.freeze(Object.keys(NURSE_TYPED_FIELD_MAP));
const METADATA_FIELDS = Object.freeze(Object.keys(NURSE_METADATA_FIELD_MAP));
const BUSINESS_FIELDS = Object.freeze([...TYPED_FIELDS, ...NURSE_ATTRIBUTE_FIELDS]);
const BUSINESS_FIELD_SET = new Set(BUSINESS_FIELDS);
const METADATA_FIELD_SET = new Set([
  ...METADATA_FIELDS,
  ...Object.values(NURSE_METADATA_FIELD_MAP),
]);
const ROW_FIELD_SET = new Set([
  ...Object.values(NURSE_TYPED_FIELD_MAP),
  ...Object.values(NURSE_METADATA_FIELD_MAP),
  'attributes',
]);
const ATTRIBUTE_FIELD_SET = new Set(NURSE_ATTRIBUTE_FIELDS);
const SCORECARD_FIELD_SET = new Set(NURSE_SCORECARD_FIELDS);
const ATTRIBUTE_PRECEDENCE_KEYS = new Set([
  ...TYPED_FIELDS,
  ...Object.values(NURSE_TYPED_FIELD_MAP),
  ...METADATA_FIELDS,
  ...Object.values(NURSE_METADATA_FIELD_MAP),
]);

const ATTRIBUTE_TEXT_FIELDS = Object.freeze(
  NURSE_ATTRIBUTE_FIELDS.filter(
    (field) =>
      ![
        'flags',
        'efSetScore',
        'englishPts',
        'cvScore',
        'agreementSigned',
      ].includes(field),
  ),
);

export const DEFAULT_SCORECARD_FIELDS = Object.freeze(
  Object.fromEntries(NURSE_SCORECARD_FIELDS.map((field) => [field, 0])),
);

export const DEFAULT_NURSE_ATTRIBUTES = Object.freeze({
  ...Object.fromEntries(ATTRIBUTE_TEXT_FIELDS.map((field) => [field, ''])),
  flags: 0,
  efSetScore: 0,
  englishPts: 0,
  cvScore: 0,
  agreementSigned: false,
});

function validationFailure(message) {
  throw new DataError(DataErrorCode.VALIDATION, message);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function hasOwn(object, key) {
  return Object.prototype.hasOwnProperty.call(object, key);
}

function requirePlainObject(value, label) {
  if (!isPlainObject(value)) validationFailure(`${label} must be a plain object.`);
  return value;
}

function requireNonEmptyString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    validationFailure(`${label} must be a non-empty string.`);
  }
  return value;
}

function normalizeNullableText(value, label) {
  if (value == null) return '';
  if (typeof value !== 'string') validationFailure(`${label} must be a string or null.`);
  return value;
}

function encodeNullableText(value, label) {
  const normalized = normalizeNullableText(value, label);
  return normalized === '' ? null : normalized;
}

function toFiniteNumber(value, label, { nullable = false, allowEmpty = false } = {}) {
  if (value == null) {
    if (nullable) return null;
    validationFailure(`${label} must be a finite number.`);
  }
  if (allowEmpty && value === '') return '';

  const converted =
    typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  if (typeof converted !== 'number' || !Number.isFinite(converted)) {
    validationFailure(`${label} must be a finite number.`);
  }
  return converted;
}

function normalizeScorecard(value) {
  if (value == null) return { ...DEFAULT_SCORECARD_FIELDS };
  requirePlainObject(value, 'scorecard_fields');

  for (const key of Object.keys(value)) {
    if (!SCORECARD_FIELD_SET.has(key)) {
      validationFailure(`scorecard_fields contains unsupported field "${key}".`);
    }
  }

  return Object.fromEntries(
    NURSE_SCORECARD_FIELDS.map((field) => [
      field,
      hasOwn(value, field)
        ? toFiniteNumber(value[field], `scorecard_fields.${field}`)
        : 0,
    ]),
  );
}

function normalizeStringArray(value) {
  if (value == null) return [];
  if (!Array.isArray(value)) {
    validationFailure('additional_certifications must be an array.');
  }
  return value.map((entry, index) => {
    if (typeof entry !== 'string') {
      validationFailure(`additional_certifications[${index}] must be a string.`);
    }
    return entry;
  });
}

function normalizeCommunicationLog(value) {
  if (value == null) return [];
  if (!Array.isArray(value)) validationFailure('communication_log must be an array.');

  const allowedKeys = new Set(['date', 'channel', 'summary', 'nextAction']);
  return value.map((entry, index) => {
    requirePlainObject(entry, `communication_log[${index}]`);
    for (const key of Object.keys(entry)) {
      if (!allowedKeys.has(key)) {
        validationFailure(
          `communication_log[${index}] contains unsupported field "${key}".`,
        );
      }
    }
    for (const field of ['date', 'channel', 'summary']) {
      if (typeof entry[field] !== 'string') {
        validationFailure(`communication_log[${index}].${field} must be a string.`);
      }
    }
    if (hasOwn(entry, 'nextAction') && typeof entry.nextAction !== 'string') {
      validationFailure(`communication_log[${index}].nextAction must be a string.`);
    }
    return hasOwn(entry, 'nextAction')
      ? {
          date: entry.date,
          channel: entry.channel,
          summary: entry.summary,
          nextAction: entry.nextAction,
        }
      : { date: entry.date, channel: entry.channel, summary: entry.summary };
  });
}

function normalizeAttributeValue(field, value) {
  if (ATTRIBUTE_TEXT_FIELDS.includes(field)) {
    return normalizeNullableText(value, `attributes.${field}`);
  }
  if (field === 'agreementSigned') {
    if (value == null) return false;
    if (typeof value !== 'boolean') {
      validationFailure('attributes.agreementSigned must be a boolean.');
    }
    return value;
  }
  if (field === 'efSetScore' || field === 'englishPts') {
    if (value == null) return 0;
    return toFiniteNumber(value, `attributes.${field}`, { allowEmpty: true });
  }
  if (value == null) return 0;
  return toFiniteNumber(value, `attributes.${field}`);
}

function normalizeAttributes(value) {
  if (value == null) return { ...DEFAULT_NURSE_ATTRIBUTES };
  requirePlainObject(value, 'attributes');

  const normalized = { ...DEFAULT_NURSE_ATTRIBUTES };
  for (const [key, entry] of Object.entries(value)) {
    // Older migration rows may contain duplicate typed fields or metadata in
    // attributes. The typed/database-owned column always wins.
    if (ATTRIBUTE_PRECEDENCE_KEYS.has(key)) continue;
    if (!ATTRIBUTE_FIELD_SET.has(key)) {
      validationFailure(`attributes contains unsupported field "${key}".`);
    }
    normalized[key] = normalizeAttributeValue(key, entry);
  }
  return normalized;
}

function validateBusinessInput(input) {
  requirePlainObject(input, 'Nurse input');
  for (const key of Object.keys(input)) {
    if (METADATA_FIELD_SET.has(key)) {
      validationFailure(`Authoritative metadata field "${key}" is not editable.`);
    }
    if (!BUSINESS_FIELD_SET.has(key)) {
      validationFailure(`Nurse input contains unsupported field "${key}".`);
    }
  }
  return input;
}

function normalizedAttributeSubset(input, includeDefaults) {
  const result = includeDefaults ? { ...DEFAULT_NURSE_ATTRIBUTES } : {};
  for (const field of NURSE_ATTRIBUTE_FIELDS) {
    if (hasOwn(input, field)) {
      result[field] = normalizeAttributeValue(field, input[field]);
    }
  }
  return result;
}

function encodeTypedField(field, value) {
  switch (field) {
    case 'fullName':
      return requireNonEmptyString(value, 'fullName');
    case 'finalScore':
      if (value === '') return null;
      return toFiniteNumber(value, 'finalScore', { nullable: true });
    case 'scorecardFields':
      return normalizeScorecard(value);
    case 'additionalCertifications':
      return normalizeStringArray(value);
    case 'communicationLog':
      return normalizeCommunicationLog(value);
    default:
      return encodeNullableText(value, field);
  }
}

function defaultTypedValue(field) {
  switch (field) {
    case 'fullName':
      return undefined;
    case 'finalScore':
      return null;
    case 'scorecardFields':
      return { ...DEFAULT_SCORECARD_FIELDS };
    case 'additionalCertifications':
    case 'communicationLog':
      return [];
    default:
      return '';
  }
}

/**
 * Decode one strict Supabase nurses row into the established camelCase Nurse.
 * Throws a VALIDATION DataError on any malformed/unsupported value and never
 * returns a partial model.
 */
export function fromNurseRow(row) {
  requirePlainObject(row, 'Nurse row');

  for (const key of Object.keys(row)) {
    if (!ROW_FIELD_SET.has(key)) {
      validationFailure(`Nurse row contains unsupported column "${key}".`);
    }
  }
  for (const key of ROW_FIELD_SET) {
    if (!hasOwn(row, key)) validationFailure(`Nurse row is missing column "${key}".`);
  }

  const id = requireNonEmptyString(row.id, 'id');
  if (row.owner_id !== null && typeof row.owner_id !== 'string') {
    validationFailure('owner_id must be a string or null.');
  }
  if (!Number.isInteger(row.version) || row.version < 1) {
    validationFailure('version must be a positive integer.');
  }
  const createdAt = requireNonEmptyString(row.created_at, 'created_at');
  const updatedAt = requireNonEmptyString(row.updated_at, 'updated_at');
  const fullName = requireNonEmptyString(row.full_name, 'full_name');

  const attributes = normalizeAttributes(row.attributes);
  return {
    ...attributes,
    id,
    ownerId: row.owner_id,
    fullName,
    preferredName: normalizeNullableText(row.preferred_name, 'preferred_name'),
    pipelineStage: normalizeNullableText(row.pipeline_stage, 'pipeline_stage'),
    readinessStatus: normalizeNullableText(row.readiness_status, 'readiness_status'),
    cohortAssigned: normalizeNullableText(row.cohort_assigned, 'cohort_assigned'),
    oetStatus: normalizeNullableText(row.oet_status, 'oet_status'),
    finalScore: toFiniteNumber(row.final_score, 'final_score', { nullable: true }),
    tier: normalizeNullableText(row.tier, 'tier'),
    email: normalizeNullableText(row.email, 'email'),
    scorecardFields: normalizeScorecard(row.scorecard_fields),
    additionalCertifications: normalizeStringArray(row.additional_certifications),
    communicationLog: normalizeCommunicationLog(row.communication_log),
    version: row.version,
    createdAt,
    updatedAt,
  };
}

/** Decode a complete row list; one invalid row rejects the complete operation. */
export function fromNurseRows(rows) {
  if (!Array.isArray(rows)) validationFailure('Nurse rows must be an array.');
  return rows.map((row) => fromNurseRow(row));
}

/**
 * Encode a create draft. Identity/ownership are supplied separately from the
 * editable draft so form data can never set authoritative metadata.
 */
export function toNurseCreateRow(draft, { id, ownerId } = {}) {
  validateBusinessInput(draft);
  requireNonEmptyString(id, 'id');
  requireNonEmptyString(ownerId, 'ownerId');

  const row = { id, owner_id: ownerId };
  for (const [field, column] of Object.entries(NURSE_TYPED_FIELD_MAP)) {
    const value = hasOwn(draft, field) ? draft[field] : defaultTypedValue(field);
    row[column] = encodeTypedField(field, value);
  }
  row.attributes = normalizedAttributeSubset(draft, true);
  return row;
}

/**
 * Encode only supplied editable fields for an update. Metadata is rejected and
 * can only travel through the repository's id/baseVersion mutation contract.
 */
export function toNurseUpdatePatch(patch) {
  validateBusinessInput(patch);

  const changes = {};
  for (const [field, column] of Object.entries(NURSE_TYPED_FIELD_MAP)) {
    if (hasOwn(patch, field)) changes[column] = encodeTypedField(field, patch[field]);
  }

  const hasAttributeChange = NURSE_ATTRIBUTE_FIELDS.some((field) => hasOwn(patch, field));
  if (hasAttributeChange) changes.attributes = normalizedAttributeSubset(patch, false);
  return changes;
}

export default {
  fromNurseRow,
  fromNurseRows,
  toNurseCreateRow,
  toNurseUpdatePatch,
};
