import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import useMediaQuery from '../../hooks/useMediaQuery';

const sizeClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  full: 'max-w-full',
};

export default function ResponsiveModal({ isOpen, onClose, title, children, size = 'md' }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const modalRef = useRef(null);
  const previousFocusRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      // Store the element that had focus before the modal opened
      previousFocusRef.current = document.activeElement;
    } else {
      document.body.style.overflow = '';
      // Restore focus when modal closes
      if (previousFocusRef.current) {
        previousFocusRef.current.focus?.();
        previousFocusRef.current = null;
      }
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  // Focus the first focusable element inside the modal on open
  useEffect(() => {
    if (isOpen && modalRef.current) {
      const focusableElements = modalRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableElements.length > 0) {
        focusableElements[0].focus();
      }
    }
  }, [isOpen]);

  // Focus trap and Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusableElements = modalRef.current?.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (!focusableElements || focusableElements.length === 0) return;

        const first = focusableElements[0];
        const last = focusableElements[focusableElements.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const titleId = 'modal-title-' + (title || '').replace(/\s+/g, '-').toLowerCase();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal content */}
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={
          isDesktop
            ? `relative bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} mx-4 animate-fade-in`
            : 'relative bg-white inset-0 fixed w-full h-full animate-fade-in'
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 id={titleId} className="text-lg font-semibold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close modal"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 overflow-y-auto" style={!isDesktop ? { maxHeight: 'calc(100vh - 65px)' } : { maxHeight: '70vh' }}>
          {children}
        </div>
      </div>
    </div>
  );
}
