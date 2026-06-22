import { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Clock, Zap, ChevronRight } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { getContextualActions } from '../../lib/searchUtils';

export default function SmartSuggestions({ isOpen, onClose, toggleButtonRef }) {
  const { recentlyViewed } = useAppContext();
  const location = useLocation();
  const navigate = useNavigate();
  const panelRef = useRef(null);

  const contextualActions = getContextualActions(location.pathname);

  useEffect(() => {
    function handleClickOutside(event) {
      // Exclude the toggle button from outside-click detection to avoid
      // the mousedown/click race condition where onClose fires before the
      // toggle button's onClick, causing the panel to immediately re-open.
      if (toggleButtonRef?.current && toggleButtonRef.current.contains(event.target)) {
        return;
      }
      if (panelRef.current && !panelRef.current.contains(event.target)) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose, toggleButtonRef]);

  if (!isOpen) return null;

  return (
    <div ref={panelRef} className="absolute top-full right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-40">
      {/* Recently Viewed */}
      {recentlyViewed.length > 0 && (
        <div>
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <Clock size={12} />
              Recently Viewed
            </div>
          </div>
          <div className="max-h-48 overflow-y-auto">
            {recentlyViewed.slice(0, 5).map((item, index) => (
              <button
                key={`recent-${index}`}
                type="button"
                onClick={() => {
                  navigate(item.path);
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-xs font-medium px-1.5 py-0.5 rounded bg-gray-100 text-gray-600 shrink-0">
                  {item.type}
                </span>
                <span className="text-sm text-gray-700 truncate flex-1">{item.name}</span>
                <ChevronRight size={12} className="text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Contextual Actions */}
      {contextualActions.length > 0 && (
        <div>
          <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 border-t">
            <div className="flex items-center gap-1.5 text-xs font-medium text-gray-500 uppercase tracking-wider">
              <Zap size={12} />
              Suggested Actions
            </div>
          </div>
          <div>
            {contextualActions.map((action, index) => (
              <button
                key={`action-${index}`}
                type="button"
                onClick={() => {
                  if (action.path) {
                    navigate(action.path);
                  }
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm text-gray-700 flex-1">{action.label}</span>
                <ChevronRight size={12} className="text-gray-400" />
              </button>
            ))}
          </div>
        </div>
      )}

      {recentlyViewed.length === 0 && contextualActions.length === 0 && (
        <div className="px-4 py-8 text-center text-sm text-gray-500">
          No suggestions available
        </div>
      )}
    </div>
  );
}
