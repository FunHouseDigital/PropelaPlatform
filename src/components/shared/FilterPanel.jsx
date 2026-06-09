import { useState } from 'react'
import { Filter, ChevronDown, ChevronUp } from 'lucide-react'
import {
  PIPELINE_STAGES,
  SPECIALTY_OPTIONS,
  READINESS_STATUSES,
  NEXT_ACTION_OPTIONS,
  EF_SET_LEVEL_OPTIONS,
  OET_STATUS_OPTIONS,
  PROVINCE_OPTIONS,
} from '../../data/constants.js'

export default function FilterPanel({ filters, onFilterChange }) {
  const [expanded, setExpanded] = useState(false)

  const handleChange = (key, value) => {
    onFilterChange({ ...filters, [key]: value })
  }

  const activeCount = Object.entries(filters).filter(([k, v]) => {
    if (k === 'searchQuery') return false
    if (Array.isArray(v)) return v.length > 0
    return !!v
  }).length

  return (
    <div className="bg-white border border-border rounded-lg">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 px-4 py-2.5 w-full text-left text-sm font-medium text-dark hover:bg-purple-light/50 rounded-lg transition-colors"
      >
        <Filter className="w-4 h-4 text-purple" />
        <span>Filters</span>
        {activeCount > 0 && (
          <span className="bg-purple text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {activeCount}
          </span>
        )}
        {expanded ? <ChevronUp className="w-4 h-4 ml-auto" /> : <ChevronDown className="w-4 h-4 ml-auto" />}
      </button>

      {expanded && (
        <div className="p-4 border-t border-border grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-grey mb-1">Pipeline Stage</label>
            <select
              value={filters.stage?.[0] || ''}
              onChange={(e) => handleChange('stage', e.target.value ? [e.target.value] : [])}
              className="w-full text-xs border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple"
            >
              <option value="">All Stages</option>
              {PIPELINE_STAGES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-grey mb-1">Specialty</label>
            <select
              value={filters.specialty?.[0] || ''}
              onChange={(e) => handleChange('specialty', e.target.value ? [e.target.value] : [])}
              className="w-full text-xs border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple"
            >
              <option value="">All Specialties</option>
              {SPECIALTY_OPTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-grey mb-1">Readiness Status</label>
            <select
              value={filters.readinessStatus || ''}
              onChange={(e) => handleChange('readinessStatus', e.target.value)}
              className="w-full text-xs border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple"
            >
              <option value="">All</option>
              {READINESS_STATUSES.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-grey mb-1">Next Action</label>
            <select
              value={filters.nextAction || ''}
              onChange={(e) => handleChange('nextAction', e.target.value)}
              className="w-full text-xs border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple"
            >
              <option value="">All Actions</option>
              {NEXT_ACTION_OPTIONS.map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-grey mb-1">Flags</label>
            <select
              value={filters.flagPresent || ''}
              onChange={(e) => handleChange('flagPresent', e.target.value)}
              className="w-full text-xs border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple"
            >
              <option value="">All</option>
              <option value="yes">Has Flags</option>
              <option value="no">No Flags</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-grey mb-1">EF SET Level</label>
            <select
              value={filters.efSetLevel || ''}
              onChange={(e) => handleChange('efSetLevel', e.target.value)}
              className="w-full text-xs border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple"
            >
              <option value="">All Levels</option>
              {EF_SET_LEVEL_OPTIONS.map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-grey mb-1">OET Status</label>
            <select
              value={filters.oetStatus || ''}
              onChange={(e) => handleChange('oetStatus', e.target.value)}
              className="w-full text-xs border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple"
            >
              <option value="">All</option>
              {OET_STATUS_OPTIONS.map(o => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-grey mb-1">Province</label>
            <select
              value={filters.province || ''}
              onChange={(e) => handleChange('province', e.target.value)}
              className="w-full text-xs border border-border rounded-md px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-purple"
            >
              <option value="">All Provinces</option>
              {PROVINCE_OPTIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          <div className="col-span-full">
            <button
              onClick={() => onFilterChange({
                searchQuery: filters.searchQuery,
                cohort: '',
                stage: [],
                specialty: [],
                readinessStatus: '',
                nextAction: '',
                flagPresent: '',
                efSetLevel: '',
                oetStatus: '',
                province: '',
              })}
              className="text-xs text-purple hover:text-purple-dark font-medium"
            >
              Clear all filters
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
