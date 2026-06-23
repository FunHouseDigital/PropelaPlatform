import { ArrowRight } from 'lucide-react';

const TYPE_COLORS = {
  Nurse: 'bg-blue-100 text-blue-700',
  Placement: 'bg-green-100 text-green-700',
  Document: 'bg-amber-100 text-amber-700',
  Cohort: 'bg-purple-100 text-purple-700',
};

export default function SearchResult({ result, isActive, onClick, id }) {
  const badgeColor = TYPE_COLORS[result.type] || 'bg-gray-100 text-gray-700';

  return (
    <button
      type="button"
      id={id}
      role="option"
      aria-selected={isActive}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors ${
        isActive ? 'bg-blue-50' : 'hover:bg-gray-50'
      }`}
    >
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${badgeColor}`}>
        {result.type}
      </span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">{result.name}</p>
        {result.secondary && (
          <p className="text-xs text-gray-500 truncate">{result.secondary}</p>
        )}
      </div>
      <ArrowRight size={14} className="text-gray-400 shrink-0" />
    </button>
  );
}
