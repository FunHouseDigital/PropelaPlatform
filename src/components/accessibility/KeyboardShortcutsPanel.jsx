import { useEffect, useRef } from 'react';
import { X, Keyboard } from 'lucide-react';

const SHORTCUTS = [
  { keys: ['Ctrl', 'K'], description: 'Open search / command palette', macKeys: ['\u2318', 'K'] },
  { keys: ['Shift', '?'], description: 'Show keyboard shortcuts', macKeys: ['Shift', '?'] },
  { keys: ['Escape'], description: 'Close dialogs and panels', macKeys: ['Escape'] },
  { keys: ['\u2191', '\u2193'], description: 'Navigate lists and search results', macKeys: ['\u2191', '\u2193'] },
  { keys: ['Enter'], description: 'Select highlighted item', macKeys: ['Enter'] },
  { keys: ['Tab'], description: 'Move focus to next element', macKeys: ['Tab'] },
  { keys: ['Shift', 'Tab'], description: 'Move focus to previous element', macKeys: ['Shift', 'Tab'] },
];

export default function KeyboardShortcutsPanel({ isOpen, onClose }) {
  const panelRef = useRef(null);
  const closeButtonRef = useRef(null);
  const previousFocusRef = useRef(null);

  const isMac = typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform || '');

  // Save the previously focused element when opening
  useEffect(() => {
    if (isOpen) {
      previousFocusRef.current = document.activeElement;
    }
  }, [isOpen]);

  // Restore focus when closing
  useEffect(() => {
    if (!isOpen && previousFocusRef.current) {
      const elementToRestore = previousFocusRef.current;
      previousFocusRef.current = null;
      // Use setTimeout to ensure the element is focusable after the panel unmounts
      setTimeout(() => {
        if (elementToRestore && typeof elementToRestore.focus === 'function') {
          elementToRestore.focus();
        }
      }, 0);
    }
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen) return;

    closeButtonRef.current?.focus();

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === 'Tab') {
        const focusableElements = panelRef.current?.querySelectorAll(
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="shortcuts-title"
        className="relative bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 animate-fade-in"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <Keyboard size={20} className="text-propela-purple" />
            <h2 id="shortcuts-title" className="text-lg font-semibold text-gray-900">
              Keyboard Shortcuts
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Close keyboard shortcuts panel"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Shortcuts list */}
        <div className="p-4 max-h-[60vh] overflow-y-auto">
          <ul className="space-y-3">
            {SHORTCUTS.map((shortcut, index) => {
              const keys = isMac ? shortcut.macKeys : shortcut.keys;
              return (
                <li key={index} className="flex items-center justify-between py-2">
                  <span className="text-sm text-gray-700">{shortcut.description}</span>
                  <div className="flex items-center gap-1">
                    {keys.map((key, ki) => (
                      <kbd
                        key={ki}
                        className="px-2 py-1 bg-gray-100 border border-gray-200 rounded text-xs font-mono text-gray-600 min-w-[28px] text-center"
                      >
                        {key}
                      </kbd>
                    ))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-gray-200 text-xs text-gray-400 text-center">
          Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">Esc</kbd> to close
        </div>
      </div>
    </div>
  );
}
