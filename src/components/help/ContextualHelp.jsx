import { useState, useRef, useEffect } from 'react';
import { HelpCircle, Search, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

export default function ContextualHelp({ topic = '', position = 'bottom' }) {
  const { helpArticles } = useAppContext();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const popoverRef = useRef(null);
  const buttonRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target)
      ) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const filteredArticles = helpArticles.filter((article) => {
    const q = searchQuery.toLowerCase();
    const topicLower = topic.toLowerCase();

    // Filter by topic first
    let matchesTopic = true;
    if (topic) {
      matchesTopic =
        article.category.toLowerCase().includes(topicLower) ||
        article.tags.some((t) => t.toLowerCase().includes(topicLower)) ||
        article.title.toLowerCase().includes(topicLower);
    }

    // Then filter by search query
    let matchesSearch = true;
    if (q) {
      matchesSearch =
        article.title.toLowerCase().includes(q) ||
        article.content.toLowerCase().includes(q) ||
        article.tags.some((t) => t.toLowerCase().includes(q));
    }

    return matchesTopic && matchesSearch;
  }).slice(0, 5);

  const positionClasses = {
    top: 'bottom-full mb-2',
    bottom: 'top-full mt-2',
    left: 'right-full mr-2',
    right: 'left-full ml-2',
  };

  return (
    <div className="relative inline-flex">
      <button
        ref={buttonRef}
        onClick={() => setIsOpen(!isOpen)}
        className="text-gray-400 hover:text-[#5B2D8E] transition-colors p-1 rounded-full hover:bg-[#5B2D8E]/10"
        title="Help"
      >
        <HelpCircle size={16} />
      </button>

      {isOpen && (
        <div
          ref={popoverRef}
          className={`absolute z-50 ${positionClasses[position] || positionClasses.bottom} w-72 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden`}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-b border-gray-200">
            <span className="text-xs font-medium text-gray-700">Help</span>
            <button
              onClick={() => setIsOpen(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={14} />
            </button>
          </div>

          {/* Search */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="relative">
              <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-7 pr-3 py-1.5 text-xs border border-gray-200 rounded focus:outline-none focus:ring-1 focus:ring-[#5B2D8E]/30"
              />
            </div>
          </div>

          {/* Results */}
          <div className="max-h-60 overflow-y-auto">
            {filteredArticles.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">No articles found</p>
            ) : (
              filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="px-3 py-2 border-b border-gray-50 last:border-0 hover:bg-gray-50"
                >
                  <h4 className="text-xs font-medium text-gray-900 mb-0.5">{article.title}</h4>
                  <p className="text-[11px] text-gray-500 line-clamp-2">
                    {article.content.slice(0, 100)}...
                  </p>
                  <span className="text-[10px] text-[#5B2D8E] mt-1 inline-block">
                    {article.category}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
