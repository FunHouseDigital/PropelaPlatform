import { useEffect } from 'react';
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

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
      />

      {/* Modal content */}
      <div
        className={
          isDesktop
            ? `relative bg-white rounded-lg shadow-xl w-full ${sizeClasses[size]} mx-4 animate-fade-in`
            : 'relative bg-white inset-0 fixed w-full h-full animate-fade-in'
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">{title}</h2>
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
