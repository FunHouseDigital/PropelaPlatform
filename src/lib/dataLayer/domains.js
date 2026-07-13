/**
 * Data_Layer domain registry (Task 2.1).
 *
 * This module is the single source of truth that maps every Data_Domain served
 * by `src/lib/storage.js` to the metadata the Supabase adapter needs to build
 * generic CRUD/list operations, and to the legacy `storage.js` getter/saver the
 * localStorage adapter delegates to. It is intentionally *data only* — importing
 * it has no side effects (no DB calls, no localStorage access, no client
 * instantiation).
 *
 * Requirements:
 * - Req 5.1: the relational schema defines a table for each Data_Domain
 *   persisted by the storage abstraction. Each entry names that table.
 * - Req 6.1: the Data_Layer exposes retrieval + persistence operations for every
 *   Data_Domain served by `storage.js`. This registry enumerates them so the
 *   facade and adapters can generate one binding per domain.
 *
 * Schema conventions (see design.md "Data Models"):
 * - Every domain table carries the common columns: `id text PRIMARY KEY`,
 *   `owner_id uuid`, `version integer`, `created_at timestamptz`,
 *   `updated_at timestamptz`. Those columns are implicit and are NOT repeated in
 *   each entry's `typedColumns`.
 * - `typedColumns` lists the domain-specific columns that are filtered, sorted,
 *   or joined (indexed filter fields, foreign keys, etc.).
 * - `jsonbColumns` lists the JSONB detail columns that store nested structures
 *   verbatim for exact write-then-read round-trips. Domains without explicit
 *   typed columns keep the remainder of the seed object under a single
 *   `attributes` JSONB column.
 *
 * Entry shape:
 * @typedef {Object} DomainConfig
 * @property {string}   name          Canonical domain name (registry key).
 * @property {string}   key           localStorage key used by getData/setData.
 * @property {string}   table         Postgres table name (snake_case).
 * @property {string}   primaryKey    Primary key column ('id' for collections).
 * @property {'collection'|'singleton'} kind  Collection (array of records) vs
 *   singleton/per-user object (single row per owner).
 * @property {string[]} typedColumns  Domain-specific typed/indexed columns.
 * @property {string[]} jsonbColumns  JSONB detail columns.
 * @property {boolean}  adminOnly     True when only the Admin role may access it.
 * @property {boolean}  perUser       True when the row(s) are scoped per user.
 * @property {{ pageSize: number, sort?: { column: string, asc: boolean } }} defaultListConfig
 * @property {string|null} legacyGetter  storage.js getter function name (or null).
 * @property {string|null} legacySaver   storage.js saver function name (or null).
 */

/** Default list page size shared by every domain (Req 12.1). */
export const DEFAULT_PAGE_SIZE = 25;

/**
 * Build a normalized DomainConfig, applying sensible defaults so each entry only
 * needs to specify what differs from the common pattern.
 *
 * @param {Partial<DomainConfig> & { name: string, key: string, table: string, kind: 'collection'|'singleton' }} cfg
 * @returns {DomainConfig}
 */
function defineDomain(cfg) {
  const {
    name,
    key,
    table,
    kind,
    typedColumns = [],
    jsonbColumns = kind === 'collection' ? ['attributes'] : ['value'],
    adminOnly = false,
    perUser = false,
    sort = null,
    legacyGetter = null,
    legacySaver = null,
  } = cfg;

  return {
    name,
    key,
    table,
    primaryKey: 'id',
    kind,
    typedColumns,
    jsonbColumns,
    adminOnly,
    perUser,
    defaultListConfig: sort
      ? { pageSize: DEFAULT_PAGE_SIZE, sort }
      : { pageSize: DEFAULT_PAGE_SIZE },
    legacyGetter,
    legacySaver,
  };
}

/**
 * The domain registry keyed by canonical domain name.
 *
 * Ordering groups domains by schema area (recruitment core, acquisition,
 * documents, communications, notifications, reporting, integrations, audit &
 * activity, personalization, automation, help & onboarding, configuration) to
 * mirror design.md.
 *
 * @type {Record<string, DomainConfig>}
 */
export const DOMAINS = Object.freeze({
  // ---- Recruitment core -----------------------------------------------------
  nurses: defineDomain({
    name: 'nurses',
    key: 'nurses',
    table: 'nurses',
    kind: 'collection',
    typedColumns: [
      'full_name',
      'preferred_name',
      'pipeline_stage',
      'readiness_status',
      'cohort_assigned',
      'oet_status',
      'final_score',
      'tier',
      'email',
    ],
    jsonbColumns: ['scorecard_fields', 'additional_certifications', 'communication_log', 'attributes'],
    legacyGetter: 'getNurses',
    legacySaver: 'saveNurses',
  }),
  facilities: defineDomain({
    name: 'facilities',
    key: 'facilities',
    table: 'facilities',
    kind: 'collection',
    typedColumns: ['name', 'province', 'city', 'group_name'],
    jsonbColumns: ['attributes'],
    legacyGetter: 'getFacilities',
    legacySaver: 'saveFacilities',
  }),
  cohorts: defineDomain({
    name: 'cohorts',
    key: 'cohorts',
    table: 'cohorts',
    kind: 'collection',
    typedColumns: ['name', 'status'],
    jsonbColumns: ['attributes'],
    legacyGetter: 'getCohorts',
    legacySaver: 'saveCohorts',
  }),
  placements: defineDomain({
    name: 'placements',
    key: 'placements',
    table: 'placements',
    kind: 'collection',
    typedColumns: ['nurse_id', 'facility_id', 'current_stage', 'target_country', 'visa_status', 'match_score'],
    jsonbColumns: ['contract_details', 'relocation_checklist', 'stage_history'],
    legacyGetter: 'getPlacements',
    legacySaver: 'savePlacements',
  }),

  // ---- Acquisition ----------------------------------------------------------
  referrers: defineDomain({
    name: 'referrers',
    key: 'referrers',
    table: 'referrers',
    kind: 'collection',
    legacyGetter: 'getReferrers',
    legacySaver: 'saveReferrers',
  }),
  communityChannels: defineDomain({
    name: 'communityChannels',
    key: 'communityChannels',
    table: 'community_channels',
    kind: 'collection',
    legacyGetter: 'getCommunityChannels',
    legacySaver: 'saveCommunityChannels',
  }),
  events: defineDomain({
    name: 'events',
    key: 'events',
    table: 'events',
    kind: 'collection',
    legacyGetter: 'getEvents',
    legacySaver: 'saveEvents',
  }),
  outreachTemplates: defineDomain({
    name: 'outreachTemplates',
    key: 'outreachTemplates',
    table: 'outreach_templates',
    kind: 'collection',
    legacyGetter: 'getOutreachTemplates',
    legacySaver: 'saveOutreachTemplates',
  }),

  // ---- Documents ------------------------------------------------------------
  reportTemplates: defineDomain({
    name: 'reportTemplates',
    key: 'reportTemplates',
    table: 'report_templates',
    kind: 'collection',
    legacyGetter: 'getReportTemplates',
    legacySaver: 'saveReportTemplates',
  }),
  documents: defineDomain({
    name: 'documents',
    key: 'documents',
    table: 'documents',
    kind: 'collection',
    typedColumns: ['nurse_id', 'doc_type', 'status', 'expiry_date'],
    jsonbColumns: ['attributes'],
    legacyGetter: 'getDocuments',
    legacySaver: 'saveDocuments',
  }),
  documentTemplates: defineDomain({
    name: 'documentTemplates',
    key: 'documentTemplates',
    table: 'document_templates',
    kind: 'collection',
    legacyGetter: 'getDocumentTemplates',
    legacySaver: 'saveDocumentTemplates',
  }),
  verificationQueue: defineDomain({
    name: 'verificationQueue',
    key: 'verificationQueue',
    table: 'verification_queue',
    kind: 'collection',
    legacyGetter: 'getVerificationQueue',
    legacySaver: 'saveVerificationQueue',
  }),

  // ---- Communications -------------------------------------------------------
  communications: defineDomain({
    name: 'communications',
    key: 'communications',
    table: 'communications',
    kind: 'collection',
    legacyGetter: 'getCommunications',
    legacySaver: 'saveCommunications',
  }),
  notifications: defineDomain({
    name: 'notifications',
    key: 'notifications',
    table: 'notifications',
    kind: 'collection',
    legacyGetter: 'getNotifications',
    legacySaver: 'saveNotifications',
  }),
  commEmailTemplates: defineDomain({
    name: 'commEmailTemplates',
    key: 'commEmailTemplates',
    table: 'comm_email_templates',
    kind: 'collection',
    legacyGetter: 'getCommEmailTemplates',
    legacySaver: 'saveCommEmailTemplates',
  }),
  alertRules: defineDomain({
    name: 'alertRules',
    key: 'alertRules',
    table: 'alert_rules',
    kind: 'collection',
    legacyGetter: 'getAlertRules',
    legacySaver: 'saveAlertRules',
  }),
  alertHistory: defineDomain({
    name: 'alertHistory',
    key: 'alertHistory',
    table: 'alert_history',
    kind: 'collection',
    legacyGetter: 'getAlertHistory',
    legacySaver: 'saveAlertHistory',
  }),
  notificationPreferences: defineDomain({
    name: 'notificationPreferences',
    key: 'notificationPreferences',
    table: 'notification_preferences',
    kind: 'singleton',
    perUser: true,
    legacyGetter: 'getNotificationPreferences',
    legacySaver: 'saveNotificationPreferences',
  }),

  // ---- Reporting ------------------------------------------------------------
  scheduledReports: defineDomain({
    name: 'scheduledReports',
    key: 'scheduledReports',
    table: 'scheduled_reports',
    kind: 'collection',
    legacyGetter: 'getScheduledReports',
    legacySaver: 'saveScheduledReports',
  }),
  exportHistory: defineDomain({
    name: 'exportHistory',
    key: 'exportHistory',
    table: 'export_history',
    kind: 'collection',
    legacyGetter: 'getExportHistory',
    legacySaver: 'saveExportHistory',
  }),
  dashboardLayouts: defineDomain({
    name: 'dashboardLayouts',
    key: 'dashboardLayouts',
    table: 'dashboard_layouts',
    kind: 'collection',
    legacyGetter: 'getDashboardLayouts',
    legacySaver: 'saveDashboardLayouts',
  }),
  activeDashboardLayout: defineDomain({
    name: 'activeDashboardLayout',
    key: 'activeDashboardLayout',
    table: 'active_dashboard_layout',
    kind: 'singleton',
    perUser: true,
    legacyGetter: 'getActiveDashboardLayout',
    legacySaver: 'saveActiveDashboardLayout',
  }),

  // ---- Integrations (Admin-only) -------------------------------------------
  integrations: defineDomain({
    name: 'integrations',
    key: 'integrations',
    table: 'integrations',
    kind: 'collection',
    adminOnly: true,
    legacyGetter: 'getIntegrations',
    legacySaver: 'saveIntegrations',
  }),
  apiEndpoints: defineDomain({
    name: 'apiEndpoints',
    key: 'apiEndpoints',
    table: 'api_endpoints',
    kind: 'collection',
    adminOnly: true,
    legacyGetter: 'getApiEndpoints',
    legacySaver: 'saveApiEndpoints',
  }),
  apiKeys: defineDomain({
    name: 'apiKeys',
    key: 'apiKeys',
    table: 'api_keys',
    kind: 'collection',
    adminOnly: true,
    legacyGetter: 'getApiKeys',
    legacySaver: 'saveApiKeys',
  }),
  webhooks: defineDomain({
    name: 'webhooks',
    key: 'webhooks',
    table: 'webhooks',
    kind: 'collection',
    adminOnly: true,
    legacyGetter: 'getWebhooks',
    legacySaver: 'saveWebhooks',
  }),
  webhookDeliveryLog: defineDomain({
    name: 'webhookDeliveryLog',
    key: 'webhookDeliveryLog',
    table: 'webhook_delivery_log',
    kind: 'collection',
    adminOnly: true,
    legacyGetter: 'getWebhookDeliveryLog',
    legacySaver: 'saveWebhookDeliveryLog',
  }),
  syncStatus: defineDomain({
    name: 'syncStatus',
    key: 'syncStatus',
    table: 'sync_status',
    kind: 'singleton',
    adminOnly: true,
    legacyGetter: 'getSyncStatus',
    legacySaver: 'saveSyncStatus',
  }),

  // ---- Audit & activity -----------------------------------------------------
  activityFeed: defineDomain({
    name: 'activityFeed',
    key: 'activityFeed',
    table: 'activity_feed',
    kind: 'collection',
    // Append-mostly, time-ordered; default to newest-first (Req 12.4).
    sort: { column: 'created_at', asc: false },
    legacyGetter: 'getActivityFeed',
    legacySaver: 'saveActivityFeed',
  }),
  auditLog: defineDomain({
    name: 'auditLog',
    key: 'auditLog',
    table: 'audit_log',
    kind: 'collection',
    typedColumns: ['actor', 'action', 'entity_type', 'entity_id', 'created_at'],
    jsonbColumns: ['detail'],
    sort: { column: 'created_at', asc: false },
    legacyGetter: 'getAuditLog',
    legacySaver: 'saveAuditLog',
  }),
  userSessions: defineDomain({
    name: 'userSessions',
    key: 'userSessions',
    table: 'user_sessions',
    kind: 'collection',
    legacyGetter: 'getUserSessions',
    legacySaver: 'saveUserSessions',
  }),
  changeHistory: defineDomain({
    name: 'changeHistory',
    key: 'changeHistory',
    table: 'change_history',
    kind: 'collection',
    legacyGetter: 'getChangeHistory',
    legacySaver: 'saveChangeHistory',
  }),

  // ---- Personalization (per-user) ------------------------------------------
  recentSearches: defineDomain({
    name: 'recentSearches',
    key: 'recentSearches',
    table: 'recent_searches',
    kind: 'collection',
    perUser: true,
    legacyGetter: 'getRecentSearches',
    legacySaver: 'saveRecentSearches',
  }),
  savedViews: defineDomain({
    name: 'savedViews',
    key: 'savedViews',
    table: 'saved_views',
    kind: 'collection',
    perUser: true,
    legacyGetter: 'getSavedViews',
    legacySaver: 'saveSavedViews',
  }),
  recentlyViewed: defineDomain({
    name: 'recentlyViewed',
    key: 'recentlyViewed',
    table: 'recently_viewed',
    kind: 'collection',
    perUser: true,
    legacyGetter: 'getRecentlyViewed',
    legacySaver: 'saveRecentlyViewed',
  }),

  // ---- Automation -----------------------------------------------------------
  automationRules: defineDomain({
    name: 'automationRules',
    key: 'automationRules',
    table: 'automation_rules',
    kind: 'collection',
    legacyGetter: 'getAutomationRules',
    legacySaver: 'saveAutomationRules',
  }),
  automationTemplates: defineDomain({
    name: 'automationTemplates',
    key: 'automationTemplates',
    table: 'automation_templates',
    kind: 'collection',
    legacyGetter: 'getAutomationTemplates',
    legacySaver: 'saveAutomationTemplates',
  }),
  executionLog: defineDomain({
    name: 'executionLog',
    key: 'executionLog',
    table: 'execution_log',
    kind: 'collection',
    sort: { column: 'created_at', asc: false },
    legacyGetter: 'getExecutionLog',
    legacySaver: 'saveExecutionLog',
  }),
  scheduledActions: defineDomain({
    name: 'scheduledActions',
    key: 'scheduledActions',
    table: 'scheduled_actions',
    kind: 'collection',
    legacyGetter: 'getScheduledActions',
    legacySaver: 'saveScheduledActions',
  }),

  // ---- Notifications & alerts ----------------------------------------------
  notificationAlerts: defineDomain({
    name: 'notificationAlerts',
    key: 'notificationAlerts',
    table: 'notification_alerts',
    kind: 'collection',
    legacyGetter: 'getNotificationAlerts',
    legacySaver: 'saveNotificationAlerts',
  }),
  notificationLog: defineDomain({
    name: 'notificationLog',
    key: 'notificationLog',
    table: 'notification_log',
    kind: 'collection',
    sort: { column: 'created_at', asc: false },
    legacyGetter: 'getNotificationLog',
    legacySaver: 'saveNotificationLog',
  }),
  notifAlertConfig: defineDomain({
    name: 'notifAlertConfig',
    key: 'notifAlertConfig',
    table: 'notif_alert_config',
    kind: 'singleton',
    legacyGetter: 'getNotifAlertConfig',
    legacySaver: 'saveNotifAlertConfig',
  }),
  toastPreferences: defineDomain({
    name: 'toastPreferences',
    key: 'toastPreferences',
    table: 'toast_preferences',
    kind: 'singleton',
    perUser: true,
    legacyGetter: 'getToastPreferences',
    legacySaver: 'saveToastPreferences',
  }),

  // ---- Help & onboarding ----------------------------------------------------
  helpArticles: defineDomain({
    name: 'helpArticles',
    key: 'helpArticles',
    table: 'help_articles',
    kind: 'collection',
    legacyGetter: 'getHelpArticles',
    legacySaver: 'saveHelpArticles',
  }),
  // Seeded through seedHelp(); storage.js has no dedicated getter/saver today,
  // so the legacy accessors are null. The Supabase adapter still exposes ops for
  // these tables via the registry (Req 6.1).
  onboardingSteps: defineDomain({
    name: 'onboardingSteps',
    key: 'onboardingSteps',
    table: 'onboarding_steps',
    kind: 'collection',
    legacyGetter: null,
    legacySaver: null,
  }),
  featureTours: defineDomain({
    name: 'featureTours',
    key: 'featureTours',
    table: 'feature_tours',
    kind: 'collection',
    legacyGetter: null,
    legacySaver: null,
  }),
  onboardingState: defineDomain({
    name: 'onboardingState',
    key: 'onboardingState',
    table: 'onboarding_state',
    kind: 'singleton',
    perUser: true,
    legacyGetter: 'getOnboardingState',
    legacySaver: 'saveOnboardingState',
  }),
  tourState: defineDomain({
    name: 'tourState',
    key: 'tourState',
    table: 'tour_state',
    kind: 'singleton',
    perUser: true,
    legacyGetter: 'getTourState',
    legacySaver: 'saveTourState',
  }),
  articleVotes: defineDomain({
    name: 'articleVotes',
    key: 'articleVotes',
    table: 'article_votes',
    kind: 'singleton',
    perUser: true,
    legacyGetter: 'getArticleVotes',
    legacySaver: 'saveArticleVotes',
  }),

  // ---- Configuration (Admin-only) ------------------------------------------
  settings: defineDomain({
    name: 'settings',
    key: 'settings',
    table: 'settings',
    kind: 'singleton',
    adminOnly: true,
    legacyGetter: 'getSettings',
    legacySaver: 'saveSettings',
  }),
});

/**
 * Look up a domain configuration by its canonical name.
 *
 * @param {string} name Domain name (e.g. 'nurses').
 * @returns {DomainConfig|undefined} The config, or undefined when unknown.
 */
export function getDomain(name) {
  return DOMAINS[name];
}

/**
 * List every registered domain name.
 *
 * @returns {string[]} Domain names in registry order.
 */
export function listDomainNames() {
  return Object.keys(DOMAINS);
}

/**
 * List every registered domain configuration.
 *
 * @returns {DomainConfig[]} Domain configs in registry order.
 */
export function listDomains() {
  return Object.values(DOMAINS);
}

export default DOMAINS;
