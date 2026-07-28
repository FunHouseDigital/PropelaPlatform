import {
  AlertTriangle,
  ChevronDown,
  Columns3,
  Filter,
  LayoutGrid,
  LoaderCircle,
  Plus,
  RefreshCw,
  Search,
  Table2,
  Users,
} from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import CohortView from '../components/nurses/CohortView';
import FilterPanel from '../components/nurses/FilterPanel';
import GalleryView from '../components/nurses/GalleryView';
import NurseCard from '../components/nurses/NurseCard';
import NurseCreateModal from '../components/nurses/NurseCreateModal';
import PipelineView from '../components/nurses/PipelineView';
import EmptyState from '../components/ui/EmptyState';
import { useAppContext } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import { useDebouncedValue } from '../hooks/useDebounce';
import { getNurseUiPermissions } from '../lib/nurses/nursePermissions';

const RETRYABLE_LIST_ERROR_CODES = new Set(['NETWORK', 'UNKNOWN', 'STORAGE', 'LIST_CONSISTENCY']);

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

const ERROR_TITLES = {
  AUTH: 'Authentication required',
  FORBIDDEN: 'Permission denied',
  NETWORK: 'Network error',
  STORAGE: 'Storage error',
  VALIDATION: 'Data validation error',
  LIST_CONSISTENCY: 'Nurse list could not be verified',
  UNKNOWN: 'Could not load nurses',
};

function ListLoadingState() {
  return (
    <div role="status" aria-label="Loading nurses" className="space-y-3 py-4">
      <div className="flex items-center gap-2 text-sm text-gray-600">
        <LoaderCircle size={16} className="animate-spin text-propela-purple" />
        Loading nurses...
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {[0, 1, 2, 3].map((item) => (
          <div
            key={item}
            aria-hidden="true"
            className="h-40 animate-pulse rounded-xl border border-gray-100 bg-gray-100"
          />
        ))}
      </div>
    </div>
  );
}

function ListError({ error, stale, onRetry }) {
  const code = error?.code || 'UNKNOWN';
  const title = ERROR_TITLES[code] || ERROR_TITLES.UNKNOWN;
  const message = error?.message || 'The nurse list could not be loaded. Please try again.';

  return (
    <div
      role="alert"
      className="mb-4 flex flex-wrap items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-4"
    >
      <div className="flex min-w-0 gap-3">
        <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
        <div>
          <p className="text-sm font-semibold text-red-800">{title}</p>
          <p className="mt-0.5 text-sm text-red-700">{message}</p>
          {stale && (
            <p className="mt-1 text-xs font-medium text-amber-800">
              Showing the last loaded records. They may be out of date.
            </p>
          )}
        </div>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
        >
          <RefreshCw size={14} />
          Retry
        </button>
      )}
    </div>
  );
}

export default function NurseDatabase() {
  const {
    nurses,
    nurseSlice,
    refreshNurses,
    retryNurses,
    openNurse,
    openCreate,
    updateCreateDraft,
    closeCreate,
    createNurse,
    retryCreate,
    retryCreateAfterCollision,
    retryDetail,
    closeNurseDetail,
    updateNurseDraft,
    requestCancelNurseEdit,
    resolveNurseDiscard,
    saveNurse,
    retrySaveNurse,
    applyNurseConflictToLatest,
    requestDiscardNurseConflict,
    keepEditingNurseConflict,
    changeNursePipeline,
    retryNursePipeline,
    reloadNursePipeline,
    rebaseNursePipeline,
    requestDeleteNurse,
    cancelDeleteNurse,
    deleteNurse,
    retryDeleteNurse,
    reloadNurseAfterDeleteConflict,
  } = useAppContext();
  const auth = useAuth();
  const nursePermissions = getNurseUiPermissions(auth);
  const canCreateNurse = nursePermissions.canCreate;
  const canDeleteNurse = nursePermissions.canDelete;
  const [activeView, setActiveView] = useState('gallery');
  const [searchQuery, setSearchQuery] = useState('');
  const [groupBy, setGroupBy] = useState('primaryClinicalSpecialty');
  const [sortOrder, setSortOrder] = useState('fullName-asc');
  const [filters, setFilters] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [addNurseOpen, setAddNurseOpen] = useState(false);
  const [selectedCohort, setSelectedCohort] = useState('Cohort 1');

  const debouncedSearchQuery = useDebouncedValue(searchQuery, 300);
  const acceptedNurses = Array.isArray(nurseSlice?.items) ? nurseSlice.items : nurses;
  const reportedTotal = Number.isInteger(nurseSlice?.total)
    ? nurseSlice.total
    : acceptedNurses.length;
  const hasAcceptedList = Boolean(nurseSlice?.hasAcceptedList);
  const listState = nurseSlice?.listState || (hasAcceptedList ? 'success' : 'idle');
  const retryableListError = RETRYABLE_LIST_ERROR_CODES.has(nurseSlice?.listError?.code);
  const isInitialLoading = !hasAcceptedList && ['idle', 'loading'].includes(listState);
  const isRefreshing = hasAcceptedList && listState === 'loading';

  const cohorts = useMemo(() => {
    const set = new Set();
    acceptedNurses.forEach((nurse) => {
      if (nurse.cohortAssigned) set.add(nurse.cohortAssigned);
    });
    return Array.from(set).sort();
  }, [acceptedNurses]);

  const filteredNurses = useMemo(() => {
    let result = [...acceptedNurses];

    if (debouncedSearchQuery.trim()) {
      const query = debouncedSearchQuery.toLowerCase().trim();
      result = result.filter(
        (nurse) =>
          (nurse.fullName || '').toLowerCase().includes(query) ||
          (nurse.email || '').toLowerCase().includes(query) ||
          (nurse.sancNumber || '').toLowerCase().includes(query)
      );
    }

    Object.entries(filters).forEach(([key, values]) => {
      if (!values || values.length === 0) return;

      if (key === 'cohort') {
        result = result.filter((nurse) => {
          if (values.includes('Unassigned') && !nurse.cohortAssigned) return true;
          return values.includes(nurse.cohortAssigned);
        });
      } else if (key === 'hasFlags') {
        result = result.filter((nurse) => {
          if (values.includes('Yes') && nurse.flags > 0) return true;
          if (values.includes('No') && (!nurse.flags || nurse.flags === 0)) return true;
          return false;
        });
      } else {
        result = result.filter((nurse) => values.includes(nurse[key]));
      }
    });

    const [sortField, sortDir] = sortOrder.split('-');
    result.sort((left, right) => {
      let leftValue = left[sortField];
      let rightValue = right[sortField];
      if (typeof leftValue === 'string') leftValue = leftValue.toLowerCase();
      if (typeof rightValue === 'string') rightValue = rightValue.toLowerCase();
      if (leftValue < rightValue) return sortDir === 'asc' ? -1 : 1;
      if (leftValue > rightValue) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });

    return result;
  }, [acceptedNurses, debouncedSearchQuery, filters, sortOrder]);

  const handleNurseClick = useCallback(
    (nurse) => {
      setDetailOpen(true);
      Promise.resolve(openNurse(nurse.id)).catch(() => {
        // The controller normally categorizes detail failures. This guard avoids
        // an unhandled rejection if an unexpected integration error escapes it.
      });
    },
    [openNurse]
  );

  const handlePipelineChange = useCallback(
    (command) => changeNursePipeline(command),
    [changeNursePipeline]
  );

  const clearFilters = useCallback(() => {
    setSearchQuery('');
    setFilters({});
  }, []);

  const handleOpenCreate = useCallback(() => {
    openCreate();
    setAddNurseOpen(true);
  }, [openCreate]);

  const handleCloseCreate = useCallback(() => {
    if (closeCreate()) setAddNurseOpen(false);
  }, [closeCreate]);

  const handleCreateCommitted = useCallback(() => {
    setAddNurseOpen(false);
  }, []);

  const activeFilterCount = Object.values(filters).reduce(
    (sum, values) => sum + (values?.length || 0),
    0
  );
  const hasSearchOrFilters = Boolean(debouncedSearchQuery.trim()) || activeFilterCount > 0;
  const isGenuineEmpty = hasAcceptedList && reportedTotal === 0;
  const isFilterNoMatch =
    hasAcceptedList && reportedTotal > 0 && hasSearchOrFilters && filteredNurses.length === 0;

  const handleCloseDetail = useCallback(() => {
    closeNurseDetail();
    setDetailOpen(false);
  }, [closeNurseDetail]);

  const handleDeleteResolved = useCallback(() => {
    setDetailOpen(false);
  }, []);

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-3">
        <Users size={24} className="text-propela-purple" />
        <h1 className="text-2xl font-semibold text-gray-900">Nurse Database</h1>
        <span className="ml-2 text-sm text-gray-400">
          {reportedTotal} nurse{reportedTotal === 1 ? '' : 's'}
        </span>
        {canCreateNurse && (
          <button
            type="button"
            onClick={handleOpenCreate}
            aria-expanded={addNurseOpen}
            className="ml-auto inline-flex items-center gap-1.5 rounded-lg bg-propela-purple px-3 py-2 text-sm font-medium text-white hover:bg-propela-purple/90"
          >
            <Plus size={16} />
            Add Nurse
          </button>
        )}
      </div>
      <p className="mb-5 text-sm text-gray-500">
        Master record for every nurse Propela has ever engaged.
      </p>

      {nurseSlice?.notice && (
        <div
          role="status"
          className="mb-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm font-medium text-emerald-800"
        >
          {nurseSlice.notice.message}
        </div>
      )}

      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative min-w-[200px] max-w-sm flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search name, email, SANC..."
            aria-label="Search nurses"
            className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm focus:border-propela-purple focus:outline-none focus:ring-1 focus:ring-propela-purple"
          />
        </div>

        <div className="flex rounded-lg bg-gray-100 p-0.5">
          {VIEW_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveView(id)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm transition-colors ${
                activeView === id
                  ? 'bg-white font-medium text-propela-purple shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {activeView === 'gallery' && (
          <div className="relative">
            <select
              value={groupBy}
              onChange={(event) => setGroupBy(event.target.value)}
              aria-label="Group nurses"
              className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-propela-purple"
            >
              {GROUP_BY_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  Group: {label}
                </option>
              ))}
            </select>
            <ChevronDown
              size={14}
              className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
            />
          </div>
        )}

        <div className="relative">
          <select
            value={sortOrder}
            onChange={(event) => setSortOrder(event.target.value)}
            aria-label="Sort nurses"
            className="appearance-none rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm focus:outline-none focus:ring-1 focus:ring-propela-purple"
          >
            {SORT_OPTIONS.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <ChevronDown
            size={14}
            className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>

        <button
          type="button"
          onClick={() => setShowFilters(true)}
          className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm transition-colors ${
            activeFilterCount > 0
              ? 'border-propela-purple bg-propela-purple-light text-propela-purple'
              : 'border-gray-200 text-gray-600 hover:border-gray-300'
          }`}
        >
          <Filter size={14} />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-propela-purple text-xs text-white">
              {activeFilterCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={refreshNurses}
          disabled={listState === 'loading'}
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-2 text-sm text-gray-600 hover:border-gray-300 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={14} className={listState === 'loading' ? 'animate-spin' : ''} />
          {isRefreshing ? 'Refreshing' : 'Refresh'}
        </button>
      </div>

      {isRefreshing && (
        <div role="status" className="mb-3 flex items-center gap-2 text-sm text-gray-600">
          <LoaderCircle size={15} className="animate-spin text-propela-purple" />
          Refreshing nurses. Current records remain available.
        </div>
      )}

      {nurseSlice?.listError && (
        <ListError
          error={nurseSlice.listError}
          stale={Boolean(nurseSlice.staleWarning)}
          onRetry={retryableListError ? retryNurses : null}
        />
      )}

      {nurseSlice?.staleWarning && !nurseSlice.listError && (
        <div
          role="status"
          className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800"
        >
          <AlertTriangle size={16} />
          Showing the last loaded records. They may be out of date.
        </div>
      )}

      {isInitialLoading ? (
        <ListLoadingState />
      ) : isGenuineEmpty ? (
        <EmptyState
          icon={Users}
          title="No nurses yet"
          description="There are no nurses in the database yet."
          actionLabel={canCreateNurse ? 'Add Nurse' : undefined}
          onAction={canCreateNurse ? handleOpenCreate : undefined}
        />
      ) : isFilterNoMatch ? (
        <EmptyState
          icon={Search}
          title="No nurses match your search"
          description={`No visible nurses match the current search or filters. ${reportedTotal} nurse${
            reportedTotal === 1 ? '' : 's'
          } remain in the database.`}
          actionLabel="Clear filters"
          onAction={clearFilters}
        />
      ) : hasAcceptedList ? (
        <>
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
              onPipelineChange={handlePipelineChange}
              pipeline={nurseSlice?.pipeline}
              onRetryPipeline={retryNursePipeline}
              onReloadPipeline={reloadNursePipeline}
              onRebasePipeline={rebaseNursePipeline}
              permissions={nursePermissions}
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
        </>
      ) : null}

      <NurseCreateModal
        isOpen={addNurseOpen && nursePermissions.canCreate}
        nurseSlice={nurseSlice}
        onUpdateDraft={updateCreateDraft}
        onClose={handleCloseCreate}
        onSubmit={createNurse}
        onRetry={retryCreate}
        onRetryCollision={retryCreateAfterCollision}
        onCommitted={handleCreateCommitted}
      />

      {detailOpen && (
        <NurseCard
          nurseSlice={nurseSlice}
          onUpdateDraft={updateNurseDraft}
          onSave={saveNurse}
          onRetrySave={retrySaveNurse}
          onRequestCancel={requestCancelNurseEdit}
          onResolveDiscard={resolveNurseDiscard}
          onRetryDetail={retryDetail}
          onClose={handleCloseDetail}
          onApplyConflictToLatest={applyNurseConflictToLatest}
          onRequestDiscardConflict={requestDiscardNurseConflict}
          onKeepEditingAfterConflict={keepEditingNurseConflict}
          permissions={nursePermissions}
          canDelete={canDeleteNurse}
          onRequestDelete={requestDeleteNurse}
          onCancelDelete={cancelDeleteNurse}
          onConfirmDelete={deleteNurse}
          onRetryDelete={retryDeleteNurse}
          onReloadAfterDeleteConflict={reloadNurseAfterDeleteConflict}
          onDeleteResolved={handleDeleteResolved}
        />
      )}

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
