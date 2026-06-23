import { useState } from 'react';
import { Filter, ChevronDown, ChevronUp } from 'lucide-react';
import useMediaQuery from '../../hooks/useMediaQuery';

export default function CollapsibleFilter({ title = 'Filters', children, defaultOpen = false }) {
  const isDesktop = useMediaQuery('(min-width: 768px)');
  const [isOpen, setIsOpen] = useState(defaultOpen);

  if (isDesktop) {
    return (
      <div className="space-y-3">
        {title && <h3 className="text-sm font-medium text-gray-700">{title}</h3>}
        {children}
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="min-h-[44px] min-w-[44px] flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors w-full justify-between"
      >
        <span className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          {title}
        </span>
        {isOpen ? (
          <ChevronUp className="h-4 w-4" />
        ) : (
          <ChevronDown className="h-4 w-4" />
        )}
      </button>

      <div
        className={`overflow-hidden transition-all duration-200 ease-in-out ${
          isOpen ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="pt-2">{children}</div>
      </div>
    </div>
  );
}
