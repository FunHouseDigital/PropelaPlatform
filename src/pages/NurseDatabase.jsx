import { useState, useMemo } from 'react'
import { Users, LayoutGrid, Kanban, Table } from 'lucide-react'
import { useNurses } from '../hooks/useNurses.js'
import SearchBar from '../components/shared/SearchBar.jsx'
import FilterPanel from '../components/shared/FilterPanel.jsx'
import GalleryView from '../components/nurses/GalleryView.jsx'
import PipelineView from '../components/nurses/PipelineView.jsx'
import CohortView from '../components/nurses/CohortView.jsx'

const VIEWS = [
  { id: 'gallery', label: 'Gallery', icon: LayoutGrid },
  { id: 'pipeline', label: 'Pipeline', icon: Kanban },
  { id: 'cohort', label: 'Cohort', icon: Table },
]

export default function NurseDatabase() {
  const [currentView, setCurrentView] = useState('gallery')
  const [sortBy, setSortBy] = useState('name')
  const [groupBy, setGroupBy] = useState(null)
  const [filters, setFilters] = useState({
    searchQuery: '',
    cohort: '',
    stage: [],
    specialty: [],
    readinessStatus: '',
    nextAction: '',
    flagPresent: '',
    efSetLevel: '',
    oetStatus: '',
    province: '',
  })

  const { nurses, groupedNurses, updateNurse, allNurses } = useNurses(filters, sortBy, groupBy)

  const handleSearch = (query) => {
    setFilters(prev => ({ ...prev, searchQuery: query }))
  }

  return (
    <div className="p-6">
      {/* Top Bar */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-purple" />
          <h1 className="text-xl font-semibold text-dark">Nurse Database</h1>
          <span className="text-sm text-grey bg-gray-100 rounded-full px-2.5 py-0.5">
            {allNurses.length} nurses
          </span>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
          {VIEWS.map(view => {
            const Icon = view.icon
            return (
              <button
                key={view.id}
                onClick={() => setCurrentView(view.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  currentView === view.id
                    ? 'bg-white text-purple shadow-sm'
                    : 'text-grey hover:text-dark'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {view.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Controls Bar */}
      <div className="flex items-start gap-3 mb-5">
        <div className="flex-1 max-w-xs">
          <SearchBar value={filters.searchQuery} onChange={handleSearch} />
        </div>

        {currentView === 'gallery' && (
          <div className="flex items-center gap-2">
            <select
              value={groupBy || ''}
              onChange={(e) => setGroupBy(e.target.value || null)}
              className="text-xs border border-border rounded-md px-2 py-2 focus:outline-none focus:ring-1 focus:ring-purple"
            >
              <option value="">No Grouping</option>
              <option value="specialty">Specialty</option>
              <option value="stage">Pipeline Stage</option>
              <option value="cohort">Cohort</option>
              <option value="readinessStatus">Readiness Status</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs border border-border rounded-md px-2 py-2 focus:outline-none focus:ring-1 focus:ring-purple"
            >
              <option value="name">Sort: Name</option>
              <option value="cvScore">Sort: CV Score</option>
              <option value="yearsExperience">Sort: Experience</option>
              <option value="lastContacted">Sort: Last Contacted</option>
              <option value="submittedAt">Sort: Submitted</option>
            </select>
          </div>
        )}

        <div className="flex-1">
          <FilterPanel filters={filters} onFilterChange={setFilters} />
        </div>
      </div>

      {/* Nurse count for filtered results */}
      {nurses.length !== allNurses.length && (
        <p className="text-xs text-grey mb-3">
          Showing {nurses.length} of {allNurses.length} nurses
        </p>
      )}

      {/* Active View */}
      {currentView === 'gallery' && (
        <GalleryView
          nurses={nurses}
          groupedNurses={groupedNurses}
          groupBy={groupBy}
          onGroupByChange={setGroupBy}
          sortBy={sortBy}
          onSortByChange={setSortBy}
        />
      )}

      {currentView === 'pipeline' && (
        <PipelineView nurses={nurses} onUpdateNurse={updateNurse} />
      )}

      {currentView === 'cohort' && (
        <CohortView nurses={nurses} onFilterChange={setFilters} filters={filters} />
      )}
    </div>
  )
}
