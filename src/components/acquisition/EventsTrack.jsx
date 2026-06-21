import { useState, useMemo } from 'react';
import { X, Plus, Calendar, MapPin } from 'lucide-react';
import { getEvents, saveEvents } from '../../lib/storage';
import OutreachLogEntry from './OutreachLogEntry';

const EVENT_TYPES = ['Career Fair', 'Info Session - Propela', 'Info Session - Hospital', 'Nursing Conference', 'Roadshow', 'Online Webinar', 'Other'];
const EVENT_STATUSES = ['Planned', 'Registered', 'Attended', 'Hosted', 'Completed', 'Missed'];

function getStatusColor(status) {
  switch (status) {
    case 'Completed': return 'bg-green-100 text-green-700';
    case 'Hosted':
    case 'Attended': return 'bg-blue-100 text-blue-700';
    case 'Registered':
    case 'Planned': return 'bg-amber-100 text-amber-700';
    case 'Missed': return 'bg-red-100 text-red-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function getTypeColor(type) {
  if (type.includes('Career')) return 'bg-purple-100 text-purple-700';
  if (type.includes('Info Session')) return 'bg-blue-100 text-blue-700';
  if (type.includes('Conference')) return 'bg-teal-100 text-teal-700';
  if (type.includes('Roadshow')) return 'bg-orange-100 text-orange-700';
  if (type.includes('Webinar')) return 'bg-sky-100 text-sky-700';
  return 'bg-gray-100 text-gray-600';
}

function formatDate(date) {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function EventsTrack({ searchQuery }) {
  const [events, setEvents] = useState(() => getEvents());
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: '',
    type: 'Career Fair',
    organiser: '',
    eventDate: '',
    location: '',
    status: 'Planned',
    budget: 0,
  });

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return events;
    const q = searchQuery.toLowerCase();
    return events.filter(
      (e) => e.name.toLowerCase().includes(q) || (e.type && e.type.toLowerCase().includes(q)) || (e.location && e.location.toLowerCase().includes(q))
    );
  }, [events, searchQuery]);

  function handleAdd(e) {
    e.preventDefault();
    const event = {
      ...newEvent,
      id: `evt-${Date.now()}`,
      nursesMet: 0,
      leadsGenerated: 0,
      nursesConverted: 0,
      followUpRequired: false,
      followUpDate: null,
      notes: '',
      tags: [],
      outreachLog: [],
      createdAt: new Date().toISOString().split('T')[0],
    };
    const updated = [event, ...events];
    setEvents(updated);
    saveEvents(updated);
    setShowAddForm(false);
    setNewEvent({ name: '', type: 'Career Fair', organiser: '', eventDate: '', location: '', status: 'Planned', budget: 0 });
  }

  function updateEvent(evtId, field, value) {
    const updated = events.map((e) =>
      e.id === evtId ? { ...e, [field]: value } : e
    );
    setEvents(updated);
    saveEvents(updated);
    if (selectedEvent && selectedEvent.id === evtId) {
      setSelectedEvent({ ...selectedEvent, [field]: value });
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs text-gray-400">{filtered.length} events</span>
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-1 px-3 py-1.5 bg-propela-purple text-white text-xs font-medium rounded-lg hover:bg-propela-purple/90"
        >
          <Plus size={14} />
          Add Event
        </button>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((evt) => (
          <div
            key={evt.id}
            onClick={() => setSelectedEvent(evt)}
            className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 cursor-pointer hover:shadow-md hover:border-propela-purple/20 transition-all"
          >
            <div className="flex items-start justify-between mb-2">
              <h4 className="font-semibold text-gray-900 text-sm truncate max-w-[200px]">{evt.name}</h4>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${getStatusColor(evt.status)}`}>
                {evt.status}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeColor(evt.type)}`}>
                {evt.type}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-1">
              <Calendar size={12} />
              <span>{formatDate(evt.eventDate)}</span>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
              <MapPin size={12} />
              <span className="truncate">{evt.location || 'TBD'}</span>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-gray-100">
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-900">{evt.nursesMet || 0}</p>
                <p className="text-xs text-gray-500">Met</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-blue-600">{evt.leadsGenerated || 0}</p>
                <p className="text-xs text-gray-500">Leads</p>
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold text-green-600">{evt.nursesConverted || 0}</p>
                <p className="text-xs text-gray-500">Converted</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-12 text-gray-400 text-sm">No events found.</div>
      )}

      {/* Add Form Modal */}
      {showAddForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/30" onClick={() => setShowAddForm(false)} />
          <div className="relative bg-white rounded-xl shadow-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Add Event</h3>
              <button onClick={() => setShowAddForm(false)}><X size={20} className="text-gray-400" /></button>
            </div>
            <form onSubmit={handleAdd} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Event Name</label>
                <input
                  type="text"
                  required
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Type</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
                  <select
                    value={newEvent.status}
                    onChange={(e) => setNewEvent({ ...newEvent, status: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    {EVENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Organiser</label>
                <input
                  type="text"
                  value={newEvent.organiser}
                  onChange={(e) => setNewEvent({ ...newEvent, organiser: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Event Date</label>
                  <input
                    type="date"
                    value={newEvent.eventDate}
                    onChange={(e) => setNewEvent({ ...newEvent, eventDate: e.target.value })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Budget (ZAR)</label>
                  <input
                    type="number"
                    value={newEvent.budget}
                    onChange={(e) => setNewEvent({ ...newEvent, budget: parseInt(e.target.value) || 0 })}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Location</label>
                <input
                  type="text"
                  value={newEvent.location}
                  onChange={(e) => setNewEvent({ ...newEvent, location: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  className="px-4 py-2 bg-propela-purple text-white text-sm font-medium rounded-lg hover:bg-propela-purple/90"
                >
                  Add Event
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Detail Slide-out */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 flex items-start justify-end">
          <div className="absolute inset-0 bg-black/30" onClick={() => setSelectedEvent(null)} />
          <div className="relative h-full w-full max-w-lg bg-white shadow-xl overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between z-10">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{selectedEvent.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getTypeColor(selectedEvent.type)}`}>
                    {selectedEvent.type}
                  </span>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getStatusColor(selectedEvent.status)}`}>
                    {selectedEvent.status}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedEvent(null)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{selectedEvent.nursesMet || 0}</p>
                  <p className="text-xs text-gray-500">Nurses Met</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{selectedEvent.leadsGenerated || 0}</p>
                  <p className="text-xs text-gray-500">Leads</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{selectedEvent.nursesConverted || 0}</p>
                  <p className="text-xs text-gray-500">Converted</p>
                </div>
              </div>

              {/* Fields */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Type</label>
                  <select
                    value={selectedEvent.type}
                    onChange={(e) => updateEvent(selectedEvent.id, 'type', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    {EVENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Status</label>
                  <select
                    value={selectedEvent.status}
                    onChange={(e) => updateEvent(selectedEvent.id, 'status', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    {EVENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Organiser</label>
                  <input
                    type="text"
                    value={selectedEvent.organiser || ''}
                    onChange={(e) => updateEvent(selectedEvent.id, 'organiser', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Event Date</label>
                  <input
                    type="date"
                    value={selectedEvent.eventDate || ''}
                    onChange={(e) => updateEvent(selectedEvent.id, 'eventDate', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-500 block mb-1">Location</label>
                  <input
                    type="text"
                    value={selectedEvent.location || ''}
                    onChange={(e) => updateEvent(selectedEvent.id, 'location', e.target.value)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Nurses Met</label>
                  <input
                    type="number"
                    value={selectedEvent.nursesMet || ''}
                    onChange={(e) => updateEvent(selectedEvent.id, 'nursesMet', parseInt(e.target.value) || 0)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Leads Generated</label>
                  <input
                    type="number"
                    value={selectedEvent.leadsGenerated || ''}
                    onChange={(e) => updateEvent(selectedEvent.id, 'leadsGenerated', parseInt(e.target.value) || 0)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Nurses Converted</label>
                  <input
                    type="number"
                    value={selectedEvent.nursesConverted || ''}
                    onChange={(e) => updateEvent(selectedEvent.id, 'nursesConverted', parseInt(e.target.value) || 0)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Budget (ZAR)</label>
                  <input
                    type="number"
                    value={selectedEvent.budget || ''}
                    onChange={(e) => updateEvent(selectedEvent.id, 'budget', parseInt(e.target.value) || 0)}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 block mb-1">Follow-up Required</label>
                  <select
                    value={selectedEvent.followUpRequired ? 'Yes' : 'No'}
                    onChange={(e) => updateEvent(selectedEvent.id, 'followUpRequired', e.target.value === 'Yes')}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                  >
                    <option value="Yes">Yes</option>
                    <option value="No">No</option>
                  </select>
                </div>
                {selectedEvent.followUpRequired && (
                  <div>
                    <label className="text-xs font-medium text-gray-500 block mb-1">Follow-up Date</label>
                    <input
                      type="date"
                      value={selectedEvent.followUpDate || ''}
                      onChange={(e) => updateEvent(selectedEvent.id, 'followUpDate', e.target.value)}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                    />
                  </div>
                )}
              </div>

              {/* Notes */}
              <div>
                <label className="text-xs font-medium text-gray-500 block mb-1">Notes</label>
                <textarea
                  value={selectedEvent.notes || ''}
                  onChange={(e) => updateEvent(selectedEvent.id, 'notes', e.target.value)}
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple resize-none"
                />
              </div>

              {/* Outreach Log */}
              <div className="border-t border-gray-100 pt-4">
                <OutreachLogEntry
                  log={selectedEvent.outreachLog || []}
                  onSave={(log) => updateEvent(selectedEvent.id, 'outreachLog', log)}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
