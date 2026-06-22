import { useState, useMemo, useCallback } from 'react';
import { Plus, X, Edit3, Trash2, Copy, Search, LayoutGrid, List } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';
import { TEMPLATE_TYPES, TEMPLATE_CHANNELS, TEMPLATE_STATUSES, ACQUISITION_TRACKS } from '../../lib/constants';

function getTypeBadgeColor(type) {
  switch (type) {
    case 'Cold outreach': return 'bg-blue-100 text-blue-700';
    case 'Follow-up': return 'bg-amber-100 text-amber-700';
    case 'Partnership ask': return 'bg-purple-100 text-purple-700';
    case 'Info session invite': return 'bg-teal-100 text-teal-700';
    case 'Thank you': return 'bg-green-100 text-green-700';
    case 'Re-engagement': return 'bg-orange-100 text-orange-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function getChannelBadgeColor(channel) {
  switch (channel) {
    case 'Email': return 'bg-indigo-100 text-indigo-700';
    case 'LinkedIn': return 'bg-sky-100 text-sky-700';
    case 'WhatsApp': return 'bg-emerald-100 text-emerald-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

const EMPTY_TEMPLATE = {
  name: '',
  type: 'Cold outreach',
  bestTracks: [],
  channel: 'Email',
  subjectLine: '',
  body: '',
  bestUsedFor: '',
  status: 'Active',
};

export default function TemplateLibrary() {
  const { outreachTemplates, updateOutreachTemplates } = useAppContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [typeFilter, setTypeFilter] = useState('All');
  const [channelFilter, setChannelFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('Active');
  const [sortBy, setSortBy] = useState('name');
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [formData, setFormData] = useState({ ...EMPTY_TEMPLATE });

  const filtered = useMemo(() => {
    let result = [...outreachTemplates];

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter((t) => t.status === statusFilter);
    }

    // Type filter
    if (typeFilter !== 'All') {
      result = result.filter((t) => t.type === typeFilter);
    }

    // Channel filter
    if (channelFilter !== 'All') {
      result = result.filter((t) => t.channel === channelFilter);
    }

    // Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((t) =>
        t.name.toLowerCase().includes(q) ||
        (t.bestUsedFor || '').toLowerCase().includes(q) ||
        (t.subjectLine || '').toLowerCase().includes(q)
      );
    }

    // Sort
    result.sort((a, b) => {
      switch (sortBy) {
        case 'name': return a.name.localeCompare(b.name);
        case 'timesUsed': return (b.timesUsed || 0) - (a.timesUsed || 0);
        case 'responseRate': return (b.responseRate || 0) - (a.responseRate || 0);
        default: return 0;
      }
    });

    return result;
  }, [outreachTemplates, searchQuery, typeFilter, channelFilter, statusFilter, sortBy]);

  function openAddModal() {
    setEditingTemplate(null);
    setFormData({ ...EMPTY_TEMPLATE });
    setShowModal(true);
  }

  function openEditModal(template) {
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      type: template.type,
      bestTracks: [...(template.bestTracks || [])],
      channel: template.channel,
      subjectLine: template.subjectLine || '',
      body: template.body || '',
      bestUsedFor: template.bestUsedFor || '',
      status: template.status || 'Active',
    });
    setShowModal(true);
  }

  function handleSave(e) {
    e.preventDefault();
    let updated;
    if (editingTemplate) {
      updated = outreachTemplates.map((t) =>
        t.id === editingTemplate.id
          ? { ...t, ...formData }
          : t
      );
    } else {
      const newTemplate = {
        ...formData,
        id: `tpl-${crypto.randomUUID()}`,
        timesUsed: 0,
        responseRate: 0,
        lastUsed: null,
        createdAt: new Date().toISOString(),
      };
      updated = [newTemplate, ...outreachTemplates];
    }
    updateOutreachTemplates(updated);
    setShowModal(false);
  }

  function handleDelete(templateId) {
    const template = outreachTemplates.find((t) => t.id === templateId);
    const name = template ? template.name : 'this template';
    if (!window.confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }
    const updated = outreachTemplates.filter((t) => t.id !== templateId);
    updateOutreachTemplates(updated);
  }

  function toggleTrack(track) {
    setFormData((prev) => {
      const tracks = prev.bestTracks.includes(track)
        ? prev.bestTracks.filter((t) => t !== track)
        : [...prev.bestTracks, track];
      return { ...prev, bestTracks: tracks };
    });
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search templates..."
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-propela-purple focus:border-propela-purple"
          />
        </div>

        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-propela-purple"
        >
          <option value="All">All Types</option>
          {TEMPLATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>

        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-propela-purple"
        >
          <option value="All">All Channels</option>
          {TEMPLATE_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-propela-purple"
        >
          <option value="All">All Statuses</option>
          {TEMPLATE_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-propela-purple"
        >
          <option value="name">Sort: Name</option>
          <option value="timesUsed">Sort: Most Used</option>
          <option value="responseRate">Sort: Response Rate</option>
        </select>

        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 ${viewMode === 'grid' ? 'bg-propela-purple text-white' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <LayoutGrid size={14} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 ${viewMode === 'list' ? 'bg-propela-purple text-white' : 'text-gray-400 hover:text-gray-600'}`}
          >
            <List size={14} />
          </button>
        </div>

        <button
          onClick={openAddModal}
          className="flex items-center gap-1 px-3 py-2 bg-propela-purple text-white text-xs font-medium rounded-lg hover:bg-propela-purple/90"
        >
          <Plus size={14} />
          Add Template
        </button>
      </div>

      <span className="text-xs text-gray-400 mb-3 block">{filtered.length} templates</span>

      {/* Grid/List View */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((template) => (
            <div key={template.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-sm font-semibold text-gray-900 line-clamp-2 flex-1">{template.name}</h3>
                <div className="flex items-center gap-1 ml-2">
                  <button onClick={() => openEditModal(template)} className="p-1 hover:bg-gray-100 rounded">
                    <Edit3 size={13} className="text-gray-400" />
                  </button>
                  <button onClick={() => handleDelete(template.id)} className="p-1 hover:bg-red-50 rounded">
                    <Trash2 size={13} className="text-gray-400 hover:text-red-500" />
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeBadgeColor(template.type)}`}>
                  {template.type}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getChannelBadgeColor(template.channel)}`}>
                  {template.channel}
                </span>
                {template.status === 'Archived' && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gray-200 text-gray-500">Archived</span>
                )}
              </div>

              {template.bestUsedFor && (
                <p className="text-xs text-gray-500 mb-3 line-clamp-2">{template.bestUsedFor}</p>
              )}

              <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-50">
                <div className="flex items-center gap-3">
                  <span><span className="font-medium text-gray-700">{template.timesUsed || 0}</span> uses</span>
                  <span><span className="font-medium text-gray-700">{template.responseRate || 0}%</span> response</span>
                </div>
                {template.lastUsed && (
                  <span className="text-gray-400">Last: {template.lastUsed}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Channel</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Uses</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Response</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Used</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((template) => (
                <tr key={template.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-3 py-2.5 font-medium text-gray-900 truncate max-w-[200px]">{template.name}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeBadgeColor(template.type)}`}>
                      {template.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getChannelBadgeColor(template.channel)}`}>
                      {template.channel}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-center text-xs font-medium text-gray-700">{template.timesUsed || 0}</td>
                  <td className="px-3 py-2.5 text-center text-xs font-medium text-gray-700">{template.responseRate || 0}%</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{template.lastUsed || '-'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                      template.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {template.status}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEditModal(template)} className="p-1 hover:bg-gray-100 rounded">
                        <Edit3 size={13} className="text-gray-400" />
                      </button>
                      <button onClick={() => handleDelete(template.id)} className="p-1 hover:bg-red-50 rounded">
                        <Trash2 size={13} className="text-gray-400 hover:text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {filtered.length === 0 && (
        <div className="text-center py-8">
          <Copy size={32} className="text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-400">No templates found.</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowModal(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTemplate ? 'Edit Template' : 'Add Template'}
              </h3>
              <button onClick={() => setShowModal(false)}>
                <X size={20} className="text-gray-400 hover:text-gray-600" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Template Name</label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Template Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    {TEMPLATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Channel</label>
                  <select
                    value={formData.channel}
                    onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    {TEMPLATE_CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Best Tracks</label>
                <div className="flex flex-wrap gap-2">
                  {ACQUISITION_TRACKS.map((track) => (
                    <label key={track} className="flex items-center gap-1.5 text-xs text-gray-600">
                      <input
                        type="checkbox"
                        checked={formData.bestTracks.includes(track)}
                        onChange={() => toggleTrack(track)}
                        className="rounded border-gray-300 text-propela-purple focus:ring-propela-purple"
                      />
                      {track}
                    </label>
                  ))}
                </div>
              </div>
              {formData.channel === 'Email' && (
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Subject Line</label>
                  <input
                    type="text"
                    value={formData.subjectLine}
                    onChange={(e) => setFormData({ ...formData, subjectLine: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
              )}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Body</label>
                <textarea
                  value={formData.body}
                  onChange={(e) => setFormData({ ...formData, body: e.target.value })}
                  rows={5}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple resize-none"
                  placeholder="Template body content..."
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Best Used For</label>
                <input
                  type="text"
                  value={formData.bestUsedFor}
                  onChange={(e) => setFormData({ ...formData, bestUsedFor: e.target.value })}
                  placeholder="When to use this template..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
                <div className="flex items-center gap-3">
                  {TEMPLATE_STATUSES.map((s) => (
                    <label key={s} className="flex items-center gap-1.5 text-sm text-gray-600">
                      <input
                        type="radio"
                        name="status"
                        value={s}
                        checked={formData.status === s}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="text-propela-purple focus:ring-propela-purple"
                      />
                      {s}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-propela-purple text-white text-sm font-medium rounded-lg hover:bg-propela-purple/90"
                >
                  {editingTemplate ? 'Save Changes' : 'Add Template'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
