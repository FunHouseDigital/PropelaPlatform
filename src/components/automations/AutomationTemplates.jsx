import { useState, useMemo, useCallback } from 'react';
import { Search, Zap, X, Settings, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

const CATEGORIES = ['All', 'onboarding', 'compliance', 'recruitment', 'operations', 'communications'];

function ConfigurePanel({ template, onSave, onCancel }) {
  const [params, setParams] = useState(
    template.parameters.map((p) => ({ ...p, value: p.value ?? p.defaultValue ?? '' }))
  );

  const handleChange = (index, value) => {
    setParams(params.map((p, i) => (i === index ? { ...p, value } : p)));
  };

  const handleSave = () => {
    onSave(params);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-lg w-full">
        <div className="flex items-center justify-between p-5 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Configure: {template.name}</h2>
          <button onClick={onCancel} className="text-gray-400 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>
        <div className="p-5 space-y-4">
          {params.length === 0 && (
            <p className="text-sm text-gray-500">No configurable parameters for this template.</p>
          )}
          {params.map((param, index) => (
            <div key={param.name}>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                {param.label}
                {param.required && <span className="text-red-500 ml-1">*</span>}
              </label>
              {param.type === 'boolean' ? (
                <button
                  onClick={() => handleChange(index, !param.value)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${param.value ? 'bg-[#5B2D8E]' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${param.value ? 'left-5' : 'left-0.5'}`} />
                </button>
              ) : param.type === 'select' ? (
                <select
                  value={param.value || ''}
                  onChange={(e) => handleChange(index, e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E] outline-none"
                >
                  <option value="">Select...</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              ) : (
                <input
                  type={param.type === 'number' ? 'number' : 'text'}
                  value={param.value || ''}
                  onChange={(e) => handleChange(index, param.type === 'number' ? Number(e.target.value) : e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E] outline-none"
                  placeholder={`Enter ${param.label.toLowerCase()}...`}
                />
              )}
            </div>
          ))}
        </div>
        <div className="flex items-center justify-end gap-3 p-5 border-t border-gray-200">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors">
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 text-sm font-medium text-white bg-[#5B2D8E] rounded-md hover:bg-[#4a2573] transition-colors"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </div>
  );
}

export default function AutomationTemplates() {
  const { automationTemplates, updateAutomationTemplates } = useAppContext();
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [configuringTemplate, setConfiguringTemplate] = useState(null);

  const filteredTemplates = useMemo(() => {
    let filtered = automationTemplates;
    if (activeCategory !== 'All') {
      filtered = filtered.filter((t) => t.category === activeCategory);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (t) => t.name.toLowerCase().includes(q) || t.description.toLowerCase().includes(q)
      );
    }
    return filtered;
  }, [automationTemplates, activeCategory, searchQuery]);

  const handleActivate = useCallback((templateId) => {
    const updated = automationTemplates.map((t) =>
      t.id === templateId ? { ...t, isActive: !t.isActive } : t
    );
    updateAutomationTemplates(updated);
  }, [automationTemplates, updateAutomationTemplates]);

  const handleConfigure = useCallback((template) => {
    setConfiguringTemplate(template);
  }, []);

  const handleSaveConfig = useCallback((params) => {
    const updated = automationTemplates.map((t) =>
      t.id === configuringTemplate.id ? { ...t, parameters: params } : t
    );
    updateAutomationTemplates(updated);
    setConfiguringTemplate(null);
  }, [automationTemplates, updateAutomationTemplates, configuringTemplate]);

  const stats = useMemo(() => {
    const total = automationTemplates.length;
    const active = automationTemplates.filter((t) => t.isActive).length;
    return { total, active };
  }, [automationTemplates]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Total Templates</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Active Templates</p>
          <p className="text-2xl font-bold text-green-600">{stats.active}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-4">
          <p className="text-xs text-gray-500 mb-1">Categories</p>
          <p className="text-2xl font-bold text-[#5B2D8E]">{CATEGORIES.length - 1}</p>
        </div>
      </div>

      {/* Category Filter and Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex gap-1 flex-wrap">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium capitalize transition-colors
                ${activeCategory === cat
                  ? 'bg-[#5B2D8E] text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="pl-8 pr-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E] outline-none w-60"
          />
        </div>
      </div>

      {/* Template Cards Grid */}
      <div className="grid gap-4 md:grid-cols-2">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="bg-white border border-gray-200 rounded-lg p-5 hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-gray-900 mb-1">{template.name}</h3>
                <p className="text-sm text-gray-600">{template.description}</p>
              </div>
              <span className={`ml-3 flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${template.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                {template.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>

            <div className="flex items-center gap-2 mb-4">
              <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded capitalize">{template.category}</span>
              <span className="text-xs text-gray-500">{template.parameters.length} parameter{template.parameters.length !== 1 ? 's' : ''}</span>
              <span className="text-xs text-gray-500">{template.conditions.length} condition{template.conditions.length !== 1 ? 's' : ''}</span>
              <span className="text-xs text-gray-500">{template.actions.length} action{template.actions.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Parameter summary */}
            {template.parameters.length > 0 && (
              <div className="mb-4 bg-gray-50 rounded-md p-2.5">
                <p className="text-xs font-medium text-gray-700 mb-1.5">Parameters:</p>
                <div className="flex flex-wrap gap-1.5">
                  {template.parameters.map((p) => (
                    <span key={p.name} className="text-xs bg-white border border-gray-200 px-2 py-0.5 rounded text-gray-600">
                      {p.label} ({p.type})
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center gap-2 pt-3 border-t border-gray-100">
              <button
                onClick={() => handleActivate(template.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors
                  ${template.isActive
                    ? 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    : 'bg-[#5B2D8E] text-white hover:bg-[#4a2573]'
                  }`}
              >
                {template.isActive ? (
                  <><AlertCircle size={12} /> Deactivate</>
                ) : (
                  <><Zap size={12} /> Activate</>
                )}
              </button>
              <button
                onClick={() => handleConfigure(template)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              >
                <Settings size={12} /> Configure
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12 bg-white border border-gray-200 rounded-lg">
          <CheckCircle size={32} className="mx-auto text-gray-300 mb-3" />
          <p className="text-sm text-gray-500">No templates match your filters.</p>
        </div>
      )}

      {/* Configure Modal */}
      {configuringTemplate && (
        <ConfigurePanel
          template={configuringTemplate}
          onSave={handleSaveConfig}
          onCancel={() => setConfiguringTemplate(null)}
        />
      )}
    </div>
  );
}
