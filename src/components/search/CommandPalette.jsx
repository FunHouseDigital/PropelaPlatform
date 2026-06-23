import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, Clock } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { searchAllEntities } from '../../lib/searchUtils';
import { useDebouncedValue } from '../../hooks/useDebounce';
import SearchResult from './SearchResult';

export default function CommandPalette({ isOpen, onClose }) {
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const { nurses, placements, documents, cohorts, recentSearches, updateRecentSearches, recentlyViewed, updateRecentlyViewed } = useAppContext();

  const debouncedQuery = useDebouncedValue(query, 150);

  const results = useMemo(
    () =>
      debouncedQuery.trim()
        ? searchAllEntities(debouncedQuery, { nurses, placements, documents, cohorts })
        : [],
    [debouncedQuery, nurses, placements, documents, cohorts]
  );

  const handleSelect = useCallback(
    (result) => {
      // Save to recent searches
      const newSearches = [
        { query: result.name, type: result.type, path: result.path, timestamp: Date.now() },
        ...recentSearches.filter((s) => s.query !== result.name),
      ].slice(0, 10);
      updateRecentSearches(newSearches);

      // Track in recently viewed
      const newRecentlyViewed = [
        { type: result.type, id: result.id, name: result.name, path: result.path, timestamp: Date.now() },
        ...recentlyViewed.filter((item) => item.id !== result.id || item.type !== result.type),
      ].slice(0, 10);
      updateRecentlyViewed(newRecentlyViewed);

      navigate(result.path);
      onClose();
      setQuery('');
      setActiveIndex(0);
    },
    [navigate, onClose, recentSearches, updateRecentSearches, recentlyViewed, updateRecentlyViewed]
  );

  const handleRecentSelect = useCallback(
    (recent) => {
      navigate(recent.path);
      onClose();
      setQuery('');
      setActiveIndex(0);
    },
    [navigate, onClose]
  );

  const handleKeyDown = useCallback(
    (e) => {
      const itemCount = results.length > 0 ? results.length : recentSearches.length;

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % Math.max(itemCount, 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setActiveIndex((prev) => (prev - 1 + Math.max(itemCount, 1)) % Math.max(itemCount, 1));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (results.length > 0 && results[activeIndex]) {
          handleSelect(results[activeIndex]);
        } else if (!query.trim() && recentSearches[activeIndex]) {
          handleRecentSelect(recentSearches[activeIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
        setQuery('');
        setActiveIndex(0);
      }
    },
    [results, recentSearches, activeIndex, query, handleSelect, handleRecentSelect, onClose]
  );

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={() => {
          onClose();
          setQuery('');
          setActiveIndex(0);
        }}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg bg-white rounded-xl shadow-2xl overflow-hidden">
        {/* Search Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search nurses, placements, documents... (Esc to close)"
            className="flex-1 text-sm text-gray-900 placeholder-gray-400 outline-none bg-transparent"
          />
          {query && (
            <button
              type="button"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={16} />
            </button>
          )}
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto">
          {query.trim() && results.length > 0 && (
            <div>
              {results.map((result, index) => (
                <SearchResult
                  key={`${result.type}-${result.id}`}
                  result={result}
                  isActive={index === activeIndex}
                  onClick={() => handleSelect(result)}
                />
              ))}
            </div>
          )}

          {query.trim() && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              No results found for &ldquo;{query}&rdquo;
            </div>
          )}

          {!query.trim() && recentSearches.length > 0 && (
            <div>
              <div className="px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
                Recent Searches
              </div>
              {recentSearches.map((recent, index) => (
                <button
                  key={`recent-${index}`}
                  type="button"
                  onClick={() => handleRecentSelect(recent)}
                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                    index === activeIndex ? 'bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                >
                  <Clock size={14} className="text-gray-400 shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{recent.query}</span>
                  <span className="ml-auto text-xs text-gray-400">{recent.type}</span>
                </button>
              ))}
            </div>
          )}

          {!query.trim() && recentSearches.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Start typing to search across all entities
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-200 flex items-center gap-4 text-xs text-gray-400">
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">↑↓</kbd> navigate</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">↵</kbd> select</span>
          <span><kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
