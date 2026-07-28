import { AlertTriangle, LoaderCircle } from 'lucide-react';
import { useId, useRef } from 'react';

import ResponsiveModal from '../ui/ResponsiveModal';

const RECOVERABLE_CODES = new Set(['NETWORK', 'UNKNOWN', 'STORAGE']);

function failureCopy(code) {
  if (code === 'VALIDATION') {
    return {
      title: 'Deletion blocked by a database rule',
      message:
        'This nurse could not be deleted because a database rule prevented it. No records were changed. Resolve any related records allowed by policy before trying again.',
    };
  }
  if (code === 'AUTH') {
    return {
      title: 'Sign in before deleting',
      message:
        'Your session is no longer valid. No records were changed. Sign in again before starting a new delete attempt.',
    };
  }
  if (code === 'FORBIDDEN') {
    return {
      title: 'Permission required',
      message:
        'You do not currently have permission to delete this nurse. No records were changed. Retry is unavailable until permissions are re-established.',
    };
  }
  if (code === 'NETWORK') {
    return {
      title: 'Deletion was not confirmed',
      message:
        'The server could not be reached, so the nurse remains in the confirmed list. Retry only when you are ready.',
    };
  }
  if (code === 'STORAGE') {
    return {
      title: 'Deletion was not confirmed',
      message:
        'Browser storage could not complete the deletion, so the nurse remains in the confirmed list. Retry only when you are ready.',
    };
  }
  return {
    title: 'Deletion was not confirmed',
    message:
      'The delete request could not be confirmed, so the nurse remains in the confirmed list. Retry only when you are ready.',
  };
}

export default function DeleteNurseDialog({
  decision,
  deleteState,
  error,
  fallbackNurseName,
  onCancel,
  onConfirm,
  onRetry,
  onReload,
}) {
  const cancelRef = useRef(null);
  const generatedDescriptionId = useId();
  const descriptionId = `delete-nurse-description-${generatedDescriptionId.replace(/:/g, '')}`;
  const isOpen = Boolean(decision);
  const isPending = deleteState === 'loading';
  const nurseName =
    decision?.nurseName || decision?.current?.fullName || fallbackNurseName || 'this nurse';
  const isConflict = decision?.type === 'deleteConflict';
  const isFailure = decision?.type === 'deleteFailure';
  const code = error?.code || 'UNKNOWN';
  const copy = failureCopy(code);
  const title = isConflict
    ? `Reload ${nurseName} before deleting`
    : isFailure
      ? copy.title
      : `Delete ${nurseName}?`;
  const message = isConflict
    ? `${nurseName} changed after these details were loaded. Reload the authoritative details or cancel. A delete cannot be retried from this stale version.`
    : isFailure
      ? copy.message
      : `You are about to permanently delete ${nurseName}. Related database records may be affected according to database rules. This action starts only after you confirm.`;
  const retryAvailable = isFailure && decision?.retryAvailable && RECOVERABLE_CODES.has(code);

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      role="alertdialog"
      ariaDescribedBy={descriptionId}
      initialFocusRef={cancelRef}
      closeDisabled={isPending}
      showCloseButton={false}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          size={20}
          aria-hidden="true"
          className={`mt-0.5 shrink-0 ${isConflict ? 'text-amber-600' : 'text-red-600'}`}
        />
        <div>
          <p id={descriptionId} className="text-sm leading-6 text-gray-700">
            {message}
          </p>
          {isPending && (
            <p
              role="status"
              className="mt-3 inline-flex items-center gap-2 text-sm font-medium text-gray-700"
            >
              <LoaderCircle size={15} className="animate-spin" />
              Deleting {nurseName}…
            </p>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          disabled={isPending}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isFailure ? 'Close' : 'Cancel'}
        </button>
        {isConflict && (
          <button
            type="button"
            onClick={onReload}
            className="rounded-lg bg-propela-purple px-4 py-2 text-sm font-medium text-white hover:bg-propela-purple/90"
          >
            Reload Details
          </button>
        )}
        {retryAvailable && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg bg-propela-purple px-4 py-2 text-sm font-medium text-white hover:bg-propela-purple/90"
          >
            Retry delete
          </button>
        )}
        {!isConflict && !isFailure && (
          <button
            type="button"
            onClick={onConfirm}
            disabled={isPending}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending && <LoaderCircle size={15} className="animate-spin" />}
            {isPending ? 'Deleting…' : 'Delete nurse'}
          </button>
        )}
      </div>
    </ResponsiveModal>
  );
}
