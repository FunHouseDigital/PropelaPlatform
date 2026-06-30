import { useState, useMemo } from 'react';
import { X, Plus, Star } from 'lucide-react';
import { getFacilities, saveFacilities } from '../../lib/storage';
import { ORGANISATION_STAGES, ORGANISATION_TYPES, PROVINCES, HEALTHCARE_GROUPS, OUTREACH_APPROACHES } from '../../lib/constants';
import { sanitizeText, validateForm, MAX_LENGTHS } from '../../lib/validation';
import OutreachLogEntry from './OutreachLogEntry';

function getStageColor(stage) {
  switch (stage) {
    case 'Active': return 'bg-green-100 text-green-700';
    case 'Engaged / Meeting Set': return 'bg-blue-100 text-blue-700';
    case 'Responded': return 'bg-teal-100 text-teal-700';
    case 'Outreach Sent':
    case 'Follow-Up Pending': return 'bg-amber-100 text-amber-700';
    case 'Dormant': return 'bg-gray-100 text-gray-500';
    case 'Closed': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function getTypeColor(type) {
  if (type === 'NEI') return 'bg-purple-100 text-purple-700';
  return 'bg-blue-100 text-blue-700';
}

function renderStars(rating) {
  const stars = [];
  for (let i = 1; i <= 5; i++) {
    stars.push(
      <Star
        key={i}
        size={12}
        className={i <= (rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}
      />
    );
  }
  return stars;
}

export default function OrganisationsTrack({ searchQuery }) {
  const [facilities, setFacilities] = useState(() => getFacilities());
  const [selectedOrg, setSelectedOrg] = useState(null);
  const [typeFilter, setTypeFilter] = useState('All');
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [newOrg, setNewOrg] = useState({
    name: '',
    type: 'Health Facility',
    province: 'Gauteng',
    city: '',
    healthcareGroup: '',
    stage: 'Identified',
    rating: 0,
  });

  const filtered = useMemo(() => {
    let result = [...facilities];
    if (typeFilter !== 'All') {
      result = result.filter((f) => f.type === typeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          (f.city && f.city.toLowerCase().includes(q)) ||
          (f.province && f.province.toLowerCase().includes(q))
      );
    }
    return result;
  }, [facilities, typeFilter, searchQuery]);

  function handleAddOrg(e) {
    e.preventDefault();
    const { valid, errors } = validateForm(newOrg, {
      name: { label: 'Name', required: true, maxLength: MAX_LENGTHS.NAME },
      city: { label: 'City', maxLength: MAX_LENGTHS.SHORT_TEXT },
    });
    if (!valid) {
      setFormError(errors.name || errors.city);
      return;
    }
    setFormError('');
    const org = {
      ...newOrg,
      name: sanitizeText(newOrg.name, { maxLength: MAX_LENGTHS.NAME }),
      city: sanitizeText(newOrg.city, { maxLength: MAX_LENGTHS.SHORT_TEXT }),
      id: `org-${Date.now()}`,
      lastContact: null,
      nextFollowUp: null,
      nursesSourced: 0,
      outreachApproach: '',
      infoSessionDate: null,
      infoSessionAttendees: 0,
      infoSessionNotes: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      notes: '',
      outreachLog: [],
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [org, ...facilities];
    setFacilities(updated);
    saveFacilities(updated);
    setShowAddForm(false);
    setNewOrg({ name: '', type: 'Health Facility', province: 'Gauteng', city: '', healthcareGroup: '', stage: 'Identified', rating: 0 });
  }

  function updateOrg(orgId, field, value) {
    // Free-text edits are control-char stripped + length capped before persist.
    const cleanValue = typeof value === 'string'
      ? sanitizeText(value, { maxLength: MAX_LENGTHS.LONG_TEXT, trim: false })
      : value;
    const updated = facilities.map((f) =>
      f.id === orgId ? { ...f, [field]: cleanValue } : f
    );
    setFacilities(updated);
    saveFacilities(updated);
    if (selectedOrg && selectedOrg.id === orgId) {
      setSelectedOrg({ ...selectedOrg, [field]: cleanValue });
    }
  }

  function updateOrgOutreachLog(orgId, log) {
    updateOrg(orgId, 'outreachLog', log);
  }

  return (
    <div>
      {/* Sub-filters */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xs text-gray-500">Type:</span>
        {['All', 'NEI', 'Health Facility'].map((type) => (
          <button
            key={type}
            onClick={() => setTypeFilter(type)}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              typeFilter === type
                ? 'bg-propela-purple text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {type}
          </button>
        ))}
        <span className="text-xs text-gray-400 ml-auto">{filtered.length} organisations</span>
        <button
          onClick={() => { setFormError(''); setShowAddForm(true); }}
          className="flex items-center gap-1 px-3 py-1.5 bg-propela-purple text-white text-xs font-medium rounded-lg hover:bg-propela-purple/90"
        >
          <Plus size={14} />
          Add Organisation
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Province</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">City</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Stage</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Last Contact</th>
                <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Follow-up</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nurses</th>
                <th className="text-center px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">Rating</th>
              </tr>
            </thead>
            <tbody>
              {filtered.slice(0, 50).map((org) => (
                <tr
                  key={org.id}
                  onClick={() => setSelectedOrg(org)}
                  className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer"
                >
                  <td className="px-3 py-2.5 font-medium text-gray-900 truncate max-w-[200px]">{org.name}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeColor(org.type)}`}>
                      {org.type}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs">{org.province}</td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs">{org.city}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStageColor(org.stage)}`}>
                      {org.stage || 'Identified'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{org.lastContact || '-'}</td>
                  <td className="px-3 py-2.5 text-xs text-gray-500">{org.nextFollowUp || '-'}</td>
                  <td className="px-3 py-2.5 text-center text-xs font-medium text-gray-700">{org.nursesSourced || 0}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex items-center justify-center">{renderStars(org.rating)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length > 50 && (
            <div className="px-3 py-2 text-center text-xs text-gray-400 border-t border-gray-100">
              Showing 50 of {filtered.length} organisations. Use search to filter.
            </div>
          )}
        </div>
      </div>

      {/* Add Organisation Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAddForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Organisation</h3>
              <button onClick={() => setShowAddForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleAddOrg} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={newOrg.name}
                  onChange={(e) => setNewOrg({ ...newOrg, name: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Type</label>
                  <select
                    value={newOrg.type}
                    onChange={(e) => setNewOrg({ ...newOrg, type: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    {ORGANISATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Healthcare Group</label>
                  <select
                    value={newOrg.healthcareGroup}
                    onChange={(e) => setNewOrg({ ...newOrg, healthcareGroup: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    <option value="">Select...</option>
                    {HEALTHCARE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Province</label>
                  <select
                    value={newOrg.province}
                    onChange={(e) => setNewOrg({ ...newOrg, province: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">City</label>
                  <input
                    type="text"
                    value={newOrg.city}
                    onChange={(e) => setNewOrg({ ...newOrg, city: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-propela-purple text-white text-sm font-medium rounded-lg hover:bg-propela-purple/90"
                >
                  Add Organisation
                </button>
              </div>
              {formError && (
                <p role="alert" className="text-sm text-red-600">{formError}</p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Organisation Detail Slide-out */}
      {selectedOrg && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedOrg(null)} />
          <div className="relative h-full w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedOrg.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeColor(selectedOrg.type)}`}>
                    {selectedOrg.type}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStageColor(selectedOrg.stage || 'Identified')}`}>
                    {selectedOrg.stage || 'Identified'}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedOrg(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Province</label>
                  <select
                    value={selectedOrg.province}
                    onChange={(e) => updateOrg(selectedOrg.id, 'province', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">City</label>
                  <input
                    type="text"
                    value={selectedOrg.city || ''}
                    onChange={(e) => updateOrg(selectedOrg.id, 'city', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
              </div>

              {/* Stage & Rating */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Stage</label>
                  <select
                    value={selectedOrg.stage || 'Identified'}
                    onChange={(e) => updateOrg(selectedOrg.id, 'stage', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    {ORGANISATION_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Rating</label>
                  <select
                    value={selectedOrg.rating || 0}
                    onChange={(e) => updateOrg(selectedOrg.id, 'rating', parseInt(e.target.value))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    {[0, 1, 2, 3, 4, 5].map((r) => <option key={r} value={r}>{r} star{r !== 1 ? 's' : ''}</option>)}
                  </select>
                </div>
              </div>

              {/* Type B Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Healthcare Group</label>
                  <select
                    value={selectedOrg.healthcareGroup || ''}
                    onChange={(e) => updateOrg(selectedOrg.id, 'healthcareGroup', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    <option value="">Select...</option>
                    {HEALTHCARE_GROUPS.map((g) => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Outreach Approach</label>
                  <select
                    value={selectedOrg.outreachApproach || ''}
                    onChange={(e) => updateOrg(selectedOrg.id, 'outreachApproach', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    <option value="">Select...</option>
                    {OUTREACH_APPROACHES.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              {/* Contact */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Contact Person</label>
                  <input
                    type="text"
                    value={selectedOrg.contactPerson || ''}
                    onChange={(e) => updateOrg(selectedOrg.id, 'contactPerson', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Contact Email</label>
                  <input
                    type="email"
                    value={selectedOrg.contactEmail || ''}
                    onChange={(e) => updateOrg(selectedOrg.id, 'contactEmail', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Last Contact</label>
                  <input
                    type="date"
                    value={selectedOrg.lastContact || ''}
                    onChange={(e) => updateOrg(selectedOrg.id, 'lastContact', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Next Follow-up</label>
                  <input
                    type="date"
                    value={selectedOrg.nextFollowUp || ''}
                    onChange={(e) => updateOrg(selectedOrg.id, 'nextFollowUp', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
              </div>

              {/* Info Session fields */}
              <div>
                <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Info Session</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Session Date</label>
                    <input
                      type="date"
                      value={selectedOrg.infoSessionDate || ''}
                      onChange={(e) => updateOrg(selectedOrg.id, 'infoSessionDate', e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Attendees</label>
                    <input
                      type="number"
                      value={selectedOrg.infoSessionAttendees || ''}
                      onChange={(e) => updateOrg(selectedOrg.id, 'infoSessionAttendees', parseInt(e.target.value) || 0)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                    />
                  </div>
                </div>
                <div className="mt-2">
                  <label className="text-xs font-medium text-gray-500 block mb-1">Session Notes</label>
                  <textarea
                    value={selectedOrg.infoSessionNotes || ''}
                    onChange={(e) => updateOrg(selectedOrg.id, 'infoSessionNotes', e.target.value)}
                    rows={2}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple resize-none"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Notes</label>
                <textarea
                  value={selectedOrg.notes || ''}
                  onChange={(e) => updateOrg(selectedOrg.id, 'notes', e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple resize-none"
                />
              </div>

              {/* Outreach Log */}
              <div className="border-t border-gray-100 pt-4">
                <OutreachLogEntry
                  log={selectedOrg.outreachLog || []}
                  onSave={(log) => updateOrgOutreachLog(selectedOrg.id, log)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
