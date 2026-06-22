import { Bookmark, Trash2, FolderOpen } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppContext } from '../../context/AppContext';

export default function SavedViewsPanel({ module }) {
  const { savedViews, updateSavedViews } = useAppContext();
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();

  const filteredViews = module
    ? savedViews.filter((view) => view.module === module)
    : savedViews;

  const handleApply = (view) => {
    if (view.module) {
      const modulePaths = {
        nurses: '/nurses',
        placements: '/placements',
        documents: '/documents',
        cohorts: '/cohorts',
      };
      const path = modulePaths[view.module] || '/';
      navigate(path);
    }
    if (view.filters && view.filters.filter) {
      setSearchParams({ filter: view.filters.filter });
    }
  };

  const handleDelete = (viewId) => {
    const updated = savedViews.filter((v) => v.id !== viewId);
    updateSavedViews(updated);
  };

  if (filteredViews.length === 0) {
    return (
      <div className="p-4 text-center">
        <FolderOpen size={24} className="mx-auto text-gray-300 mb-2" />
        <p className="text-sm text-gray-500">No saved views yet</p>
        <p className="text-xs text-gray-400 mt-1">Apply filters and save them for quick access</p>
      </div>
    );
  }

  return (
    <div className="divide-y divide-gray-100">
      {filteredViews.map((view) => (
        <div key={view.id} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 group">
          <Bookmark size={14} className="text-blue-500 shrink-0" />
          <button
            type="button"
            onClick={() => handleApply(view)}
            className="flex-1 text-left min-w-0"
          >
            <p className="text-sm font-medium text-gray-900 truncate">{view.name}</p>
            <p className="text-xs text-gray-400 capitalize">{view.module}</p>
          </button>
          <button
            type="button"
            onClick={() => handleDelete(view.id)}
            className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-opacity"
          >
            <Trash2 size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
