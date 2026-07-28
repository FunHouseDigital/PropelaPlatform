import { LoaderCircle } from 'lucide-react';
import { useId, useRef } from 'react';

import ResponsiveModal from './ResponsiveModal';

export default function ConfirmationDialog({
  isOpen,
  title,
  description,
  confirmLabel,
  cancelLabel = 'Cancel',
  onConfirm,
  onCancel,
  pending = false,
  destructive = false,
}) {
  const cancelRef = useRef(null);
  const generatedDescriptionId = useId();
  const descriptionId = `confirmation-description-${generatedDescriptionId.replace(/:/g, '')}`;

  return (
    <ResponsiveModal
      isOpen={isOpen}
      onClose={onCancel}
      title={title}
      size="sm"
      role="alertdialog"
      ariaDescribedBy={descriptionId}
      initialFocusRef={cancelRef}
      closeDisabled={pending}
    >
      <p id={descriptionId} className="text-sm leading-6 text-gray-700">
        {description}
      </p>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          ref={cancelRef}
          type="button"
          onClick={onCancel}
          disabled={pending}
          className="rounded-lg border border-gray-200 px-4 py-2 text-sm font-medium text-gray-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {cancelLabel}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={pending}
          className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60 ${
            destructive
              ? 'bg-red-700 hover:bg-red-800'
              : 'bg-propela-purple hover:bg-propela-purple/90'
          }`}
        >
          {pending && <LoaderCircle size={15} className="animate-spin" />}
          {confirmLabel}
        </button>
      </div>
    </ResponsiveModal>
  );
}
