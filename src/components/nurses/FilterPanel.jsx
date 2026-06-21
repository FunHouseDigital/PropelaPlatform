import { X } from 'lucide-react';
import {
  PIPELINE_STAGES,
  SPECIALTIES,
  READINESS_STATUSES,
  NEXT_ACTION_VALUES,
  EFSET_LEVELS,
  OET_STATUSES,
  PROVINCES,
} from '../../lib/constants';

const FILTER_SECTIONS = [
  { key: 'cohort', label: 'Cohort', options: ['Cohort 1', 'Cohort 2', 'Unassigned'] },
  { key: 'pipelineStage', label: 'Pipeline Stage', options: PIPELINE_STAGES },
  { key: 'primaryClinicalSpecialty', label: 'Specialty', options: SPECIALTIES },
  { key: 'readinessStatus', label: 'Readiness Status', options: READINESS_STATUSES },
  { key: 'nextAction', label: 'Next Action', options: NEXT_ACTION_VALUES },
  { key: 'hasFlags', label: 'Has Flags', options: ['Yes', 'No'] },
  { key: 'efSetLevel', label: 'EF SET Level', options: EFSET_LEVELS },
  { key: 'oetStatus', label: 'OET Status', options: OET_STATUSES },
  { key: 'province', label: 'Province', options: PROVINCES },
];

export default function FilterPanel({ filters, onFilterChange, onClose }) {
  const toggleFilter = (key, value) => {
    const current = filters[key] || [];
    const updated = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value];
    onFilterChange({ ...filters, [key]: updated });
  };

  const clearAll = () => {
    onFilterChange({});
  };

  const activeCount = Object.values(filters).reduce(
    (sum, arr) => sum + (arr?.length || 0),
    0
  );

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative ml-auto w-80 bg-white h-full shadow-xl overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold text-gray-900">Filters</h2>
            {activeCount > 0 && (
              <span className="text-xs bg-propela-purple text-white px-2 py-0.5 rounded-full">
                {activeCount}
              </span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          {FILTER_SECTIONS.map(({ key, label, options }) => (
            <div key={key}>
              <h3 className="text-sm font-medium text-gray-700 mb-2">{label}</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {options.map((option) => {
                  const isSelected = (filters[key] || []).includes(option);
                  return (
                    <label
                      key={option}
                      className="flex items-center gap-2 text-sm cursor-pointer py-0.5 px-1 rounded hover:bg-gray-50"
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleFilter(key, option)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-propela-purple focus:ring-propela-purple"
                      />
                      <span className={isSelected ? 'text-gray-900 font-medium' : 'text-gray-600'}>
                        {option}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-2">
          <button
            onClick={clearAll}
            className="flex-1 px-4 py-2 text-sm border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50"
          >
            Clear All
          </button>
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 text-sm bg-propela-purple text-white rounded-lg hover:bg-propela-purple-dark"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
