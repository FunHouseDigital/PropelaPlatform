/**
 * Seed data for Settings & Configuration module.
 */
export function seedSettings() {
  return {
    organization: {
      name: 'Propela Healthcare',
      logo: null,
      contactEmail: 'admin@propela.co.za',
      contactPhone: '+27 11 234 5678',
      address: '42 Rivonia Road, Sandton, Johannesburg, 2196',
      defaultCurrency: 'ZAR',
      fiscalYearStart: 'April',
      branding: {
        primaryColor: '#5B2D8E',
        theme: 'light',
      },
    },
    pipelineStages: [
      { id: 'stage-1', name: 'Application Received', order: 0, defaultDuration: 3, slaThreshold: 5, notificationsEnabled: true },
      { id: 'stage-2', name: 'Document Verification', order: 1, defaultDuration: 7, slaThreshold: 10, notificationsEnabled: true },
      { id: 'stage-3', name: 'OET Preparation', order: 2, defaultDuration: 60, slaThreshold: 90, notificationsEnabled: false },
      { id: 'stage-4', name: 'OET Exam', order: 3, defaultDuration: 14, slaThreshold: 21, notificationsEnabled: true },
      { id: 'stage-5', name: 'CBT Preparation', order: 4, defaultDuration: 45, slaThreshold: 60, notificationsEnabled: false },
      { id: 'stage-6', name: 'CBT Exam', order: 5, defaultDuration: 14, slaThreshold: 21, notificationsEnabled: true },
      { id: 'stage-7', name: 'NMC Registration', order: 6, defaultDuration: 30, slaThreshold: 45, notificationsEnabled: true },
      { id: 'stage-8', name: 'Visa Processing', order: 7, defaultDuration: 60, slaThreshold: 90, notificationsEnabled: true },
      { id: 'stage-9', name: 'Placement Matching', order: 8, defaultDuration: 21, slaThreshold: 30, notificationsEnabled: true },
      { id: 'stage-10', name: 'Onboarding', order: 9, defaultDuration: 14, slaThreshold: 21, notificationsEnabled: true },
    ],
    stageTransitionRules: {
      'stage-1': ['stage-2'],
      'stage-2': ['stage-3', 'stage-5'],
      'stage-3': ['stage-4'],
      'stage-4': ['stage-5', 'stage-3'],
      'stage-5': ['stage-6'],
      'stage-6': ['stage-7', 'stage-5'],
      'stage-7': ['stage-8'],
      'stage-8': ['stage-9'],
      'stage-9': ['stage-10'],
      'stage-10': [],
    },
    users: [
      { id: 'user-superadmin-vuyo', name: 'Vuyo Pakade', email: 'Vuyo@propela.co', role: 'Superadmin', status: 'Active', lastActive: '2024-12-18T09:30:00Z' },
      { id: 'user-superadmin-aya', name: 'Aya Yokwana', email: 'Aya@propela.co', role: 'Superadmin', status: 'Active', lastActive: '2024-12-18T09:15:00Z' },
      { id: 'user-1', name: 'Aya Nkosi', email: 'aya@propela.co.za', role: 'Admin', status: 'Active', lastActive: '2024-12-18T09:15:00Z' },
      { id: 'user-2', name: 'James Okafor', email: 'james@propela.co.za', role: 'Manager', status: 'Active', lastActive: '2024-12-17T16:42:00Z' },
      { id: 'user-3', name: 'Priya Sharma', email: 'priya@propela.co.za', role: 'Recruiter', status: 'Active', lastActive: '2024-12-18T08:30:00Z' },
      { id: 'user-4', name: 'David Mthembu', email: 'david@propela.co.za', role: 'Recruiter', status: 'Active', lastActive: '2024-12-16T14:20:00Z' },
      { id: 'user-5', name: 'Sarah Williams', email: 'sarah@propela.co.za', role: 'Read-only', status: 'Inactive', lastActive: '2024-11-28T10:05:00Z' },
    ],
    // Superadmin has access to every module. The permission layer (usePermissions)
    // also short-circuits to grant Superadmins access to any current or future module.
    rolePermissions: {
      Superadmin: { Dashboard: true, Nurses: true, Acquisition: true, Cohorts: true, Outreach: true, Placements: true, Analytics: true, Settings: true },
      Admin: { Dashboard: true, Nurses: true, Acquisition: true, Cohorts: true, Outreach: true, Placements: true, Analytics: true, Settings: true },
      Manager: { Dashboard: true, Nurses: true, Acquisition: true, Cohorts: true, Outreach: true, Placements: true, Analytics: true, Settings: false },
      Recruiter: { Dashboard: true, Nurses: true, Acquisition: true, Cohorts: true, Outreach: true, Placements: false, Analytics: false, Settings: false },
      'Read-only': { Dashboard: true, Nurses: true, Acquisition: false, Cohorts: false, Outreach: false, Placements: false, Analytics: true, Settings: false },
    },
    userActivityLog: [
      { id: 'log-1', timestamp: '2024-12-18T09:15:00Z', user: 'Aya Nkosi', action: 'Login', detail: 'Signed in from 192.168.1.10' },
      { id: 'log-2', timestamp: '2024-12-18T08:55:00Z', user: 'Priya Sharma', action: 'Nurse Created', detail: 'Added nurse Grace Adeyemi' },
      { id: 'log-3', timestamp: '2024-12-17T16:42:00Z', user: 'James Okafor', action: 'Stage Updated', detail: 'Moved Nurse #N-042 to OET Preparation' },
      { id: 'log-4', timestamp: '2024-12-17T14:20:00Z', user: 'David Mthembu', action: 'Document Upload', detail: 'Uploaded passport scan for Nurse #N-038' },
      { id: 'log-5', timestamp: '2024-12-17T11:30:00Z', user: 'Aya Nkosi', action: 'Settings Changed', detail: 'Updated pipeline SLA thresholds' },
      { id: 'log-6', timestamp: '2024-12-16T15:10:00Z', user: 'Priya Sharma', action: 'Cohort Created', detail: 'Created cohort Q1-2025-A' },
      { id: 'log-7', timestamp: '2024-12-16T14:20:00Z', user: 'David Mthembu', action: 'Login', detail: 'Signed in from 10.0.0.5' },
      { id: 'log-8', timestamp: '2024-12-16T10:45:00Z', user: 'James Okafor', action: 'Placement Assigned', detail: 'Assigned Nurse #N-029 to St Thomas Hospital' },
      { id: 'log-9', timestamp: '2024-12-15T09:00:00Z', user: 'Aya Nkosi', action: 'User Invited', detail: 'Sent invitation to sarah@propela.co.za' },
      { id: 'log-10', timestamp: '2024-12-15T08:30:00Z', user: 'Priya Sharma', action: 'Report Generated', detail: 'Exported Pipeline Summary report' },
      { id: 'log-11', timestamp: '2024-12-14T16:00:00Z', user: 'James Okafor', action: 'Integration Connected', detail: 'Connected NHS Jobs integration' },
    ],
    apiKeys: [
      { id: 'key-1', name: 'Production API Key', key: 'pk_live_xxxxxxxxxxxxxxxx', createdDate: '2024-09-15', status: 'Active' },
      { id: 'key-2', name: 'Staging API Key', key: 'pk_test_xxxxxxxxxxxxxxxx', createdDate: '2024-10-01', status: 'Active' },
      { id: 'key-3', name: 'Legacy Key (Deprecated)', key: 'pk_old_xxxxxxxxxxxxxxxxx', createdDate: '2024-03-20', status: 'Revoked' },
    ],
    webhooks: {
      url: 'https://hooks.example.com/propela',
      events: ['nurse.created', 'stage.changed', 'placement.assigned'],
      secret: 'whsec_xxxxxxxxxxxxx',
    },
    integrations: [
      { id: 'int-1', name: 'OET Portal', description: 'Sync OET exam results and preparation status', status: 'connected' },
      { id: 'int-2', name: 'NHS Jobs', description: 'Import job listings and placement opportunities', status: 'connected' },
      { id: 'int-3', name: 'LinkedIn', description: 'Source nurse profiles and post job openings', status: 'disconnected' },
    ],
    importExport: {
      lastImport: '2024-12-10T14:30:00Z',
      lastExport: '2024-12-15T08:30:00Z',
      exportFormat: 'csv',
    },
    notifications: {
      email: {
        nurseApplied: true,
        oetResultReceived: true,
        placementMatchFound: true,
        cohortMilestoneReached: false,
        documentExpiring: true,
        stageSLABreach: true,
      },
      inApp: {
        nurseApplied: true,
        oetResultReceived: true,
        placementMatchFound: true,
        cohortMilestoneReached: true,
        documentExpiring: true,
        stageSLABreach: true,
      },
      digestFrequency: 'Daily',
      quietHours: {
        enabled: false,
        start: '22:00',
        end: '07:00',
      },
    },
  };
}
