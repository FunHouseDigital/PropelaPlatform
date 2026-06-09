import { useState } from 'react'
import { MessageCircle, Plus } from 'lucide-react'

const CHANNEL_OPTIONS = ['Email', 'LinkedIn', 'Phone', 'WhatsApp', 'In-person', 'Other']

export default function CommunicationLog({ log = [], onAddEntry }) {
  const [showForm, setShowForm] = useState(false)
  const [newEntry, setNewEntry] = useState({
    date: new Date().toISOString().split('T')[0],
    channel: 'Email',
    summary: '',
    nextAction: '',
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!newEntry.summary.trim()) return

    onAddEntry({
      ...newEntry,
      id: `log-${Date.now()}`,
    })

    setNewEntry({
      date: new Date().toISOString().split('T')[0],
      channel: 'Email',
      summary: '',
      nextAction: '',
    })
    setShowForm(false)
  }

  const formatDate = (date) => {
    if (!date) return '-'
    return new Date(date).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="bg-white border border-border rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-dark flex items-center gap-2">
          <MessageCircle className="w-4 h-4 text-purple" />
          Communication Log
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs font-medium text-purple hover:text-purple-dark"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Entry
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 bg-purple-light/50 rounded-lg p-3 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-medium text-grey mb-0.5">Date</label>
              <input
                type="date"
                value={newEntry.date}
                onChange={(e) => setNewEntry({ ...newEntry, date: e.target.value })}
                className="w-full text-xs border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple"
              />
            </div>
            <div>
              <label className="block text-[10px] font-medium text-grey mb-0.5">Channel</label>
              <select
                value={newEntry.channel}
                onChange={(e) => setNewEntry({ ...newEntry, channel: e.target.value })}
                className="w-full text-xs border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple"
              >
                {CHANNEL_OPTIONS.map(ch => (
                  <option key={ch} value={ch}>{ch}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-[10px] font-medium text-grey mb-0.5">Summary</label>
            <textarea
              value={newEntry.summary}
              onChange={(e) => setNewEntry({ ...newEntry, summary: e.target.value })}
              placeholder="What happened in this interaction..."
              rows={2}
              className="w-full text-xs border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple resize-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="text-xs text-grey hover:text-dark px-2 py-1"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="text-xs bg-purple text-white rounded-md px-3 py-1.5 hover:bg-purple-dark"
            >
              Save
            </button>
          </div>
        </form>
      )}

      <div className="space-y-3 max-h-64 overflow-y-auto">
        {log.length === 0 ? (
          <p className="text-xs text-grey text-center py-4">No communication entries yet</p>
        ) : (
          log.map((entry, i) => (
            <div key={entry.id || i} className="border-l-2 border-purple-light pl-3 py-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-medium text-grey">{formatDate(entry.date)}</span>
                <span className="text-[10px] bg-gray-100 rounded-full px-1.5 py-0.5 text-grey">{entry.channel}</span>
              </div>
              <p className="text-xs text-dark mt-0.5">{entry.summary}</p>
              {entry.nextAction && (
                <p className="text-[10px] text-purple mt-0.5">Next: {entry.nextAction}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
