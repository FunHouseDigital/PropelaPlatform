import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';

import { PROVINCES } from '../../lib/constants';
import {
  NURSE_SELECT_OPTIONS,
  SCORECARD_FIELD_NAMES,
  validateNurseDraft,
} from '../../lib/nurses/nurseWorkflow';
import ResponsiveModal from '../ui/ResponsiveModal';

const ERROR_TITLES = {
  AUTH: 'Authentication required',
  FORBIDDEN: 'Permission denied',
  NETWORK: 'Network error',
  STORAGE: 'Storage error',
  VALIDATION: 'Check the highlighted fields',
  UNKNOWN: 'Nurse could not be created',
};

const SCORECARD_LABELS = {
  hospitalExp: 'Hospital experience',
  sancStatus: 'SANC status',
  qualifications: 'Qualifications',
  specialisation: 'Specialisation',
  financialReadiness: 'Financial readiness',
  motivation: 'Motivation',
  passport: 'Passport',
};

const INPUT_CLASS =
  'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 focus:border-propela-purple focus:outline-none focus:ring-1 focus:ring-propela-purple disabled:cursor-not-allowed disabled:bg-gray-100';
const ERROR_INPUT_CLASS = 'border-red-400 focus:border-red-500 focus:ring-red-500';

function Field({ label, name, error, children, hint }) {
  const labelId = `${name}-label`;
  const errorId = error ? `${name}-error` : undefined;
  const hintId = hint ? `${name}-hint` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(' ') || undefined;

  return (
    <div>
      <span id={labelId} className="mb-1 block text-sm font-medium text-gray-700">
        {label}
      </span>
      {children({
        id: name,
        'aria-labelledby': labelId,
        'aria-invalid': Boolean(error),
        'aria-describedby': describedBy,
      })}
      {error && (
        <p id={errorId} className="mt-1 text-xs font-medium text-red-700">
          {error}
        </p>
      )}
      {hint && (
        <p id={hintId} className="mt-1 text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}

function SelectField({ label, name, value, options, error, disabled, onChange }) {
  return (
    <Field label={label} name={name} error={error}>
      {(accessibility) => (
        <select
          {...accessibility}
          name={name}
          value={value ?? ''}
          disabled={disabled}
          onChange={(event) => onChange(name, event.target.value)}
          className={`${INPUT_CLASS} ${error ? ERROR_INPUT_CLASS : ''}`}
        >
          {name !== 'pipelineStage' && <option value="">Select an option</option>}
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}

function TextField({
  label,
  name,
  value,
  error,
  disabled,
  onChange,
  type = 'text',
  required = false,
  multiline = false,
}) {
  return (
    <Field label={label} name={name} error={error}>
      {(accessibility) => {
        const props = {
          ...accessibility,
          name,
          value: value ?? '',
          disabled,
          required,
          onChange: (event) => onChange(name, event.target.value),
          className: `${INPUT_CLASS} ${error ? ERROR_INPUT_CLASS : ''}`,
        };
        return multiline ? <textarea {...props} rows={3} /> : <input {...props} type={type} />;
      }}
    </Field>
  );
}

export default function NurseCreateModal({
  isOpen,
  nurseSlice,
  onUpdateDraft,
  onClose,
  onSubmit,
  onRetry,
  onRetryCollision,
  onCommitted,
}) {
  const [localValidation, setLocalValidation] = useState({
    draftId: null,
    errors: {},
  });
  const submittingRef = useRef(false);
  const formRef = useRef(null);
  const draft = nurseSlice?.createDraft;
  const draftId = draft?.id;
  const isSubmitting = nurseSlice?.createState === 'loading';
  const visibleLocalErrors = localValidation.draftId === draftId ? localValidation.errors : {};
  const errors = {
    ...(nurseSlice?.createValidation?.errors || {}),
    ...visibleLocalErrors,
  };

  const focusInvalidField = useCallback((firstInvalidField) => {
    if (!firstInvalidField || !formRef.current) return;
    const field = Array.from(formRef.current.elements).find(
      (element) => element.name === firstInvalidField
    );
    if (field) field.focus();
    else formRef.current.focus();
  }, []);

  const updateField = useCallback(
    (field, value) => {
      setLocalValidation((current) => {
        if (current.draftId !== draftId || !current.errors[field]) return current;
        const nextErrors = { ...current.errors };
        delete nextErrors[field];
        return { ...current, errors: nextErrors };
      });
      onUpdateDraft({ [field]: value });
    },
    [draftId, onUpdateDraft]
  );

  const updateNumber = useCallback(
    (field, value) => updateField(field, value === '' ? '' : Number(value)),
    [updateField]
  );

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!draft || isSubmitting || submittingRef.current) return;

    const validation = validateNurseDraft(draft, { mode: 'create' });
    if (!validation.valid) {
      setLocalValidation({ draftId: draft.id, errors: validation.errors });
      focusInvalidField(validation.firstInvalidField);
      return;
    }

    setLocalValidation({ draftId: draft.id, errors: {} });
    submittingRef.current = true;
    try {
      const result = await onSubmit();
      if (result?.status === 'saved') onCommitted?.(result.nurse);
      else if (result?.validation?.firstInvalidField) {
        focusInvalidField(result.validation.firstInvalidField);
      }
    } finally {
      submittingRef.current = false;
    }
  };

  const handleRetry = async (retry) => {
    if (isSubmitting || submittingRef.current) return;
    submittingRef.current = true;
    try {
      const result = await retry();
      if (result?.status === 'saved') onCommitted?.(result.nurse);
    } finally {
      submittingRef.current = false;
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    setLocalValidation({ draftId: null, errors: {} });
    submittingRef.current = false;
    onClose();
  };

  if (!isOpen || !draft) return null;

  const error = nurseSlice?.createError;
  const decision = nurseSlice?.createDecision;
  const canRetryFailure = decision?.type === 'createFailure' && decision.retryAvailable === true;
  const canRetryCollision =
    decision?.type === 'createCollision' && decision.retryAvailable === true;

  return (
    <ResponsiveModal isOpen={isOpen} onClose={handleClose} title="Add Nurse" size="lg">
      <form ref={formRef} onSubmit={handleSubmit} noValidate tabIndex={-1}>
        <p className="mb-5 text-sm text-gray-600">
          Enter the nurse&apos;s business details. Record ownership and system metadata are set
          automatically when the nurse is saved.
        </p>

        {error && (
          <div
            role="alert"
            className="mb-5 flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3"
          >
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                {ERROR_TITLES[error.code] || ERROR_TITLES.UNKNOWN}
              </p>
              <p className="mt-0.5 text-sm text-red-700">
                {error.message || 'Your entries were kept. Please review the form and try again.'}
              </p>
            </div>
          </div>
        )}

        <fieldset disabled={isSubmitting} className="space-y-6">
          <legend className="sr-only">Nurse business details</legend>

          <section aria-labelledby="create-contact-heading">
            <h3 id="create-contact-heading" className="mb-3 text-sm font-semibold text-gray-900">
              Contact details
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <TextField
                label="Full name"
                name="fullName"
                value={draft.fullName}
                error={errors.fullName}
                disabled={isSubmitting}
                onChange={updateField}
                required
              />
              <TextField
                label="Preferred name"
                name="preferredName"
                value={draft.preferredName}
                error={errors.preferredName}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <TextField
                label="Email"
                name="email"
                value={draft.email}
                error={errors.email}
                disabled={isSubmitting}
                onChange={updateField}
                type="email"
              />
              <TextField
                label="Contact number"
                name="contactNumber"
                value={draft.contactNumber}
                error={errors.contactNumber}
                disabled={isSubmitting}
                onChange={updateField}
                type="tel"
              />
              <SelectField
                label="Gender"
                name="gender"
                value={draft.gender}
                options={NURSE_SELECT_OPTIONS.gender}
                error={errors.gender}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <SelectField
                label="Age group"
                name="ageGroup"
                value={draft.ageGroup}
                options={NURSE_SELECT_OPTIONS.ageGroup}
                error={errors.ageGroup}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <SelectField
                label="Province"
                name="province"
                value={draft.province}
                options={PROVINCES}
                error={errors.province}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <TextField
                label="City"
                name="city"
                value={draft.city}
                error={errors.city}
                disabled={isSubmitting}
                onChange={updateField}
              />
            </div>
          </section>

          <section aria-labelledby="create-application-heading">
            <h3
              id="create-application-heading"
              className="mb-3 text-sm font-semibold text-gray-900"
            >
              Application
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="Pipeline stage"
                name="pipelineStage"
                value={draft.pipelineStage}
                options={NURSE_SELECT_OPTIONS.pipelineStage}
                error={errors.pipelineStage}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <SelectField
                label="Next action"
                name="nextAction"
                value={draft.nextAction}
                options={NURSE_SELECT_OPTIONS.nextAction}
                error={errors.nextAction}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <TextField
                label="Cohort"
                name="cohortAssigned"
                value={draft.cohortAssigned}
                error={errors.cohortAssigned}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <SelectField
                label="Source"
                name="source"
                value={draft.source}
                options={NURSE_SELECT_OPTIONS.source}
                error={errors.source}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <TextField
                label="Submitted date"
                name="submittedAt"
                value={draft.submittedAt}
                error={errors.submittedAt}
                disabled={isSubmitting}
                onChange={updateField}
                type="date"
              />
              <TextField
                label="Next action due"
                name="nextActionDueDate"
                value={draft.nextActionDueDate}
                error={errors.nextActionDueDate}
                disabled={isSubmitting}
                onChange={updateField}
                type="date"
              />
            </div>
          </section>

          <section aria-labelledby="create-professional-heading">
            <h3
              id="create-professional-heading"
              className="mb-3 text-sm font-semibold text-gray-900"
            >
              Professional details
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="Registered with SANC"
                name="registeredWithSANC"
                value={draft.registeredWithSANC}
                options={NURSE_SELECT_OPTIONS.registeredWithSANC}
                error={errors.registeredWithSANC}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <SelectField
                label="Registered nurse in South Africa"
                name="registeredNurseInSA"
                value={draft.registeredNurseInSA}
                options={NURSE_SELECT_OPTIONS.registeredNurseInSA}
                error={errors.registeredNurseInSA}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <TextField
                label="SANC number"
                name="sancNumber"
                value={draft.sancNumber}
                error={errors.sancNumber}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <SelectField
                label="SANC APC status"
                name="sancAPCStatus"
                value={draft.sancAPCStatus}
                options={NURSE_SELECT_OPTIONS.sancAPCStatus}
                error={errors.sancAPCStatus}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <TextField
                label="SANC APC expiry"
                name="sancAPCExpiry"
                value={draft.sancAPCExpiry}
                error={errors.sancAPCExpiry}
                disabled={isSubmitting}
                onChange={updateField}
                type="date"
              />
              <SelectField
                label="Highest qualification"
                name="highestQualification"
                value={draft.highestQualification}
                options={NURSE_SELECT_OPTIONS.highestQualification}
                error={errors.highestQualification}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <TextField
                label="Qualification institution"
                name="qualificationInstitution"
                value={draft.qualificationInstitution}
                error={errors.qualificationInstitution}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <SelectField
                label="Years of clinical experience"
                name="yearsOfClinicalExperience"
                value={draft.yearsOfClinicalExperience}
                options={NURSE_SELECT_OPTIONS.yearsOfClinicalExperience}
                error={errors.yearsOfClinicalExperience}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <SelectField
                label="Primary clinical specialty"
                name="primaryClinicalSpecialty"
                value={draft.primaryClinicalSpecialty}
                options={NURSE_SELECT_OPTIONS.primaryClinicalSpecialty}
                error={errors.primaryClinicalSpecialty}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <SelectField
                label="Employment status"
                name="employmentStatus"
                value={draft.employmentStatus}
                options={NURSE_SELECT_OPTIONS.employmentStatus}
                error={errors.employmentStatus}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <TextField
                label="Current employer"
                name="currentEmployer"
                value={draft.currentEmployer}
                error={errors.currentEmployer}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <SelectField
                label="Valid passport"
                name="validPassport"
                value={draft.validPassport}
                options={NURSE_SELECT_OPTIONS.validPassport}
                error={errors.validPassport}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <TextField
                label="Passport expiry date"
                name="passportExpiryDate"
                value={draft.passportExpiryDate}
                error={errors.passportExpiryDate}
                disabled={isSubmitting}
                onChange={updateField}
                type="date"
              />
            </div>
          </section>

          <section aria-labelledby="create-assessment-heading">
            <h3 id="create-assessment-heading" className="mb-3 text-sm font-semibold text-gray-900">
              Assessment
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectField
                label="OET status"
                name="oetStatus"
                value={draft.oetStatus}
                options={NURSE_SELECT_OPTIONS.oetStatus}
                error={errors.oetStatus}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <SelectField
                label="EF SET level"
                name="efSetLevel"
                value={draft.efSetLevel}
                options={NURSE_SELECT_OPTIONS.efSetLevel}
                error={errors.efSetLevel}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <Field label="EF SET score" name="efSetScore" error={errors.efSetScore}>
                {(accessibility) => (
                  <input
                    {...accessibility}
                    name="efSetScore"
                    type="number"
                    min="0"
                    value={draft.efSetScore ?? ''}
                    disabled={isSubmitting}
                    onChange={(event) => updateNumber('efSetScore', event.target.value)}
                    className={`${INPUT_CLASS} ${errors.efSetScore ? ERROR_INPUT_CLASS : ''}`}
                  />
                )}
              </Field>
              <Field label="English points" name="englishPts" error={errors.englishPts}>
                {(accessibility) => (
                  <input
                    {...accessibility}
                    name="englishPts"
                    type="number"
                    min="0"
                    max="3"
                    step="0.1"
                    value={draft.englishPts ?? ''}
                    disabled={isSubmitting}
                    onChange={(event) => updateNumber('englishPts', event.target.value)}
                    className={`${INPUT_CLASS} ${errors.englishPts ? ERROR_INPUT_CLASS : ''}`}
                  />
                )}
              </Field>
              <SelectField
                label="Shortlist decision"
                name="shortlistDecision"
                value={draft.shortlistDecision}
                options={NURSE_SELECT_OPTIONS.shortlistDecision}
                error={errors.shortlistDecision}
                disabled={isSubmitting}
                onChange={updateField}
              />
              <SelectField
                label="Commitment fee status"
                name="commitmentFeeStatus"
                value={draft.commitmentFeeStatus}
                options={NURSE_SELECT_OPTIONS.commitmentFeeStatus}
                error={errors.commitmentFeeStatus}
                disabled={isSubmitting}
                onChange={updateField}
              />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {SCORECARD_FIELD_NAMES.map((field) => {
                const name = `scorecardFields.${field}`;
                return (
                  <Field
                    key={field}
                    label={SCORECARD_LABELS[field]}
                    name={name}
                    error={errors[name]}
                  >
                    {(accessibility) => (
                      <input
                        {...accessibility}
                        name={name}
                        type="number"
                        min="0"
                        max="5"
                        step="1"
                        value={draft.scorecardFields?.[field] ?? 0}
                        disabled={isSubmitting}
                        onChange={(event) =>
                          onUpdateDraft({
                            scorecardFields: {
                              ...draft.scorecardFields,
                              [field]: event.target.value === '' ? '' : Number(event.target.value),
                            },
                          })
                        }
                        className={`${INPUT_CLASS} ${errors[name] ? ERROR_INPUT_CLASS : ''}`}
                      />
                    )}
                  </Field>
                );
              })}
            </div>
            <label
              htmlFor="agreementSigned"
              className="mt-4 flex items-center gap-2 text-sm font-medium text-gray-700"
            >
              <input
                id="agreementSigned"
                name="agreementSigned"
                type="checkbox"
                checked={Boolean(draft.agreementSigned)}
                disabled={isSubmitting}
                onChange={(event) => updateField('agreementSigned', event.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-propela-purple focus:ring-propela-purple"
              />
              Agreement signed
            </label>
          </section>

          <section aria-labelledby="create-notes-heading">
            <h3 id="create-notes-heading" className="mb-3 text-sm font-semibold text-gray-900">
              Notes
            </h3>
            <div className="space-y-4">
              <TextField
                label="Motivations"
                name="motivations"
                value={draft.motivations}
                error={errors.motivations}
                disabled={isSubmitting}
                onChange={updateField}
                multiline
              />
              <TextField
                label="Questions"
                name="questions"
                value={draft.questions}
                error={errors.questions}
                disabled={isSubmitting}
                onChange={updateField}
                multiline
              />
              <TextField
                label="Notes and flags"
                name="notesFlags"
                value={draft.notesFlags}
                error={errors.notesFlags}
                disabled={isSubmitting}
                onChange={updateField}
                multiline
              />
              <Field
                label="Additional certifications"
                name="additionalCertifications"
                error={errors.additionalCertifications}
                hint="Enter one certification per line."
              >
                {(accessibility) => (
                  <textarea
                    {...accessibility}
                    name="additionalCertifications"
                    rows={3}
                    value={(draft.additionalCertifications || []).join('\n')}
                    disabled={isSubmitting}
                    onChange={(event) =>
                      updateField(
                        'additionalCertifications',
                        event.target.value.split('\n').filter((value) => value.trim() !== '')
                      )
                    }
                    className={`${INPUT_CLASS} ${errors.additionalCertifications ? ERROR_INPUT_CLASS : ''}`}
                  />
                )}
              </Field>
            </div>
          </section>
        </fieldset>

        <div className="mt-6 flex flex-wrap justify-end gap-2 border-t border-gray-100 pt-4">
          {canRetryFailure && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleRetry(onRetry)}
              className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Retry
            </button>
          )}
          {canRetryCollision && (
            <button
              type="button"
              disabled={isSubmitting}
              onClick={() => handleRetry(onRetryCollision)}
              className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Retry with a new ID
            </button>
          )}
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleClose}
            className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex min-w-28 items-center justify-center gap-2 rounded-lg bg-propela-purple px-4 py-2 text-sm font-medium text-white hover:bg-propela-purple/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting && <LoaderCircle size={16} className="animate-spin" />}
            {isSubmitting ? 'Creating...' : 'Create nurse'}
          </button>
        </div>
      </form>
    </ResponsiveModal>
  );
}
