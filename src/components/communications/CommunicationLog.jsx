import { useState, useMemo, useCallback } from 'react';
import { Plus, Search, Phone, Mail, MessageCircle, MessageSquare, Filter, X } from 'lucide-react';
import { useAppContext } from '../../context/AppContext';

function generateId(prefix) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

const CHANNEL_ICONS = {
  Email: Mail,
  WhatsApp: MessageCircle,
  'Phone Call': Phone,
  SMS: MessageSquare,
};

const CHANNEL_COLORS = {
  Email: 'bg-blue-100 text-blue-700',
  WhatsApp: 'bg-green-100 text-green-700',
  'Phone Call': 'bg-orange-100 text-orange-700',
  SMS: 'bg-purple-100 text-purple-700',
};

export default function CommunicationLog() {
  const { communications, nurses, updateCommunications } = useAppContext();
  const [searchTerm, setSearchTerm] = useState('');
  const [channelFilter, setChannelFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newComm, setNewComm] = useState({
    nurseId: '',
    channel: 'Email',
    type: 'Follow-up',
    subject: '',
    notes: '',
    direction: 'outbound',
  });

  const [displayCount, setDisplayCount] = useState(50);

  const nurseMap = useMemo(() => {
    const map = {};
    nurses.forEach((n) => {
      map[n.id] = n.fullName;
    });
    return map;
  }, [nurses]);

  const filteredComms = useMemo(() => {
    let filtered = [...communications];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter((c) => {
        const nurseName = (nurseMap[c.nurseId] || '').toLowerCase();
        return (
          nurseName.includes(term) ||
          c.subject.toLowerCase().includes(term) ||
          c.notes.toLowerCase().includes(term)
        );
      });
    }

    if (channelFilter !== 'all') {
      filtered = filtered.filter((c) => c.channel === channelFilter);
    }

    if (dateFrom) {
      filtered = filtered.filter((c) => c.date >= dateFrom);
    }

    if (dateTo) {
      filtered = filtered.filter((c) => c.date <= dateTo + 'T23:59:59');
    }

    filtered.sort((a, b) => b.date.localeCompare(a.date));
    return filtered;
  }, [communications, searchTerm, channelFilter, dateFrom, dateTo, nurseMap]);

  function handleAddCommunication() {
    if (!newComm.nurseId || !newComm.subject) return;

    const comm = {
      id: generateId('comm'),
      ...newComm,
      date: new Date().toISOString().slice(0, 19),
      status: 'sent',
      linkedEvent: null,
    };

    updateCommunications([comm, ...communications]);
    setShowAddModal(false);
    setNewComm({
      nurseId: '',
      channel: 'Email',
      type: 'Follow-up',
      subject: '',
      notes: '',
      direction: 'outbound',
    });
  }

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by nurse, subject, or notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 focus:border-[#5B2D8E]"
          />
        </div>

        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
        >
          <option value="all">All Channels</option>
          <option value="Email">Email</option>
          <option value="WhatsApp">WhatsApp</option>
          <option value="Phone Call">Phone Call</option>
          <option value="SMS">SMS</option>
        </select>

        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
          placeholder="From"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
          placeholder="To"
        />

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#5B2D8E] text-white rounded-lg text-sm font-medium hover:bg-[#4a2573] transition-colors"
        >
          <Plus size={16} />
          Log Communication
        </button>
      </div>

      {/* Results count */}
      <p className="text-sm text-gray-500 mb-3">
        Showing {Math.min(displayCount, filteredComms.length)} of {filteredComms.length} communications
        {filteredComms.length !== communications.length && ` (${communications.length} total)`}
      </p>

      {/* Communications List */}
      <div className="space-y-2">
        {filteredComms.slice(0, displayCount).map((comm) => {
          const ChannelIcon = CHANNEL_ICONS[comm.channel] || MessageSquare;
          const channelColor = CHANNEL_COLORS[comm.channel] || 'bg-gray-100 text-gray-700';

          return (
            <div
              key={comm.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-sm transition-shadow"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-lg ${channelColor}`}>
                  <ChannelIcon size={16} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm text-gray-900 truncate">
                      {nurseMap[comm.nurseId] || comm.nurseId}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${channelColor}`}>
                      {comm.channel}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      {comm.direction === 'outbound' ? 'Sent' : 'Received'}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
                      {new Date(comm.date).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 font-medium">{comm.subject}</p>
                  <p className="text-sm text-gray-500 mt-1 line-clamp-1">{comm.notes}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredComms.length > displayCount && (
        <div className="text-center mt-4">
          <button
            onClick={() => setDisplayCount((prev) => prev + 50)}
            className="px-4 py-2 text-sm font-medium text-[#5B2D8E] border border-[#5B2D8E]/30 rounded-lg hover:bg-[#5B2D8E]/5 transition-colors"
          >
            Load More ({filteredComms.length - displayCount} remaining)
          </button>
        </div>
      )}

      {filteredComms.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <MessageSquare size={40} className="mx-auto mb-3 opacity-50" />
          <p>No communications found</p>
        </div>
      )}

      {/* Add Communication Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Log New Communication</h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg"
              >
                <X size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nurse</label>
                <select
                  value={newComm.nurseId}
                  onChange={(e) => setNewComm({ ...newComm, nurseId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
                >
                  <option value="">Select a nurse...</option>
                  {[...nurses].sort((a, b) => a.fullName.localeCompare(b.fullName)).map((n) => (
                    <option key={n.id} value={n.id}>
                      {n.fullName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Channel</label>
                  <select
                    value={newComm.channel}
                    onChange={(e) => setNewComm({ ...newComm, channel: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
                  >
                    <option value="Email">Email</option>
                    <option value="WhatsApp">WhatsApp</option>
                    <option value="Phone Call">Phone Call</option>
                    <option value="SMS">SMS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Direction</label>
                  <select
                    value={newComm.direction}
                    onChange={(e) => setNewComm({ ...newComm, direction: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
                  >
                    <option value="outbound">Outbound</option>
                    <option value="inbound">Inbound</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={newComm.type}
                  onChange={(e) => setNewComm({ ...newComm, type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
                >
                  <option value="Outreach">Outreach</option>
                  <option value="Follow-up">Follow-up</option>
                  <option value="Document Request">Document Request</option>
                  <option value="Status Update">Status Update</option>
                  <option value="Placement Update">Placement Update</option>
                  <option value="Training Reminder">Training Reminder</option>
                  <option value="Welcome Message">Welcome Message</option>
                  <option value="General Inquiry">General Inquiry</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
                <input
                  type="text"
                  value={newComm.subject}
                  onChange={(e) => setNewComm({ ...newComm, subject: e.target.value })}
                  placeholder="Enter subject..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={newComm.notes}
                  onChange={(e) => setNewComm({ ...newComm, notes: e.target.value })}
                  placeholder="Add notes about this communication..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#5B2D8E]/20 resize-none"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 p-4 border-t border-gray-200">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCommunication}
                disabled={!newComm.nurseId || !newComm.subject}
                className="px-4 py-2 text-sm font-medium text-white bg-[#5B2D8E] rounded-lg hover:bg-[#4a2573] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Log Communication
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
