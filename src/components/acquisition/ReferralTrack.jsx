import { useState, useMemo } from 'react';
import { X, Plus } from 'lucide-react';
import { getReferrers, saveReferrers } from '../../lib/storage';
import { ORGANISATION_STAGES } from '../../lib/constants';
import { sanitizeText, validateForm, MAX_LENGTHS } from '../../lib/validation';
import OutreachLogEntry from './OutreachLogEntry';

const REFERRER_TYPES = ['Placed Nurse', 'Nursing Colleague', 'Healthcare Professional', 'Community Leader', 'Other'];

function getTypeColor(type) {
  switch (type) {
    case 'Placed Nurse': return 'bg-green-100 text-green-700';
    case 'Healthcare Professional': return 'bg-blue-100 text-blue-700';
    case 'Nursing Colleague': return 'bg-teal-100 text-teal-700';
    case 'Community Leader': return 'bg-purple-100 text-purple-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function getStageColor(stage) {
  switch (stage) {
    case 'Active': return 'bg-green-100 text-green-700';
    case 'Engaged / Meeting Set': return 'bg-blue-100 text-blue-700';
    case 'Responded': return 'bg-teal-100 text-teal-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export default function ReferralTrack({ searchQuery }) {
  const [referrers, setReferrers] = useState(() => getReferrers());
  const [selectedRef, setSelectedRef] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [newRef, setNewRef] = useState({
    name: '',
    type: 'Placed Nurse',
    contactPhone: '',
    contactEmail: '',
    relationshipStage: 'Identified',
  });

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return referrers;
    const q = searchQuery.toLowerCase();
    return referrers.filter(
      (r) => r.name.toLowerCase().includes(q) || (r.type && r.type.toLowerCase().includes(q))
    );
  }, [referrers, searchQuery]);

  function handleAdd(e) {
    e.preventDefault();
    const { valid, errors } = validateForm(newRef, {
      name: { label: 'Name', required: true, maxLength: MAX_LENGTHS.NAME },
      contactEmail: { label: 'Email', email: true },
    });
    if (!valid) {
      setFormError(errors.name || errors.contactEmail);
      return;
    }
    setFormError('');
    const ref = {
      ...newRef,
      name: sanitizeText(newRef.name, { maxLength: MAX_LENGTHS.NAME }),
      contactPhone: sanitizeText(newRef.contactPhone, { maxLength: MAX_LENGTHS.SHORT_TEXT }),
      contactEmail: sanitizeText(newRef.contactEmail, { maxLength: MAX_LENGTHS.EMAIL }),
      id: `ref-${Date.now()}`,
      linkedNurseId: null,
      nursesReferred: 0,
      nursesConverted: 0,
      lastReferralDate: null,
      notes: '',
      tags: [],
      outreachLog: [],
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [ref, ...referrers];
    setReferrers(updated);
    saveReferrers(updated);
    setShowAddForm(false);
    setNewRef({ name: '', type: 'Placed Nurse', contactPhone: '', contactEmail: '', relationshipStage: 'Identified' });
  }

  function updateRef(refId, field, value) {
    const cleanValue = typeof value === 'string'
      ? sanitizeText(value, { maxLength: MAX_LENGTHS.LONG_TEXT, trim: false })
      : value;
    const updated = referrers.map((r) =>
      r.id === refId ? { ...r, [field]: cleanValue } : r
    );
    setReferrers(updated);
    saveReferrers(updated);
    if (selectedRef && selectedRef.id === refId) {
      setSelectedRef({ ...selectedRef, [field]: cleanValue });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-400">{filtered.length} referrers</span>
        <button
          onClick={() => { setFormError(''); setShowAddForm(true); }}
          className="flex items-center gap-1 px-3 py-1.5 bg-propela-purple text-white text-xs font-medium rounded-lg hover:bg-propela-purple/90"
        >
          <Plus size={14} />
          Add Referrer
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((ref) => {
          const conversionRate = ref.nursesReferred > 0
            ? Math.round((ref.nursesConverted / ref.nursesReferred) * 100)
            : 0;

          return (
            <div
              key={ref.id}
              onClick={() => setSelectedRef(ref)}
              className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-propela-purple/20 transition-all"
            >
              <div className="flex items-start justify-between mb-2">
                <h4 className="font-semibold text-gray-900 text-sm">{ref.name}</h4>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeColor(ref.type)}`}>
                  {ref.type}
                </span>
              </div>
              <div className="flex items-center gap-2 mb-2">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStageColor(ref.relationshipStage)}`}>
                  {ref.relationshipStage}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-lg font-semibold text-gray-900">{ref.nursesReferred}</p>
                  <p className="text-xs text-gray-500">Referred</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-green-600">{ref.nursesConverted}</p>
                  <p className="text-xs text-gray-500">Converted</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-semibold text-propela-purple">{conversionRate}%</p>
                  <p className="text-xs text-gray-500">Rate</p>
                </div>
              </div>
              {ref.lastReferralDate && (
                <p className="text-xs text-gray-400 mt-2">Last referral: {ref.lastReferralDate}</p>
              )}
            </div>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">No referrers found.</div>
      )}

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAddForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Referrer</h3>
              <button onClick={() => setShowAddForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Name</label>
                <input
                  type="text"
                  required
                  value={newRef.name}
                  onChange={(e) => setNewRef({ ...newRef, name: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Type</label>
                <select
                  value={newRef.type}
                  onChange={(e) => setNewRef({ ...newRef, type: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                >
                  {REFERRER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={newRef.contactPhone}
                    onChange={(e) => setNewRef({ ...newRef, contactPhone: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Email</label>
                  <input
                    type="email"
                    value={newRef.contactEmail}
                    onChange={(e) => setNewRef({ ...newRef, contactEmail: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-propela-purple text-white text-sm font-medium rounded-lg hover:bg-propela-purple/90"
                >
                  Add Referrer
                </button>
              </div>
              {formError && (
                <p role="alert" className="text-sm text-red-600">{formError}</p>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Detail Slide-out */}
      {selectedRef && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedRef(null)} />
          <div className="relative h-full w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedRef.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeColor(selectedRef.type)}`}>
                    {selectedRef.type}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStageColor(selectedRef.relationshipStage)}`}>
                    {selectedRef.relationshipStage}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedRef(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedRef.nursesReferred}</p>
                  <p className="text-xs text-gray-500">Referred</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{selectedRef.nursesConverted}</p>
                  <p className="text-xs text-gray-500">Converted</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-propela-purple">
                    {selectedRef.nursesReferred > 0 ? Math.round((selectedRef.nursesConverted / selectedRef.nursesReferred) * 100) : 0}%
                  </p>
                  <p className="text-xs text-gray-500">Conversion</p>
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Type</label>
                  <select
                    value={selectedRef.type}
                    onChange={(e) => updateRef(selectedRef.id, 'type', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    {REFERRER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Relationship Stage</label>
                  <select
                    value={selectedRef.relationshipStage}
                    onChange={(e) => updateRef(selectedRef.id, 'relationshipStage', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    {ORGANISATION_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={selectedRef.contactPhone || ''}
                    onChange={(e) => updateRef(selectedRef.id, 'contactPhone', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Email</label>
                  <input
                    type="email"
                    value={selectedRef.contactEmail || ''}
                    onChange={(e) => updateRef(selectedRef.id, 'contactEmail', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Nurses Referred</label>
                  <input
                    type="number"
                    value={selectedRef.nursesReferred || 0}
                    onChange={(e) => updateRef(selectedRef.id, 'nursesReferred', parseInt(e.target.value) || 0)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Nurses Converted</label>
                  <input
                    type="number"
                    value={selectedRef.nursesConverted || 0}
                    onChange={(e) => updateRef(selectedRef.id, 'nursesConverted', parseInt(e.target.value) || 0)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Last Referral Date</label>
                  <input
                    type="date"
                    value={selectedRef.lastReferralDate || ''}
                    onChange={(e) => updateRef(selectedRef.id, 'lastReferralDate', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Notes</label>
                <textarea
                  value={selectedRef.notes || ''}
                  onChange={(e) => updateRef(selectedRef.id, 'notes', e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Tags</label>
                <div className="flex flex-wrap gap-1">
                  {(selectedRef.tags || []).map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">{tag}</span>
                  ))}
                </div>
              </div>

              {/* Outreach Log */}
              <div className="border-t border-gray-100 pt-4">
                <OutreachLogEntry
                  log={selectedRef.outreachLog || []}
                  onSave={(log) => updateRef(selectedRef.id, 'outreachLog', log)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
