import {
  AlertTriangle,
  Calendar,
  ChevronDown,
  ChevronRight,
  Flag,
  LoaderCircle,
  MessageSquare,
  Plus,
  Star,
  StarHalf,
  Trash2,
  X,
} from 'lucide-react';
import { useState } from 'react';

import {
  calculateCVScore,
  calculateFinalScore,
  calculateReadinessStatus,
  calculateTier,
} from '../../lib/calculations';
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
} from '../../lib/constants';
import { diffNurseFields } from '../../lib/nurses/nurseWorkflow';
import { MAX_LENGTHS, sanitizeText, validateRequired } from '../../lib/validation';
import BodyPortal from '../ui/BodyPortal';
import ConfirmationDialog from '../ui/ConfirmationDialog';
import DeleteNurseDialog from './DeleteNurseDialog';

const RECOVERABLE_CODES = new Set(['NETWORK', 'UNKNOWN', 'STORAGE']);
const ERROR_TITLES = {
  AUTH: 'Authentication required',
  FORBIDDEN: 'Permission denied',
  NETWORK: 'Network error',
  STORAGE: 'Storage error',
  VALIDATION: 'Validation failed',
  UNKNOWN: 'Could not save nurse',
};

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
    if (due.getTime() === today.getTime()) {
      return { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200' };
    }
  }
  return { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-200' };
}

function renderStars(score = 0) {
  const stars = [];
  const fullStars = Math.floor(Number(score) || 0);
  const fraction = (Number(score) || 0) - fullStars;
  const hasHalf = fraction >= 0.3 && fraction < 0.8;
  const fullExtra = fraction >= 0.8 ? 1 : 0;
  for (let index = 0; index < fullStars + fullExtra; index += 1) {
    stars.push(<Star key={`full-${index}`} size={14} className="fill-amber-400 text-amber-400" />);
  }
  if (hasHalf) {
    stars.push(<StarHalf key="half" size={14} className="fill-amber-400 text-amber-400" />);
  }
  const remaining = Math.max(0, 5 - (fullStars + fullExtra + (hasHalf ? 1 : 0)));
  for (let index = 0; index < remaining; index += 1) {
    stars.push(<Star key={`empty-${index}`} size={14} className="text-gray-300" />);
  }
  return stars;
}

function Section({ title, defaultOpen = false, children }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 last:border-b-0">
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        {title}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

function FieldRow({ label, error, children }) {
  return (
    <div className="flex items-start py-1.5">
      <span className="w-40 shrink-0 text-xs text-gray-500">{label}</span>
      <div className="min-w-0 flex-1 text-sm text-gray-900">
        {children}
        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    </div>
  );
}

const INPUT_CLASS =
  'w-full rounded border border-transparent bg-transparent px-2 py-1 text-sm text-gray-900 hover:border-gray-200 focus:border-gray-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-propela-purple disabled:cursor-not-allowed disabled:bg-gray-50 disabled:text-gray-500';

function EditableSelect({ value, options, onChange, disabled = false, className = '', ariaLabel }) {
  return (
    <select
      value={value || ''}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      aria-label={ariaLabel}
      className={`min-w-0 max-w-full rounded border border-gray-200 px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-propela-purple disabled:cursor-not-allowed disabled:bg-gray-100 md:max-w-none ${className}`}
    >
      <option value="">-- Select --</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  );
}

function EditableText({
  value,
  onChange,
  disabled = false,
  placeholder = '',
  type = 'text',
  ariaLabel,
}) {
  return (
    <input
      type={type}
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={ariaLabel}
      className={INPUT_CLASS}
    />
  );
}

function EditableNumber({ value, onChange, disabled = false, min, max, ariaLabel }) {
  return (
    <input
      type="number"
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value === '' ? '' : Number(event.target.value))}
      disabled={disabled}
      min={min}
      max={max}
      aria-label={ariaLabel}
      className={INPUT_CLASS}
    />
  );
}

function EditableTextarea({ value, onChange, disabled = false, placeholder = '', ariaLabel }) {
  return (
    <textarea
      value={value ?? ''}
      onChange={(event) => onChange(event.target.value)}
      disabled={disabled}
      placeholder={placeholder}
      aria-label={ariaLabel}
      rows={3}
      className={`${INPUT_CLASS} resize-y leading-snug`}
    />
  );
}

function ScorecardField({ label, weight, value, onChange, disabled }) {
  return (
    <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 py-1 md:flex-nowrap md:gap-2">
      <span className="w-full min-w-0 shrink-0 text-xs text-gray-600 md:w-36">
        {label} <span className="text-gray-400">(x{weight})</span>
      </span>
      <div className="flex min-w-0 flex-wrap items-center gap-1 md:flex-nowrap">
        {[1, 2, 3, 4, 5].map((number) => (
          <button
            key={number}
            type="button"
            disabled={disabled}
            aria-label={`${label} ${number}`}
            onClick={() => onChange(number)}
            className={`h-7 w-7 shrink-0 rounded border text-xs font-medium disabled:cursor-not-allowed disabled:opacity-60 ${
              value === number
                ? 'border-propela-purple bg-propela-purple text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:border-propela-purple-mid'
            }`}
          >
            {number}
          </button>
        ))}
      </div>
    </div>
  );
}

function formatDifference(value) {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value))
    return (
      value.map((item) => (typeof item === 'object' ? JSON.stringify(item) : item)).join(', ') ||
      '—'
    );
  if (typeof value === 'object') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return String(value);
}

function DetailStatePanel({ state, error, onRetry, onClose }) {
  if (state === 'loading' || state === 'idle') {
    return (
      <div
        role="status"
        className="flex items-center gap-2 rounded-xl bg-white p-5 text-sm text-gray-700 shadow-xl"
      >
        <LoaderCircle size={18} className="animate-spin text-propela-purple" />
        Loading nurse details...
      </div>
    );
  }
  if (state === 'notFound') {
    return (
      <div
        role="dialog"
        aria-labelledby="nurse-not-found-title"
        className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
      >
        <h2 id="nurse-not-found-title" className="font-semibold text-gray-900">
          This nurse no longer exists
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          The stale list entry was removed. No changes were saved.
        </p>
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-propela-purple px-3 py-2 text-sm font-medium text-white"
          >
            Close
          </button>
        </div>
      </div>
    );
  }
  const code = error?.code || 'UNKNOWN';
  return (
    <div
      role="dialog"
      aria-labelledby="nurse-detail-error-title"
      className="w-full max-w-md rounded-xl bg-white p-5 shadow-xl"
    >
      <h2 id="nurse-detail-error-title" className="font-semibold text-gray-900">
        {ERROR_TITLES[code] || 'Could not load nurse details'}
      </h2>
      <p role="alert" className="mt-2 text-sm text-gray-600">
        {error?.message || 'The authoritative nurse record could not be loaded.'}
      </p>
      <div className="mt-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600"
        >
          Close
        </button>
        {RECOVERABLE_CODES.has(code) && (
          <button
            type="button"
            onClick={() => onRetry?.()}
            className="rounded-lg bg-propela-purple px-3 py-2 text-sm font-medium text-white"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

function ConflictPanel({
  originalBase,
  draft,
  decision,
  onReview,
  reviewOpen,
  onRebase,
  onRequestDiscard,
  onKeepEditing,
}) {
  const latest = decision?.latest;
  const changedFields = latest ? diffNurseFields(originalBase, draft) : [];
  return (
    <div
      role="alert"
      className="m-4 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
    >
      <div className="flex gap-2">
        <AlertTriangle size={18} className="mt-0.5 shrink-0" />
        <div>
          <p className="font-semibold">This nurse changed after you opened it</p>
          <p className="mt-1">
            Your draft is still intact. Review the differences before deciding what to do.
          </p>
        </div>
      </div>
      {reviewOpen && (
        <div className="mt-3 overflow-x-auto rounded border border-amber-200 bg-white">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-amber-100">
                <th className="p-2">Field</th>
                <th className="p-2">Your draft</th>
                <th className="p-2">Latest saved</th>
              </tr>
            </thead>
            <tbody>
              {changedFields.length === 0 ? (
                <tr>
                  <td colSpan="3" className="p-2 text-gray-500">
                    No local field differences remain.
                  </td>
                </tr>
              ) : (
                changedFields.map((field) => (
                  <tr key={field} className="border-b border-gray-100 last:border-0">
                    <th className="p-2 font-medium">{field}</th>
                    <td className="max-w-48 break-words p-2">{formatDifference(draft[field])}</td>
                    <td className="max-w-48 break-words p-2">
                      {formatDifference(latest?.[field])}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onReview}
          className="rounded border border-amber-300 bg-white px-3 py-1.5"
        >
          {reviewOpen ? 'Hide differences' : 'Review differences'}
        </button>
        <button
          type="button"
          onClick={onRebase}
          disabled={!latest}
          className="rounded bg-propela-purple px-3 py-1.5 text-white disabled:opacity-50"
        >
          Apply my edits to latest
        </button>
        <button
          type="button"
          onClick={onRequestDiscard}
          disabled={!latest}
          className="rounded border border-red-300 bg-white px-3 py-1.5 text-red-700 disabled:opacity-50"
        >
          Discard my edits
        </button>
        <button
          type="button"
          onClick={onKeepEditing}
          className="rounded border border-amber-300 bg-white px-3 py-1.5"
        >
          Keep editing
        </button>
      </div>
    </div>
  );
}

export default function NurseCard({
  nurseSlice,
  onUpdateDraft,
  onSave,
  onRetrySave,
  onRequestCancel,
  onResolveDiscard,
  onRetryDetail,
  onClose,
  onApplyConflictToLatest,
  onRequestDiscardConflict,
  onKeepEditingAfterConflict,
  permissions = { canEdit: true },
  canDelete = false,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
  onRetryDelete,
  onReloadAfterDeleteConflict,
  onDeleteResolved,
}) {
  const [showAddCommunication, setShowAddCommunication] = useState(false);
  const [showConflictReview, setShowConflictReview] = useState(false);
  const [communication, setCommunication] = useState({
    channel: 'Email',
    summary: '',
    nextAction: '',
  });

  const detailState = nurseSlice?.detailState || 'idle';
  const draft = nurseSlice?.draft;
  const isSaving = nurseSlice?.saveState === 'loading';
  const isDeleting = nurseSlice?.deleteState === 'loading';
  const canEditNurse = permissions.canEdit !== false;
  const canDeleteNurse = permissions.canDelete ?? canDelete;
  const editingDisabled = isSaving || !canEditNurse;

  const closeImmediately = () => onClose?.();
  const requestClose = () => {
    if (isSaving) return;
    const result = onRequestCancel?.();
    if (!result || result.status === 'closed') closeImmediately();
  };

  const resolveDiscard = (confirm) => {
    const decisionType = nurseSlice?.discardDecision?.type;
    const result = onResolveDiscard?.(confirm);
    if (confirm && decisionType === 'discardEdit' && result?.status === 'discarded')
      closeImmediately();
  };

  const runDeleteAction = async (action) => {
    const result = await action?.();
    if (
      result?.status === 'deleted' ||
      result?.status === 'alreadyDeleted' ||
      result?.status === 'notFound'
    ) {
      onDeleteResolved?.(result);
    }
    return result;
  };

  if (detailState !== 'success' || !draft) {
    return (
      <BodyPortal>
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <DetailStatePanel
            state={detailState}
            error={nurseSlice?.detailError}
            onRetry={onRetryDetail}
            onClose={closeImmediately}
          />
        </div>
      </BodyPortal>
    );
  }

  const updateField = (field, value) => {
    if (!canEditNurse) return;
    const cleanValue =
      typeof value === 'string'
        ? sanitizeText(value, {
            maxLength: MAX_LENGTHS.LONG_TEXT,
            trim: false,
            allowNewlines: true,
          })
        : value;
    const changes = { [field]: cleanValue };
    if (field === 'pipelineStage') changes.readinessStatus = calculateReadinessStatus(cleanValue);
    onUpdateDraft(changes);
  };

  const updateScorecard = (field, value) => {
    if (!canEditNurse) return;
    onUpdateDraft((current) => {
      const updated = {
        ...current,
        scorecardFields: { ...current.scorecardFields, [field]: value },
      };
      updated.cvScore = calculateCVScore(updated);
      updated.finalScore = calculateFinalScore(updated);
      updated.tier = calculateTier(updated.finalScore);
      return updated;
    });
  };

  const addCommunication = () => {
    if (!canEditNurse || !validateRequired(communication.summary)) return;
    const entry = {
      date: new Date().toISOString().split('T')[0],
      channel: communication.channel,
      summary: sanitizeText(communication.summary, {
        maxLength: MAX_LENGTHS.LONG_TEXT,
        allowNewlines: true,
      }),
      nextAction: sanitizeText(communication.nextAction, { maxLength: MAX_LENGTHS.SHORT_TEXT }),
    };
    updateField('communicationLog', [...(draft.communicationLog || []), entry]);
    setCommunication({ channel: 'Email', summary: '', nextAction: '' });
    setShowAddCommunication(false);
  };

  const saveErrors = nurseSlice?.saveValidation?.errors || {};
  const saveDecision = nurseSlice?.saveDecision;
  const conflictVisible = saveDecision?.type === 'saveConflict';
  const naColor = getNextActionColor(draft);
  const initials = (draft.fullName || '?')
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);
  const dirty = diffNurseFields(nurseSlice.originalBase, draft).length > 0;

  return (
    <BodyPortal>
      <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pb-6 pt-6">
        <button
          type="button"
          aria-label="Close nurse details"
          className="absolute inset-0 bg-black/30"
          onClick={requestClose}
        />
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="nurse-detail-title"
          data-nurse-card-frame="true"
          className="nurse-card-frame relative flex min-h-0 w-full max-w-2xl flex-col overflow-hidden rounded-xl bg-white shadow-2xl"
        >
          <div className="min-w-0 shrink-0 rounded-t-xl border-b border-gray-100 bg-white p-5">
            <div className="mb-3 flex min-w-0 items-start justify-between gap-2">
              <div className="flex min-w-0 items-center gap-3">
                {draft.photoURL ? (
                  <img
                    src={draft.photoURL}
                    alt=""
                    className="h-14 w-14 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-propela-purple text-lg font-semibold text-white">
                    {initials}
                  </div>
                )}
                <div className="min-w-0">
                  <h2
                    id="nurse-detail-title"
                    className="break-words text-lg font-semibold text-gray-900"
                  >
                    {draft.fullName || 'Nurse details'}
                  </h2>
                  <div className="mt-1 flex flex-wrap items-center gap-2">
                    <EditableSelect
                      ariaLabel="Pipeline stage"
                      value={draft.pipelineStage}
                      options={PIPELINE_STAGES}
                      onChange={(value) => updateField('pipelineStage', value)}
                      disabled={editingDisabled}
                      className="text-xs"
                    />
                    {draft.flags > 0 && (
                      <span className="flex items-center gap-0.5 text-xs text-red-600">
                        <Flag size={12} className="fill-red-600" /> {draft.flags}
                      </span>
                    )}
                    {dirty && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                        Unsaved changes
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                type="button"
                aria-label="Close"
                disabled={isSaving || isDeleting}
                onClick={requestClose}
                className="rounded p-1 hover:bg-gray-100 disabled:opacity-50"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>
            <div className={`rounded-lg border p-3 ${naColor.bg} ${naColor.border}`}>
              <label
                htmlFor="nurse-next-action"
                className="mb-1 block text-xs font-medium text-gray-500"
              >
                <span className="mb-1 block">Next Action</span>
                <select
                  id="nurse-next-action"
                  value={draft.nextAction || ''}
                  disabled={editingDisabled}
                  onChange={(event) => updateField('nextAction', event.target.value)}
                  className={`w-full border-none bg-transparent text-base font-semibold focus:outline-none disabled:opacity-60 ${naColor.text}`}
                >
                  <option value="">-- Select --</option>
                  {NEXT_ACTION_VALUES.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Calendar size={12} />
                Submitted: {draft.submittedAt || '—'}
              </span>
              {draft.lastContacted && (
                <span className="flex items-center gap-1">
                  <MessageSquare size={12} />
                  Last contacted: {draft.lastContacted}
                </span>
              )}
              <span className="rounded-full bg-gray-100 px-2 py-0.5 font-medium text-gray-600">
                {draft.readinessStatus || 'Not Ready'}
              </span>
            </div>
          </div>

          <div data-nurse-card-scroll-region="true" className="min-h-0 flex-1 overflow-y-auto">
            {conflictVisible && (
              <ConflictPanel
                originalBase={nurseSlice.originalBase}
                draft={draft}
                decision={saveDecision}
                reviewOpen={showConflictReview}
                onReview={() => setShowConflictReview((visible) => !visible)}
                onRebase={() => {
                  onApplyConflictToLatest();
                  setShowConflictReview(false);
                }}
                onRequestDiscard={onRequestDiscardConflict}
                onKeepEditing={() => {
                  onKeepEditingAfterConflict();
                  setShowConflictReview(false);
                }}
              />
            )}

            {nurseSlice?.saveError && (
              <div
                role="alert"
                className="m-4 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800"
              >
                <p className="font-semibold">
                  {ERROR_TITLES[nurseSlice.saveError.code] || ERROR_TITLES.UNKNOWN}
                </p>
                <p className="mt-1">
                  {nurseSlice.saveError.message || 'Your changes were not saved.'}
                </p>
                {canEditNurse && saveDecision?.retryAvailable && (
                  <button
                    type="button"
                    onClick={onRetrySave}
                    className="mt-2 rounded border border-red-200 bg-white px-3 py-1.5 font-medium"
                  >
                    Retry save
                  </button>
                )}
              </div>
            )}

            <Section title="Personal Information" defaultOpen>
              <FieldRow label="Full name" error={saveErrors.fullName}>
                <EditableText
                  ariaLabel="Full name"
                  value={draft.fullName}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('fullName', value)}
                />
              </FieldRow>
              <FieldRow label="Preferred name" error={saveErrors.preferredName}>
                <EditableText
                  ariaLabel="Preferred name"
                  value={draft.preferredName}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('preferredName', value)}
                />
              </FieldRow>
              <FieldRow label="Email" error={saveErrors.email}>
                <EditableText
                  ariaLabel="Email"
                  type="email"
                  value={draft.email}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('email', value)}
                />
              </FieldRow>
              <FieldRow label="Phone" error={saveErrors.contactNumber}>
                <EditableText
                  ariaLabel="Phone"
                  value={draft.contactNumber}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('contactNumber', value)}
                />
              </FieldRow>
              <FieldRow label="Gender" error={saveErrors.gender}>
                <EditableSelect
                  ariaLabel="Gender"
                  value={draft.gender}
                  options={GENDERS}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('gender', value)}
                />
              </FieldRow>
              <FieldRow label="Age group" error={saveErrors.ageGroup}>
                <EditableSelect
                  ariaLabel="Age group"
                  value={draft.ageGroup}
                  options={AGE_GROUPS}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('ageGroup', value)}
                />
              </FieldRow>
              <FieldRow label="Province" error={saveErrors.province}>
                <EditableText
                  ariaLabel="Province"
                  value={draft.province}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('province', value)}
                />
              </FieldRow>
              <FieldRow label="City" error={saveErrors.city}>
                <EditableText
                  ariaLabel="City"
                  value={draft.city}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('city', value)}
                />
              </FieldRow>
            </Section>

            <Section title="Professional Profile">
              <FieldRow label="Registered with SANC" error={saveErrors.registeredWithSANC}>
                <EditableSelect
                  value={draft.registeredWithSANC}
                  options={YES_NO}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('registeredWithSANC', value)}
                />
              </FieldRow>
              <FieldRow label="Registered nurse in SA" error={saveErrors.registeredNurseInSA}>
                <EditableSelect
                  value={draft.registeredNurseInSA}
                  options={YES_NO}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('registeredNurseInSA', value)}
                />
              </FieldRow>
              <FieldRow label="SANC number" error={saveErrors.sancNumber}>
                <EditableText
                  value={draft.sancNumber}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('sancNumber', value)}
                />
              </FieldRow>
              <FieldRow label="SANC APC expiry" error={saveErrors.sancAPCExpiry}>
                <EditableText
                  type="date"
                  value={draft.sancAPCExpiry}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('sancAPCExpiry', value)}
                />
              </FieldRow>
              <FieldRow label="SANC APC status" error={saveErrors.sancAPCStatus}>
                <EditableSelect
                  value={draft.sancAPCStatus}
                  options={SANC_APC_STATUSES}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('sancAPCStatus', value)}
                />
              </FieldRow>
              <FieldRow label="Highest qualification" error={saveErrors.highestQualification}>
                <EditableSelect
                  value={draft.highestQualification}
                  options={QUALIFICATION_TYPES}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('highestQualification', value)}
                />
              </FieldRow>
              <FieldRow label="Institution" error={saveErrors.qualificationInstitution}>
                <EditableText
                  value={draft.qualificationInstitution}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('qualificationInstitution', value)}
                />
              </FieldRow>
              <FieldRow label="Years experience" error={saveErrors.yearsOfClinicalExperience}>
                <EditableSelect
                  value={draft.yearsOfClinicalExperience}
                  options={YEARS_EXPERIENCE}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('yearsOfClinicalExperience', value)}
                />
              </FieldRow>
              <FieldRow label="Primary specialty" error={saveErrors.primaryClinicalSpecialty}>
                <EditableSelect
                  value={draft.primaryClinicalSpecialty}
                  options={SPECIALTIES}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('primaryClinicalSpecialty', value)}
                />
              </FieldRow>
              <FieldRow
                label="Additional certifications"
                error={saveErrors.additionalCertifications}
              >
                <EditableText
                  value={(draft.additionalCertifications || []).join(', ')}
                  disabled={editingDisabled}
                  onChange={(value) =>
                    updateField(
                      'additionalCertifications',
                      value
                        .split(',')
                        .map((item) => item.trim())
                        .filter(Boolean)
                    )
                  }
                />
              </FieldRow>
              <FieldRow label="Employment status" error={saveErrors.employmentStatus}>
                <EditableSelect
                  value={draft.employmentStatus}
                  options={EMPLOYMENT_STATUSES}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('employmentStatus', value)}
                />
              </FieldRow>
              <FieldRow label="Current employer" error={saveErrors.currentEmployer}>
                <EditableText
                  value={draft.currentEmployer}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('currentEmployer', value)}
                />
              </FieldRow>
              <FieldRow label="Valid passport" error={saveErrors.validPassport}>
                <EditableSelect
                  value={draft.validPassport}
                  options={YES_NO}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('validPassport', value)}
                />
              </FieldRow>
              <FieldRow label="Passport expiry" error={saveErrors.passportExpiryDate}>
                <EditableText
                  type="date"
                  value={draft.passportExpiryDate}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('passportExpiryDate', value)}
                />
              </FieldRow>
            </Section>

            <Section title="English Proficiency">
              <FieldRow label="EF SET score" error={saveErrors.efSetScore}>
                <EditableNumber
                  value={draft.efSetScore}
                  min={0}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('efSetScore', value)}
                />
              </FieldRow>
              <FieldRow label="EF SET level" error={saveErrors.efSetLevel}>
                <EditableSelect
                  value={draft.efSetLevel}
                  options={EFSET_LEVELS}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('efSetLevel', value)}
                />
              </FieldRow>
              <FieldRow label="English points" error={saveErrors.englishPts}>
                <EditableNumber
                  value={draft.englishPts}
                  min={0}
                  max={3}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('englishPts', value)}
                />
              </FieldRow>
              <FieldRow label="OET status" error={saveErrors.oetStatus}>
                <EditableSelect
                  value={draft.oetStatus}
                  options={OET_STATUSES}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('oetStatus', value)}
                />
              </FieldRow>
            </Section>

            <Section title="Scorecard" defaultOpen>
              {[
                ['hospitalExp', 'Hospital Exp', 3],
                ['sancStatus', 'SANC Status', 3],
                ['qualifications', 'Qualifications', 2],
                ['specialisation', 'Specialisation', 1],
                ['financialReadiness', 'Financial Readiness', 1],
                ['motivation', 'Motivation', 2],
                ['passport', 'Passport', 1],
              ].map(([field, label, weight]) => (
                <div key={field}>
                  <ScorecardField
                    label={label}
                    weight={weight}
                    value={draft.scorecardFields?.[field]}
                    disabled={editingDisabled}
                    onChange={(value) => updateScorecard(field, value)}
                  />
                  {saveErrors[`scorecardFields.${field}`] && (
                    <p className="text-xs text-red-600">{saveErrors[`scorecardFields.${field}`]}</p>
                  )}
                </div>
              ))}
              <div className="mt-3 rounded-lg bg-gray-50 p-3 text-sm">
                <div className="flex justify-between">
                  <span>CV Score</span>
                  <span className="flex items-center gap-1">
                    {renderStars(draft.cvScore)} {draft.cvScore}/5
                  </span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Final Score</span>
                  <strong>{draft.finalScore}/5</strong>
                </div>
                <div className="mt-1 flex justify-between">
                  <span>Tier</span>
                  <strong>{draft.tier || '—'}</strong>
                </div>
              </div>
            </Section>

            <Section title="Selection and Cohort">
              <FieldRow label="Shortlist decision" error={saveErrors.shortlistDecision}>
                <EditableSelect
                  value={draft.shortlistDecision}
                  options={SHORTLIST_DECISIONS}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('shortlistDecision', value)}
                />
              </FieldRow>
              <FieldRow label="Cohort assigned" error={saveErrors.cohortAssigned}>
                <EditableText
                  value={draft.cohortAssigned}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('cohortAssigned', value)}
                />
              </FieldRow>
              <FieldRow label="Agreement signed" error={saveErrors.agreementSigned}>
                <EditableSelect
                  value={draft.agreementSigned ? 'Yes' : 'No'}
                  options={YES_NO}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('agreementSigned', value === 'Yes')}
                />
              </FieldRow>
              <FieldRow label="Commitment fee" error={saveErrors.commitmentFeeStatus}>
                <EditableSelect
                  value={draft.commitmentFeeStatus}
                  options={COMMITMENT_FEE_STATUSES}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('commitmentFeeStatus', value)}
                />
              </FieldRow>
            </Section>

            <Section title="Notes / Flags / Source">
              <FieldRow label="Source" error={saveErrors.source}>
                <EditableSelect
                  value={draft.source}
                  options={SOURCE_OPTIONS}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('source', value)}
                />
              </FieldRow>
              <FieldRow label="Flags" error={saveErrors.flags}>
                <EditableNumber
                  value={draft.flags}
                  min={0}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('flags', value)}
                />
              </FieldRow>
              <FieldRow label="Motivations" error={saveErrors.motivations}>
                <EditableTextarea
                  value={draft.motivations}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('motivations', value)}
                />
              </FieldRow>
              <FieldRow label="Questions" error={saveErrors.questions}>
                <EditableTextarea
                  value={draft.questions}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('questions', value)}
                />
              </FieldRow>
              <FieldRow label="Notes / flags" error={saveErrors.notesFlags}>
                <EditableTextarea
                  value={draft.notesFlags}
                  disabled={editingDisabled}
                  onChange={(value) => updateField('notesFlags', value)}
                />
              </FieldRow>
            </Section>

            <Section title="Communication Log" defaultOpen>
              <div className="space-y-2">
                {(draft.communicationLog || []).length === 0 ? (
                  <p className="text-sm italic text-gray-400">No communications logged yet.</p>
                ) : (
                  [...draft.communicationLog]
                    .sort((left, right) => (right.date || '').localeCompare(left.date || ''))
                    .map((entry, index) => (
                      <div
                        key={`${entry.date}-${index}`}
                        className="rounded-lg bg-gray-50 p-2.5 text-sm"
                      >
                        <div className="mb-1 flex items-center gap-2 text-xs text-gray-500">
                          <span>{entry.date}</span>
                          <span className="rounded bg-gray-200 px-1.5 py-0.5">{entry.channel}</span>
                        </div>
                        <p className="text-gray-700">{entry.summary}</p>
                        {entry.nextAction && (
                          <p className="mt-1 text-xs text-teal-600">Next: {entry.nextAction}</p>
                        )}
                      </div>
                    ))
                )}
                {!showAddCommunication ? (
                  <button
                    type="button"
                    disabled={editingDisabled}
                    onClick={() => setShowAddCommunication(true)}
                    className="mt-2 flex items-center gap-1 text-sm font-medium text-propela-purple disabled:opacity-50"
                  >
                    <Plus size={14} />
                    Add Communication
                  </button>
                ) : (
                  <div className="mt-2 space-y-2 rounded-lg bg-propela-purple-light p-3">
                    <EditableSelect
                      value={communication.channel}
                      options={['Email', 'WhatsApp', 'Phone', 'LinkedIn', 'In-person']}
                      disabled={editingDisabled}
                      onChange={(channel) =>
                        setCommunication((current) => ({ ...current, channel }))
                      }
                    />
                    <EditableTextarea
                      value={communication.summary}
                      placeholder="Summary of communication..."
                      disabled={editingDisabled}
                      onChange={(summary) =>
                        setCommunication((current) => ({ ...current, summary }))
                      }
                    />
                    <EditableText
                      value={communication.nextAction}
                      placeholder="Next action set (optional)"
                      disabled={editingDisabled}
                      onChange={(nextAction) =>
                        setCommunication((current) => ({ ...current, nextAction }))
                      }
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={editingDisabled}
                        onClick={addCommunication}
                        className="rounded bg-propela-purple px-3 py-1.5 text-sm text-white disabled:opacity-50"
                      >
                        Add entry
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowAddCommunication(false)}
                        className="rounded px-3 py-1.5 text-sm text-gray-600"
                      >
                        Cancel entry
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </Section>

            <Section title="Record Metadata">
              <dl className="space-y-2 text-sm">
                {[
                  ['Record ID', draft.id],
                  ['Owner ID', draft.ownerId],
                  ['Version', draft.version],
                  ['Created', draft.createdAt],
                  ['Last updated', draft.updatedAt],
                ].map(([label, value]) => (
                  <div key={label} className="flex gap-3">
                    <dt className="w-28 shrink-0 text-xs text-gray-500">{label}</dt>
                    <dd className="break-all text-gray-800">{formatDifference(value)}</dd>
                  </div>
                ))}
              </dl>
            </Section>
          </div>

          <div
            data-nurse-card-action-region="true"
            className="flex shrink-0 flex-col items-stretch gap-3 rounded-b-xl border-t border-gray-100 bg-white p-4 md:flex-row md:items-center md:justify-between"
          >
            <div className="flex min-w-0 flex-wrap items-center gap-3">
              {canDeleteNurse && (
                <button
                  type="button"
                  disabled={isSaving || isDeleting || Boolean(nurseSlice?.deleteDecision)}
                  onClick={() => onRequestDelete?.()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Trash2 size={15} />
                  Delete nurse
                </button>
              )}
              <p className="text-xs text-gray-500">
                Base version {nurseSlice.baseVersion ?? '—'}
                {nurseSlice.saveState === 'success' ? ' · Saved' : ''}
              </p>
            </div>
            <div className="flex w-full min-w-0 justify-end gap-2 md:w-auto">
              <button
                type="button"
                disabled={isSaving || isDeleting}
                onClick={requestClose}
                className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving || isDeleting || !canEditNurse || conflictVisible || !dirty}
                onClick={onSave}
                className="inline-flex items-center gap-2 rounded-lg bg-propela-purple px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSaving && <LoaderCircle size={15} className="animate-spin" />}
                {isSaving ? 'Saving...' : 'Save changes'}
              </button>
            </div>
          </div>
        </div>

        <ConfirmationDialog
          isOpen={nurseSlice?.discardDecision?.type === 'discardEdit'}
          title={`Discard changes to ${draft.fullName || 'this nurse'}?`}
          description="Your unsaved local edits will be lost. No update will be sent to the database."
          confirmLabel="Discard and close"
          cancelLabel="Keep editing"
          onConfirm={() => resolveDiscard(true)}
          onCancel={() => resolveDiscard(false)}
          destructive
        />

        <ConfirmationDialog
          isOpen={nurseSlice?.discardDecision?.type === 'discardConflict'}
          title={`Discard local changes to ${draft.fullName || 'this nurse'}?`}
          description="Your local edits will be discarded and replaced with the latest saved nurse. No update will be sent until you make changes and save again."
          confirmLabel="Confirm discard"
          cancelLabel="Keep my edits"
          onConfirm={() => resolveDiscard(true)}
          onCancel={() => resolveDiscard(false)}
          destructive
        />

        <DeleteNurseDialog
          decision={nurseSlice?.deleteDecision}
          deleteState={nurseSlice?.deleteState}
          error={nurseSlice?.deleteError}
          fallbackNurseName={draft.fullName}
          onCancel={onCancelDelete}
          onConfirm={() => runDeleteAction(onConfirmDelete)}
          onRetry={() => runDeleteAction(onRetryDelete)}
          onReload={() => runDeleteAction(onReloadAfterDeleteConflict)}
        />
      </div>
    </BodyPortal>
  );
}
