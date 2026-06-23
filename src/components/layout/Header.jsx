import { useState, useCallback, useRef } from 'react';
import { Search, Sparkles, Menu } from 'lucide-react';
import Breadcrumbs from './Breadcrumbs';
import SmartSuggestions from '../search/SmartSuggestions';

export default function Header({ onOpenSearch, onToggleSidebar, isMobile }) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const toggleButtonRef = useRef(null);

  const toggleSuggestions = useCallback(() => {
    setShowSuggestions((prev) => !prev);
  }, []);

  const closeSuggestions = useCallback(() => {
    setShowSuggestions(false);
  }, []);

  return (
    <header className="sticky top-0 z-30 h-14 bg-white border-b border-gray-200 flex items-center justify-between px-4 md:px-6">
      {/* Left: Hamburger (mobile) + Breadcrumbs */}
      <div className="flex items-center gap-2">
        {isMobile && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 hover:text-gray-900 transition-colors rounded-lg"
            aria-label="Open menu"
          >
            <Menu size={22} strokeWidth={1.8} />
          </button>
        )}
        <Breadcrumbs />
      </div>

      {/* Right: Search trigger and suggestions */}
      <div className="flex items-center gap-2">
        {/* Search Button */}
        <button
          type="button"
          onClick={onOpenSearch}
          aria-label="Open search"
          className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 hover:border-gray-300 transition-colors"
        >
          <Search size={14} />
          <span className="hidden sm:inline">Search...</span>
          <kbd className="hidden sm:inline-flex items-center gap-0.5 px-1.5 py-0.5 text-xs bg-white border border-gray-200 rounded text-gray-400 font-mono">
            <span className="text-xs">&#x2318;</span>K
          </kbd>
        </button>

        {/* Smart Suggestions Toggle */}
        <div className="relative">
          <button
            ref={toggleButtonRef}
            type="button"
            onClick={toggleSuggestions}
            aria-label="Toggle smart suggestions"
            className={`flex items-center justify-center w-8 h-8 rounded-lg border transition-colors ${
              showSuggestions
                ? 'bg-blue-50 border-blue-200 text-blue-600'
                : 'bg-gray-50 border-gray-200 text-gray-500 hover:bg-gray-100'
            }`}
          >
            <Sparkles size={16} />
          </button>
          <SmartSuggestions isOpen={showSuggestions} onClose={closeSuggestions} toggleButtonRef={toggleButtonRef} />
        </div>
      </div>
    </header>
  );
}
