import { useState } from 'react';
import { X, Plus } from 'lucide-react';
import { sanitizeText, MAX_LENGTHS } from '../../lib/validation';

const CHANNELS = ['Email', 'LinkedIn', 'Phone', 'WhatsApp', 'In-person', 'Other'];
const OUTCOMES = [
  'No response',
  'Bounced',
  'Responded positive',
  'Responded neutral',
  'Declined',
  'Session booked',
  'Leads received',
];

export default function OutreachLogEntry({ log = [], onSave }) {
  const [showForm, setShowForm] = useState(false);
  const [entry, setEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    channel: 'Email',
    contactPerson: '',
    templateUsed: '',
    subjectLine: '',
    messageSummary: '',
    outcome: '',
    followUpDate: '',
    notes: '',
  });

  function handleSubmit(e) {
    e.preventDefault();
    // Sanitize free-text fields (trim + length cap + control-char strip) before
    // the entry is persisted. Date/channel/outcome are constrained inputs.
    const newEntry = {
      ...entry,
      contactPerson: sanitizeText(entry.contactPerson, { maxLength: MAX_LENGTHS.NAME }),
      templateUsed: sanitizeText(entry.templateUsed, { maxLength: MAX_LENGTHS.SHORT_TEXT }),
      subjectLine: sanitizeText(entry.subjectLine, { maxLength: MAX_LENGTHS.SHORT_TEXT }),
      messageSummary: sanitizeText(entry.messageSummary, { maxLength: MAX_LENGTHS.LONG_TEXT, allowNewlines: true }),
      notes: sanitizeText(entry.notes, { maxLength: MAX_LENGTHS.LONG_TEXT, allowNewlines: true }),
      id: `log-${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    onSave([newEntry, ...log]);
    setShowForm(false);
    setEntry({
      date: new Date().toISOString().split('T')[0],
      channel: 'Email',
      contactPerson: '',
      templateUsed: '',
      subjectLine: '',
      messageSummary: '',
      outcome: '',
      followUpDate: '',
      notes: '',
    });
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-medium text-gray-700">Outreach Log ({log.length})</h4>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs font-medium text-propela-purple hover:text-propela-purple/80"
        >
          <Plus size={14} />
          Add Entry
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-gray-50 rounded-lg p-4 mb-4 border border-gray-200">
          <div className="flex items-center justify-between mb-3">
            <h5 className="text-xs font-semibold text-gray-600 uppercase">New Outreach Entry</h5>
            <button type="button" onClick={() => setShowForm(false)}>
              <X size={14} className="text-gray-400 hover:text-gray-600" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Date</label>
              <input
                type="date"
                value={entry.date}
                onChange={(e) => setEntry({ ...entry, date: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                required
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Channel</label>
              <select
                value={entry.channel}
                onChange={(e) => setEntry({ ...entry, channel: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
              >
                {CHANNELS.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Contact Person</label>
              <input
                type="text"
                value={entry.contactPerson}
                onChange={(e) => setEntry({ ...entry, contactPerson: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Template Used</label>
              <input
                type="text"
                value={entry.templateUsed}
                onChange={(e) => setEntry({ ...entry, templateUsed: e.target.value })}
                placeholder="Link to template..."
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
              />
            </div>
            {entry.channel === 'Email' && (
              <div className="col-span-2">
                <label className="text-xs text-gray-500 block mb-1">Subject Line</label>
                <input
                  type="text"
                  value={entry.subjectLine}
                  onChange={(e) => setEntry({ ...entry, subjectLine: e.target.value })}
                  className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
                />
              </div>
            )}
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Message Summary</label>
              <textarea
                value={entry.messageSummary}
                onChange={(e) => setEntry({ ...entry, messageSummary: e.target.value })}
                rows={2}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple resize-none"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Outcome</label>
              <select
                value={entry.outcome}
                onChange={(e) => setEntry({ ...entry, outcome: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
              >
                <option value="">Select outcome...</option>
                {OUTCOMES.map((o) => <option key={o} value={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Follow-up Date</label>
              <input
                type="date"
                value={entry.followUpDate}
                onChange={(e) => setEntry({ ...entry, followUpDate: e.target.value })}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-gray-500 block mb-1">Notes</label>
              <textarea
                value={entry.notes}
                onChange={(e) => setEntry({ ...entry, notes: e.target.value })}
                rows={2}
                className="w-full text-sm border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-propela-purple resize-none"
              />
            </div>
          </div>
          <div className="flex justify-end mt-3">
            <button
              type="submit"
              className="px-3 py-1.5 bg-propela-purple text-white text-xs font-medium rounded-lg hover:bg-propela-purple/90"
            >
              Save Entry
            </button>
          </div>
        </form>
      )}

      {/* Log entries */}
      {log.length > 0 ? (
        <div className="space-y-2 max-h-60 overflow-y-auto">
          {log.map((item, idx) => (
            <div key={item.id || idx} className="bg-white border border-gray-100 rounded-lg px-3 py-2 text-xs">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-700">{item.date}</span>
                  <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-600">{item.channel}</span>
                  {item.outcome && (
                    <span className={`px-1.5 py-0.5 rounded ${
                      item.outcome.includes('positive') || item.outcome.includes('booked') || item.outcome.includes('received')
                        ? 'bg-green-100 text-green-700'
                        : item.outcome.includes('Declined') || item.outcome.includes('Bounced')
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                    }`}>
                      {item.outcome}
                    </span>
                  )}
                </div>
                {item.contactPerson && <span className="text-gray-500">{item.contactPerson}</span>}
              </div>
              {item.messageSummary && <p className="text-gray-600 mt-1">{item.messageSummary}</p>}
              {item.followUpDate && <p className="text-propela-purple mt-1">Follow-up: {item.followUpDate}</p>}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center py-3">No outreach logged yet.</p>
      )}
    </div>
  );
}
