/**
 * Fuzzy match - case-insensitive substring matching.
 * Returns true if query is found within text.
 */
export function fuzzyMatch(query, text) {
  if (!query || !text) return false;
  return text.toLowerCase().includes(query.toLowerCase());
}

/**
 * Search across all entities and return categorized results sorted by relevance.
 * Returns an array of { type, id, name, secondary, path } objects.
 */
export function searchAllEntities(query, { nurses = [], placements = [], documents = [], cohorts = [] }) {
  if (!query || query.trim() === '') return [];

  const results = [];
  const q = query.toLowerCase().trim();

  // Search nurses
  nurses.forEach((nurse) => {
    const name = nurse.name || `${nurse.firstName || ''} ${nurse.lastName || ''}`.trim();
    const searchFields = [name, nurse.specialty || '', nurse.stage || '', nurse.email || '', nurse.phone || ''];
    if (searchFields.some((field) => field.toLowerCase().includes(q))) {
      results.push({
        type: 'Nurse',
        id: nurse.id,
        name: name,
        secondary: [nurse.specialty, nurse.stage].filter(Boolean).join(' - '),
        path: '/nurses',
        score: name.toLowerCase().startsWith(q) ? 2 : 1,
      });
    }
  });

  // Search placements
  placements.forEach((placement) => {
    const nurseName = placement.nurseName || placement.nurse || '';
    const facilityName = placement.facilityName || placement.facility || '';
    const searchFields = [nurseName, facilityName, placement.status || '', placement.role || ''];
    if (searchFields.some((field) => field.toLowerCase().includes(q))) {
      results.push({
        type: 'Placement',
        id: placement.id,
        name: `${nurseName} at ${facilityName}`,
        secondary: [placement.role, placement.status].filter(Boolean).join(' - '),
        path: '/placements',
        score: nurseName.toLowerCase().startsWith(q) || facilityName.toLowerCase().startsWith(q) ? 2 : 1,
      });
    }
  });

  // Search documents
  // NOTE: Known limitation - Document results link to the /documents list page
  // rather than an individual document detail page, because no detail routes
  // exist for documents yet. Update path to `/documents/${doc.id}` when detail
  // routes are added.
  documents.forEach((doc) => {
    const name = doc.name || doc.title || '';
    const searchFields = [name, doc.type || '', doc.category || '', doc.nurseName || '', doc.status || ''];
    if (searchFields.some((field) => field.toLowerCase().includes(q))) {
      results.push({
        type: 'Document',
        id: doc.id,
        name: name,
        secondary: [doc.type || doc.category, doc.status].filter(Boolean).join(' - '),
        path: '/documents',
        score: name.toLowerCase().startsWith(q) ? 2 : 1,
      });
    }
  });

  // Search cohorts
  // NOTE: Known limitation - Cohort results link to the /cohorts list page
  // rather than an individual cohort detail page, because no detail routes
  // exist for cohorts yet. Update path to `/cohorts/${cohort.id}` when detail
  // routes are added.
  cohorts.forEach((cohort) => {
    const name = cohort.name || '';
    const searchFields = [name, cohort.status || '', cohort.description || ''];
    if (searchFields.some((field) => field.toLowerCase().includes(q))) {
      results.push({
        type: 'Cohort',
        id: cohort.id,
        name: name,
        secondary: [cohort.status, cohort.memberCount ? `${cohort.memberCount} members` : ''].filter(Boolean).join(' - '),
        path: '/cohorts',
        score: name.toLowerCase().startsWith(q) ? 2 : 1,
      });
    }
  });

  // Sort by score (higher first), then alphabetically
  results.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));

  return results;
}

/**
 * Get predefined filter presets for a given module.
 */
export function getFilterPresets(module) {
  const presets = {
    nurses: [
      { id: 'awaiting-docs', name: 'Awaiting Documents', filter: { field: 'stage', value: 'Documents' } },
      { id: 'active-nurses', name: 'Active Nurses', filter: { field: 'stage', value: 'Active' } },
      { id: 'in-pipeline', name: 'In Pipeline', filter: { field: 'stage', value: 'Pipeline' } },
      { id: 'new-applicants', name: 'New Applicants', filter: { field: 'stage', value: 'Application' } },
    ],
    placements: [
      { id: 'active-placements', name: 'Active Placements', filter: { field: 'status', value: 'Active' } },
      { id: 'pending-placements', name: 'Pending Start', filter: { field: 'status', value: 'Pending' } },
      { id: 'expiring-soon', name: 'Expiring Soon', filter: { field: 'status', value: 'Expiring' } },
      { id: 'completed', name: 'Completed', filter: { field: 'status', value: 'Completed' } },
    ],
    documents: [
      { id: 'pending-verification', name: 'Pending Verification', filter: { field: 'status', value: 'Pending' } },
      { id: 'expired-docs', name: 'Expired Documents', filter: { field: 'status', value: 'Expired' } },
      { id: 'approved-docs', name: 'Approved', filter: { field: 'status', value: 'Approved' } },
      { id: 'rejected-docs', name: 'Rejected', filter: { field: 'status', value: 'Rejected' } },
    ],
    cohorts: [
      { id: 'active-cohorts', name: 'Active Cohorts', filter: { field: 'status', value: 'Active' } },
      { id: 'upcoming-cohorts', name: 'Upcoming', filter: { field: 'status', value: 'Upcoming' } },
      { id: 'completed-cohorts', name: 'Completed', filter: { field: 'status', value: 'Completed' } },
    ],
  };

  return presets[module] || [];
}

/**
 * Get contextual action suggestions based on current page path.
 */
export function getContextualActions(pathname) {
  const actions = {
    '/': [
      { label: 'View Analytics', path: '/analytics' },
      { label: 'Check Notifications', path: '/communications' },
      { label: 'View Reports', path: '/reports' },
    ],
    '/nurses': [
      { label: 'Add New Nurse', action: 'add_nurse' },
      { label: 'Export Nurse List', action: 'export_nurses' },
      { label: 'View Pipeline', path: '/acquisition' },
    ],
    '/placements': [
      { label: 'Create Placement', action: 'add_placement' },
      { label: 'View Expiring Placements', action: 'filter_expiring' },
      { label: 'Export Placements', action: 'export_placements' },
    ],
    '/documents': [
      { label: 'Upload Document', action: 'upload_document' },
      { label: 'Review Verification Queue', action: 'view_queue' },
      { label: 'Check Expired Documents', action: 'filter_expired' },
    ],
    '/cohorts': [
      { label: 'Create Cohort', action: 'add_cohort' },
      { label: 'View Active Cohorts', action: 'filter_active' },
    ],
    '/analytics': [
      { label: 'Export Report', action: 'export_report' },
      { label: 'Schedule Report', path: '/reports' },
    ],
    '/communications': [
      { label: 'Send Message', action: 'send_message' },
      { label: 'Create Alert Rule', action: 'create_alert' },
    ],
    '/settings': [
      { label: 'View Integrations', path: '/integrations' },
      { label: 'Manage API Keys', path: '/integrations' },
    ],
  };

  return actions[pathname] || [];
}
