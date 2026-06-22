import { useState } from 'react';
import { Filter, Save, X } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';
import { getFilterPresets } from '../../lib/searchUtils';

export default function QuickFilters({ module, data = [], onFilter }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [viewName, setViewName] = useState('');
  const { savedViews, updateSavedViews } = useAppContext();

  const presets = getFilterPresets(module);
  const activeFilter = searchParams.get('filter') || '';

  const getFilterCount = (preset) => {
    if (!data || data.length === 0) return 0;
    return data.filter((item) => {
      const fieldValue = item[preset.filter.field] || '';
      return fieldValue.toLowerCase().includes(preset.filter.value.toLowerCase());
    }).length;
  };

  const handlePresetClick = (preset) => {
    if (activeFilter === preset.id) {
      searchParams.delete('filter');
      setSearchParams(searchParams);
      if (onFilter) onFilter(null);
    } else {
      searchParams.set('filter', preset.id);
      setSearchParams(searchParams);
      if (onFilter) onFilter(preset.filter);
    }
  };

  const handleSaveView = () => {
    if (!viewName.trim()) return;
    const newView = {
      id: `view-${Date.now()}`,
      name: viewName.trim(),
      module,
      filters: activeFilter ? { filter: activeFilter } : {},
    };
    const updated = [...savedViews, newView];
    updateSavedViews(updated);
    setViewName('');
    setShowSaveModal(false);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <div className="flex items-center gap-1.5 text-sm text-gray-500 mr-1">
        <Filter size={14} />
        <span>Filters:</span>
      </div>

      {presets.map((preset) => {
        const count = getFilterCount(preset);
        const isActive = activeFilter === preset.id;
        return (
          <button
            key={preset.id}
            type="button"
            onClick={() => handlePresetClick(preset)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
              isActive
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {preset.name}
            <span className={`px-1.5 py-0.5 rounded-full text-xs ${
              isActive ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'
            }`}>
              {count}
            </span>
          </button>
        );
      })}

      {activeFilter && (
        <button
          type="button"
          onClick={() => setShowSaveModal(true)}
          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-gray-500 hover:text-gray-700 border border-dashed border-gray-300 rounded-full hover:border-gray-400 transition-colors"
        >
          <Save size={12} />
          Save View
        </button>
      )}

      {/* Save View Modal */}
      {showSaveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowSaveModal(false)} />
          <div className="relative bg-white rounded-lg shadow-xl p-5 w-80">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Save Current View</h3>
              <button type="button" onClick={() => setShowSaveModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={16} />
              </button>
            </div>
            <input
              type="text"
              value={viewName}
              onChange={(e) => setViewName(e.target.value)}
              placeholder="View name..."
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
              onKeyDown={(e) => e.key === 'Enter' && handleSaveView()}
            />
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={() => setShowSaveModal(false)}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveView}
                className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
