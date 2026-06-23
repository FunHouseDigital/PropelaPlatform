import { useState, useMemo, useCallback } from 'react';
import {
  Users,
  Search,
  LayoutGrid,
  Columns3,
  Table2,
  Filter,
  ChevronDown,
} from 'lucide-react';
import { getNurses, saveNurses } from '../lib/storage';
import { calculateReadinessStatus } from '../lib/calculations';
import { useDebouncedValue } from '../hooks/useDebounce';
import GalleryView from '../components/nurses/GalleryView';
import PipelineView from '../components/nurses/PipelineView';
import CohortView from '../components/nurses/CohortView';
import NurseCard from '../components/nurses/NurseCard';
import FilterPanel from '../components/nurses/FilterPanel';

const VIEW_TABS = [
  { id: 'gallery', label: 'Gallery', icon: LayoutGrid },
  { id: 'pipeline', label: 'Pipeline', icon: Columns3 },
  { id: 'cohort', label: 'Cohort', icon: Table2 },
];

const GROUP_BY_OPTIONS = [
  { value: 'primaryClinicalSpecialty', label: 'Specialty' },
  { value: 'pipelineStage', label: 'Pipeline Stage' },
  { value: 'cohort', label: 'Cohort' },
  { value: 'readinessStatus', label: 'Readiness Status' },
];

const SORT_OPTIONS = [
  { value: 'fullName-asc', label: 'Name (A-Z)' },
  { value: 'fullName-desc', label: 'Name (Z-A)' },
  { value: 'cvScore-desc', label: 'CV Score (High-Low)' },
  { value: 'cvScore-asc', label: 'CV Score (Low-High)' },
  { value: 'submittedAt-desc', label: 'Newest First' },
  { value: 'submittedAt-asc', label: 'Oldest First' },
];

export default function NurseDatabase() {
  const [allNurses, setAllNurses] = useState(() => getNurses());
  const [activeView, setActiveView] = useState('gallery');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('primaryClinicalSpecialty');
  const [sortOrder, setSortOrder] = useState('fullName-asc');
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [selectedNurse, setSelectedNurse] = useState(null);
  const [selectedCohort, setSelectedCohort] = useState('Cohort 1');

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);

  // Get unique cohort names
  const cohorts = useMemo(() => {
    const set = new Set();
    allNurses.forEach((n) => {
      if (n.cohortAssigned) set.add(n.cohortAssigned);
    });
    return Array.from(set).sort();
  }, [allNurses]);

  // Filter + search + sort
  const filteredNurses = useMemo(() => {
    let result = [...allNurses];

    // Search
    if (debouncedSearchQuery.trim()) {
      const q = debouncedSearchQuery.toLowerCase().trim();
      result = result.filter(
        (n) =>
          n.fullName.toLowerCase().includes(q) ||
          (n.email && n.email.toLowerCase().includes(q)) ||
          (n.sancNumber && n.sancNumber.toLowerCase().includes(q))
      );
    }

    // Filters
    Object.entries(filters).forEach(([key, values]) => {
      if (!values || values.length === 0) return;

      if (key === 'cohort') {
        result = result.filter((n) => {
          if (values.includes('Unassigned') && !n.cohortAssigned) return true;
          return values.includes(n.cohortAssigned);
        });
      } else if (key === 'hasFlags') {
        result = result.filter((n) => {
          if (values.includes('Yes') && n.flags > 0) return true;
          if (values.includes('No') && (!n.flags || n.flags === 0)) return true;
          return false;
        });
      } else if (key === 'pipelineStage') {
        result = result.filter((n) => values.includes(n.pipelineStage));
      } else if (key === 'primaryClinicalSpecialty') {
        result = result.filter((n) => values.includes(n.primaryClinicalSpecialty));
      } else if (key === 'readinessStatus') {
        result = result.filter((n) => values.includes(n.readinessStatus));
      } else if (key === 'nextAction') {
        result = result.filter((n) => values.includes(n.nextAction));
      } else if (key === 'efSetLevel') {
        result = result.filter((n) => values.includes(n.efSetLevel));
      } else if (key === 'oetStatus') {
        result = result.filter((n) => values.includes(n.oetStatus));
      } else if (key === 'province') {
        result = result.filter((n) => values.includes(n.province));
      }
    });

    // Sort
    const [sortField, sortDir] = sortOrder.split('-');
    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === 'string') aVal = aVal.toLowerCase();
      if (typeof bVal === 'string') bVal = bVal.toLowerCase();
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [allNurses, debouncedSearchQuery, filters, sortOrder]);

  const handleUpdateNurse = useCallback(
    (updatedNurse) => {
      const newNurses = allNurses.map((n) =>
        n.id === updatedNurse.id ? updatedNurse : n
      );
      setAllNurses(newNurses);
      saveNurses(newNurses);
      if (selectedNurse && selectedNurse.id === updatedNurse.id) {
        setSelectedNurse(updatedNurse);
      }
    },
    [allNurses, selectedNurse]
  );

  const handleNurseClick = useCallback((nurse) => {
    setSelectedNurse(nurse);
  }, []);

  const activeFilterCount = Object.values(filters).reduce(
    (sum, arr) => sum + (arr?.length || 0),
    0
  );

  return (
    <div>
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-1">
        <Users size={24} className="text-propela-purple" />
        <h1 className="text-2xl font-semibold text-gray-900">Nurse Database</h1>
        <span className="text-sm text-gray-400 ml-2">{allNurses.length} nurses</span>
      </div>
      <p className="text-gray-500 text-sm mb-5">
        Master record for every nurse Propela has ever engaged.
      </p>

      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, email, SANC..."
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-propela-purple focus:border-propela-purple bg-white"
          />
        </div>

        {/* View Tabs */}
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          {VIEW_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveView(id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                activeView === id
                  ? 'bg-white text-propela-purple font-medium shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Group By (Gallery only) */}
        {activeView === 'gallery' && (
          <div className="relative">
            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value)}
              className="text-sm border border-gray-200 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-propela-purple appearance-none bg-white"
            >
              {GROUP_BY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  Group: {label}
                </option>
              ))}
            </select>
            <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </div>
        )}

        {/* Sort */}
        <div className="relative">
          <select
            value={sortOrder}
            onChange={(e) => setSortOrder(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-1 focus:ring-propela-purple appearance-none bg-white"
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>

        {/* Filter Button */}
        <button
          onClick={() => setShowFilters(true)}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm border rounded-lg transition-colors ${
            activeFilterCount > 0
              ? 'border-propela-purple text-propela-purple bg-propela-purple-light'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <Filter size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className="bg-propela-purple text-white text-xs w-5 h-5 rounded-full flex items-center justify-center">
              {activeFilterCount}
            </span>
          )}
        </button>
      </div>

      {/* Views */}
      {activeView === 'gallery' && (
        <GalleryView
          nurses={filteredNurses}
          groupBy={groupBy}
          onNurseClick={handleNurseClick}
        />
      )}

      {activeView === 'pipeline' && (
        <PipelineView
          nurses={filteredNurses}
          onNurseClick={handleNurseClick}
          onUpdateNurse={handleUpdateNurse}
        />
      )}

      {activeView === 'cohort' && (
        <CohortView
          nurses={filteredNurses}
          selectedCohort={selectedCohort}
          onCohortChange={setSelectedCohort}
          onNurseClick={handleNurseClick}
          cohorts={cohorts}
        />
      )}

      {/* Nurse Card Modal */}
      {selectedNurse && (
        <NurseCard
          nurse={selectedNurse}
          onClose={() => setSelectedNurse(null)}
          onUpdate={handleUpdateNurse}
        />
      )}

      {/* Filter Panel */}
      {showFilters && (
        <FilterPanel
          filters={filters}
          onFilterChange={setFilters}
          onClose={() => setShowFilters(false)}
        />
      )}
    </div>
  );
}
