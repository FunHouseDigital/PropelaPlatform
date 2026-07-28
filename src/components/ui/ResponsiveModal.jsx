import { X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

import useMediaQuery from '../../hooks/useMediaQuery';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ');

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'max-w-full',
};

export default function ResponsiveModal({
  isOpen,
  onClose,
  title,
  children,
  size = 'md',
  role = 'dialog',
  ariaDescribedBy,
  initialFocusRef,
  closeDisabled = false,
  showCloseButton = true,
}) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);
  const generatedTitleId = useId();

  useEffect(() => {
    if (!isOpen) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    previousFocusRef.current = document.activeElement;

    return () => {
      document.body.style.overflow = previousOverflow;
      const previousFocus = previousFocusRef.current;
      if (previousFocus?.isConnected) previousFocus.focus?.();
      previousFocusRef.current = null;
    };
  }, [isOpen]);

  // Focus the requested safe action, or the first enabled control, on open.
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const requestedFocus = initialFocusRef?.current;
      if (requestedFocus && modalRef.current.contains(requestedFocus) && !requestedFocus.disabled) {
        requestedFocus.focus();
        return;
      }
      const focusableElements = modalRef.current.querySelectorAll(FOCUSABLE_SELECTOR);
      if (focusableElements.length > 0) focusableElements[0].focus();
      else modalRef.current.focus();
    }
  }, [initialFocusRef, isOpen]);

  // Focus trap and Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        if (closeDisabled) return;
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(FOCUSABLE_SELECTOR);
        if (!focusableElements || focusableElements.length === 0) {
          event.preventDefault();
          return;
        }

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last.focus();
          }
        } else if (document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [closeDisabled, isOpen, onClose]);

  if (!isOpen) return null;

  const titleId = `modal-title-${generatedTitleId.replace(/:/g, '')}`;
  const requestClose = () => {
    if (!closeDisabled) onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={requestClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        ref={modalRef}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={ariaDescribedBy}
        tabIndex={-1}
        className={
          isDesktop
            ? `relative bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} mx-4 animate-fade-in`
            : 'relative bg-white inset-0 fixed w-full h-full animate-fade-in'
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 id={titleId} className="text-lg font-semibold text-gray-900">
            {title}
          </h2>
          {showCloseButton && (
            <button
              type="button"
              onClick={requestClose}
              disabled={closeDisabled}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors disabled:cursor-not-allowed disabled:opacity-50"
              aria-label="Close modal"
            >
              <X className="h-5 w-5 text-gray-500" />
            </button>
          )}
        </div>

        {/* Body */}
        <div
          className="p-4 overflow-y-auto"
          style={!isDesktop ? { maxHeight: 'calc(100vh - 65px)' } : { maxHeight: '70vh' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
