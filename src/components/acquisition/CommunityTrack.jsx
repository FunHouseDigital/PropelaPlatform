import { useState, useMemo } from 'react';
import { X, Plus, Users } from 'lucide-react';
import { getCommunityChannels, saveCommunityChannels } from '../../lib/storage';
import { ORGANISATION_STAGES } from '../../lib/constants';
import OutreachLogEntry from './OutreachLogEntry';

const CHANNEL_TYPES = ['Facebook Group', 'WhatsApp Group', 'Professional Association', 'LinkedIn Group', 'Online Forum', 'Other'];
const ACCESS_STATUSES = ['Member', 'Pending', 'Not Joined'];
const POST_OUTCOMES = ['No response', 'Some engagement', 'Good response', 'Nurse leads generated'];

function getTypeColor(type) {
  switch (type) {
    case 'Facebook Group': return 'bg-blue-100 text-blue-700';
    case 'WhatsApp Group': return 'bg-green-100 text-green-700';
    case 'Professional Association': return 'bg-purple-100 text-purple-700';
    case 'LinkedIn Group': return 'bg-sky-100 text-sky-700';
    case 'Online Forum': return 'bg-orange-100 text-orange-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function getAccessColor(status) {
  switch (status) {
    case 'Member': return 'bg-green-100 text-green-700';
    case 'Pending': return 'bg-amber-100 text-amber-700';
    case 'Not Joined': return 'bg-gray-100 text-gray-500';
    default: return 'bg-gray-100 text-gray-500';
  }
}

function getStageColor(stage) {
  switch (stage) {
    case 'Active': return 'bg-green-100 text-green-700';
    case 'Engaged / Meeting Set': return 'bg-blue-100 text-blue-700';
    case 'Responded': return 'bg-teal-100 text-teal-700';
    case 'Outreach Sent': return 'bg-amber-100 text-amber-700';
    case 'Dormant': return 'bg-gray-100 text-gray-500';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export default function CommunityTrack({ searchQuery }) {
  const [channels, setChannels] = useState(() => getCommunityChannels());
  const [selectedChannel, setSelectedChannel] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newChannel, setNewChannel] = useState({
    name: '',
    type: 'Facebook Group',
    platform: '',
    url: '',
    estimatedReach: 0,
    adminName: '',
    adminContact: '',
    accessStatus: 'Not Joined',
  });

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return channels;
    const q = searchQuery.toLowerCase();
    return channels.filter(
      (c) => c.name.toLowerCase().includes(q) || (c.type && c.type.toLowerCase().includes(q)) || (c.platform && c.platform.toLowerCase().includes(q))
    );
  }, [channels, searchQuery]);

  function handleAdd(e) {
    e.preventDefault();
    const channel = {
      ...newChannel,
      id: `ch-${Date.now()}`,
      postPermission: false,
      currentStage: 'Identified',
      lastPosted: null,
      lastPostOutcome: null,
      nursesSourced: 0,
      notes: '',
      tags: [],
      outreachLog: [],
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [channel, ...channels];
    setChannels(updated);
    saveCommunityChannels(updated);
    setShowAddForm(false);
    setNewChannel({ name: '', type: 'Facebook Group', platform: '', url: '', estimatedReach: 0, adminName: '', adminContact: '', accessStatus: 'Not Joined' });
  }

  function updateChannel(chId, field, value) {
    const updated = channels.map((c) =>
      c.id === chId ? { ...c, [field]: value } : c
    );
    setChannels(updated);
    saveCommunityChannels(updated);
    if (selectedChannel && selectedChannel.id === chId) {
      setSelectedChannel({ ...selectedChannel, [field]: value });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-400">{filtered.length} channels</span>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-propela-purple text-white text-xs font-medium rounded-lg hover:bg-propela-purple/90"
        >
          <Plus size={14} />
          Add Channel
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((ch) => (
          <div
            key={ch.id}
            onClick={() => setSelectedChannel(ch)}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-propela-purple/20 transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-gray-900 text-sm truncate max-w-[200px]">{ch.name}</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${getTypeColor(ch.type)}`}>
                {ch.type}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getAccessColor(ch.accessStatus)}`}>
                {ch.accessStatus}
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStageColor(ch.currentStage)}`}>
                {ch.currentStage}
              </span>
            </div>
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Users size={12} />
                <span>{ch.estimatedReach ? ch.estimatedReach.toLocaleString() : '0'} reach</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="font-medium text-propela-purple">{ch.nursesSourced || 0}</span>
                <span>sourced</span>
              </div>
            </div>
            {ch.lastPosted && (
              <p className="text-xs text-gray-400 mt-2">Last posted: {ch.lastPosted}</p>
            )}
            {ch.lastPostOutcome && (
              <p className={`text-xs mt-1 ${
                ch.lastPostOutcome.includes('Good') || ch.lastPostOutcome.includes('leads')
                  ? 'text-green-600'
                  : 'text-gray-500'
              }`}>
                Outcome: {ch.lastPostOutcome}
              </p>
            )}
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">No community channels found.</div>
      )}

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAddForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Channel</h3>
              <button onClick={() => setShowAddForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Channel Name</label>
                <input
                  type="text"
                  required
                  value={newChannel.name}
                  onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Type</label>
                  <select
                    value={newChannel.type}
                    onChange={(e) => setNewChannel({ ...newChannel, type: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    {CHANNEL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Platform</label>
                  <input
                    type="text"
                    value={newChannel.platform}
                    onChange={(e) => setNewChannel({ ...newChannel, platform: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">URL</label>
                <input
                  type="text"
                  value={newChannel.url}
                  onChange={(e) => setNewChannel({ ...newChannel, url: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Estimated Reach</label>
                  <input
                    type="number"
                    value={newChannel.estimatedReach}
                    onChange={(e) => setNewChannel({ ...newChannel, estimatedReach: parseInt(e.target.value) || 0 })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Admin Name</label>
                  <input
                    type="text"
                    value={newChannel.adminName}
                    onChange={(e) => setNewChannel({ ...newChannel, adminName: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-propela-purple text-white text-sm font-medium rounded-lg hover:bg-propela-purple/90"
                >
                  Add Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Slide-out */}
      {selectedChannel && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedChannel(null)} />
          <div className="relative h-full w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedChannel.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeColor(selectedChannel.type)}`}>
                    {selectedChannel.type}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getAccessColor(selectedChannel.accessStatus)}`}>
                    {selectedChannel.accessStatus}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedChannel(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedChannel.estimatedReach ? selectedChannel.estimatedReach.toLocaleString() : '0'}</p>
                  <p className="text-xs text-gray-500">Estimated Reach</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-propela-purple">{selectedChannel.nursesSourced || 0}</p>
                  <p className="text-xs text-gray-500">Nurses Sourced</p>
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Channel Type</label>
                  <select
                    value={selectedChannel.type}
                    onChange={(e) => updateChannel(selectedChannel.id, 'type', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    {CHANNEL_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Platform</label>
                  <input
                    type="text"
                    value={selectedChannel.platform || ''}
                    onChange={(e) => updateChannel(selectedChannel.id, 'platform', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 block mb-1">URL</label>
                  <input
                    type="text"
                    value={selectedChannel.url || ''}
                    onChange={(e) => updateChannel(selectedChannel.id, 'url', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Estimated Reach</label>
                  <input
                    type="number"
                    value={selectedChannel.estimatedReach || ''}
                    onChange={(e) => updateChannel(selectedChannel.id, 'estimatedReach', parseInt(e.target.value) || 0)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Nurses Sourced</label>
                  <input
                    type="number"
                    value={selectedChannel.nursesSourced || ''}
                    onChange={(e) => updateChannel(selectedChannel.id, 'nursesSourced', parseInt(e.target.value) || 0)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Admin Name</label>
                  <input
                    type="text"
                    value={selectedChannel.adminName || ''}
                    onChange={(e) => updateChannel(selectedChannel.id, 'adminName', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Admin Contact</label>
                  <input
                    type="text"
                    value={selectedChannel.adminContact || ''}
                    onChange={(e) => updateChannel(selectedChannel.id, 'adminContact', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Access Status</label>
                  <select
                    value={selectedChannel.accessStatus}
                    onChange={(e) => updateChannel(selectedChannel.id, 'accessStatus', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    {ACCESS_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Post Permission</label>
                  <select
                    value={selectedChannel.postPermission ? 'Yes' : 'No'}
                    onChange={(e) => updateChannel(selectedChannel.id, 'postPermission', e.target.value === 'Yes')}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Current Stage</label>
                  <select
                    value={selectedChannel.currentStage}
                    onChange={(e) => updateChannel(selectedChannel.id, 'currentStage', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    {ORGANISATION_STAGES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Last Posted</label>
                  <input
                    type="date"
                    value={selectedChannel.lastPosted || ''}
                    onChange={(e) => updateChannel(selectedChannel.id, 'lastPosted', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Last Post Outcome</label>
                  <select
                    value={selectedChannel.lastPostOutcome || ''}
                    onChange={(e) => updateChannel(selectedChannel.id, 'lastPostOutcome', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    <option value="">Select...</option>
                    {POST_OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Notes</label>
                <textarea
                  value={selectedChannel.notes || ''}
                  onChange={(e) => updateChannel(selectedChannel.id, 'notes', e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple resize-none"
                />
              </div>

              {/* Tags */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Tags</label>
                <div className="flex flex-wrap gap-1">
                  {(selectedChannel.tags || []).map((tag, i) => (
                    <span key={i} className="text-xs px-2 py-0.5 bg-gray-100 rounded-full text-gray-600">{tag}</span>
                  ))}
                </div>
              </div>

              {/* Outreach Log */}
              <div className="border-t border-gray-100 pt-4">
                <OutreachLogEntry
                  log={selectedChannel.outreachLog || []}
                  onSave={(log) => updateChannel(selectedChannel.id, 'outreachLog', log)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
