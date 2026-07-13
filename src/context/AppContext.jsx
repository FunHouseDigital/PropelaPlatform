/**
 * @typedef {Object} AppContextValue
 * @property {Array} nurses - List of nurse records
 * @property {Array} facilities - List of facility records
 * @property {Array} cohorts - List of cohort records
 * @property {Array} referrers - List of referrer records
 * @property {Array} communityChannels - List of community channel records
 * @property {Array} events - List of event records
 * @property {Array} outreachTemplates - List of outreach template records
 * @property {Array} placements - List of placement records
 * @property {Object} settings - Application settings object
 * @property {Array} documents - List of document records
 * @property {Array} documentTemplates - List of document template records
 * @property {Array} verificationQueue - List of verification queue items
 * @property {Array} communications - List of communication records
 * @property {Array} notifications - List of notification records
 * @property {Array} commEmailTemplates - List of communication email templates
 * @property {Array} alertRules - List of alert rule configurations
 * @property {Array} alertHistory - List of alert history entries
 * @property {Object} notificationPreferences - User notification preferences
 * @property {Array} scheduledReports - List of scheduled report configs
 * @property {Array} exportHistory - List of export history entries
 * @property {Array} dashboardLayouts - List of dashboard layout configs
 * @property {string|null} activeDashboardLayout - Currently active dashboard layout ID
 * @property {Array} integrations - List of integration configs
 * @property {Array} apiEndpoints - List of API endpoint definitions
 * @property {Array} apiKeys - List of API key records
 * @property {Array} webhooks - List of webhook configs
 * @property {Array} webhookDeliveryLog - List of webhook delivery log entries
 * @property {Object} syncStatus - Current sync status object
 * @property {Array} activityFeed - List of activity feed entries
 * @property {Array} auditLog - List of audit log entries
 * @property {Array} userSessions - List of user session records
 * @property {Array} changeHistory - List of change history entries
 * @property {Array} recentSearches - List of recent search queries
 * @property {Array} savedViews - List of saved view configs
 * @property {Array} recentlyViewed - List of recently viewed items
 * @property {Array} automationRules - List of automation rule configs
 * @property {Array} automationTemplates - List of automation templates
 * @property {Array} executionLog - List of automation execution log entries
 * @property {Array} scheduledActions - List of scheduled action configs
 * @property {Array} notificationAlerts - List of notification alert items
 * @property {Object} notifAlertConfig - Notification alert configuration
 * @property {Array} notificationLog - List of notification log entries
 * @property {Object} toastPreferences - Toast notification preferences
 * @property {Array} helpArticles - List of help article records
 * @property {Object} onboardingState - Current onboarding state
 * @property {Object} tourState - Current tour/walkthrough state
 * @property {Object} articleVotes - Article vote tallies
 * @property {Function} updateNurses - Updates the nurses list
 * @property {Function} updateFacilities - Updates the facilities list
 * @property {Function} updateCohorts - Updates the cohorts list
 * @property {Function} updateReferrers - Updates the referrers list
 * @property {Function} updateCommunityChannels - Updates community channels
 * @property {Function} updateEvents - Updates the events list
 * @property {Function} updateOutreachTemplates - Updates outreach templates
 * @property {Function} updatePlacements - Updates the placements list
 * @property {Function} updateSettings - Updates application settings
 * @property {Function} updateDocuments - Updates the documents list
 * @property {Function} updateDocumentTemplates - Updates document templates
 * @property {Function} updateVerificationQueue - Updates verification queue
 * @property {Function} updateCommunications - Updates communications list
 * @property {Function} updateNotifications - Updates notifications list
 * @property {Function} updateCommEmailTemplates - Updates email templates
 * @property {Function} updateAlertRules - Updates alert rules
 * @property {Function} updateAlertHistory - Updates alert history
 * @property {Function} updateNotificationPreferences - Updates notification preferences
 * @property {Function} updateScheduledReports - Updates scheduled reports
 * @property {Function} updateExportHistory - Updates export history
 * @property {Function} updateDashboardLayouts - Updates dashboard layouts
 * @property {Function} updateActiveDashboardLayout - Updates active dashboard layout
 * @property {Function} updateIntegrations - Updates integrations
 * @property {Function} updateApiEndpoints - Updates API endpoints
 * @property {Function} updateApiKeys - Updates API keys
 * @property {Function} updateWebhooks - Updates webhooks
 * @property {Function} updateWebhookDeliveryLog - Updates webhook delivery log
 * @property {Function} updateSyncStatus - Updates sync status
 * @property {Function} updateActivityFeed - Updates activity feed
 * @property {Function} updateAuditLog - Updates audit log
 * @property {Function} updateUserSessions - Updates user sessions
 * @property {Function} updateChangeHistory - Updates change history
 * @property {Function} updateRecentSearches - Updates recent searches
 * @property {Function} updateSavedViews - Updates saved views
 * @property {Function} updateRecentlyViewed - Updates recently viewed items
 * @property {Function} updateAutomationRules - Updates automation rules
 * @property {Function} updateAutomationTemplates - Updates automation templates
 * @property {Function} updateExecutionLog - Updates execution log
 * @property {Function} updateScheduledActions - Updates scheduled actions
 * @property {Function} updateNotificationAlerts - Updates notification alerts
 * @property {Function} updateNotifAlertConfig - Updates notification alert config
 * @property {Function} updateNotificationLog - Updates notification log
 * @property {Function} updateToastPreferences - Updates toast preferences
 * @property {Function} updateHelpArticles - Updates help articles
 * @property {Function} updateOnboardingState - Updates onboarding state
 * @property {Function} updateTourState - Updates tour state
 * @property {Function} updateArticleVotes - Updates article votes
 * @property {Array} toasts - Current active toast notifications
 * @property {Function} addToast - Adds a new toast notification, returns its ID
 * @property {Function} dismissToast - Dismisses a toast by ID
 *
 * ADDITIVE (Task 9) — async data-layer keys, present in both flag modes but only
 * meaningful when the SUPABASE_BACKEND flag is ON. These are extra keys; no
 * existing field or updater above was removed or renamed (Req 6.1).
 * @property {Object.<string, { loading: boolean, error: (Object|null), page: number, pageSize: number, total: number, staleWarning: boolean }>} slices
 *   Per-domain async slice metadata keyed by domain name. The slice's data lives
 *   in the matching top-level field (e.g. `nurses`), which pages keep reading.
 * @property {Function} loadDomain - `loadDomain(name, { page, filters })` async loader through the facade
 * @property {Function} retryDomain - `retryDomain(name, opts)` re-runs a failed load, clearing failed state on success
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  getCollection as dlGetCollection,
  isSupabaseBackend,
  list as dlList,
  saveCollection as dlSaveCollection,
} from '../lib/dataLayer';
import { getDomain } from '../lib/dataLayer/domains';
import { mapError } from '../lib/dataLayer/errors';
import {
  getActiveDashboardLayout,
  getActivityFeed,
  getAlertHistory,
  getAlertRules,
  getApiEndpoints,
  getApiKeys,
  getArticleVotes,
  getAuditLog,
  getAutomationRules,
  getAutomationTemplates,
  getChangeHistory,
  getCohorts,
  getCommEmailTemplates,
  getCommunications,
  getCommunityChannels,
  getDashboardLayouts,
  getDocuments,
  getDocumentTemplates,
  getEvents,
  getExecutionLog,
  getExportHistory,
  getFacilities,
  getHelpArticles,
  getIntegrations,
  getNotifAlertConfig,
  getNotificationAlerts,
  getNotificationLog,
  getNotificationPreferences,
  getNotifications,
  getNurses,
  getOnboardingState,
  getOutreachTemplates,
  getPlacements,
  getRecentlyViewed,
  getRecentSearches,
  getReferrers,
  getSavedViews,
  getScheduledActions,
  getScheduledReports,
  getSettings,
  getSyncStatus,
  getToastPreferences,
  getTourState,
  getUserSessions,
  getVerificationQueue,
  getWebhookDeliveryLog,
  getWebhooks,
  saveActiveDashboardLayout,
  saveActivityFeed,
  saveAlertHistory,
  saveAlertRules,
  saveApiEndpoints,
  saveApiKeys,
  saveArticleVotes,
  saveAuditLog,
  saveAutomationRules,
  saveAutomationTemplates,
  saveChangeHistory,
  saveCohorts,
  saveCommEmailTemplates,
  saveCommunications,
  saveCommunityChannels,
  saveDashboardLayouts,
  saveDocuments,
  saveDocumentTemplates,
  saveEvents,
  saveExecutionLog,
  saveExportHistory,
  saveFacilities,
  saveHelpArticles,
  saveIntegrations,
  saveNotifAlertConfig,
  saveNotificationAlerts,
  saveNotificationLog,
  saveNotificationPreferences,
  saveNotifications,
  saveNurses,
  saveOnboardingState,
  saveOutreachTemplates,
  savePlacements,
  saveRecentlyViewed,
  saveRecentSearches,
  saveReferrers,
  saveSavedViews,
  saveScheduledActions,
  saveScheduledReports,
  saveSettings,
  saveSyncStatus,
  saveToastPreferences,
  saveTourState,
  saveUserSessions,
  saveVerificationQueue,
  saveWebhookDeliveryLog,
  saveWebhooks,
} from '../lib/storage';

const AppContext = createContext(null);

/**
 * The domain names exposed by this context, in the public-shape order. Each name
 * maps 1:1 to a Data_Layer domain (see `src/lib/dataLayer/domains.js`) and to a
 * top-level context field of the same name. Used to build slice metadata and the
 * additive per-domain `load*`/`retry*` actions.
 */
const CONTEXT_DOMAINS = [
  'nurses',
  'facilities',
  'cohorts',
  'referrers',
  'communityChannels',
  'events',
  'outreachTemplates',
  'placements',
  'settings',
  'documents',
  'documentTemplates',
  'verificationQueue',
  'communications',
  'notifications',
  'commEmailTemplates',
  'alertRules',
  'alertHistory',
  'notificationPreferences',
  'scheduledReports',
  'exportHistory',
  'dashboardLayouts',
  'activeDashboardLayout',
  'integrations',
  'apiEndpoints',
  'apiKeys',
  'webhooks',
  'webhookDeliveryLog',
  'syncStatus',
  'activityFeed',
  'auditLog',
  'userSessions',
  'changeHistory',
  'recentSearches',
  'savedViews',
  'recentlyViewed',
  'automationRules',
  'automationTemplates',
  'executionLog',
  'scheduledActions',
  'notificationAlerts',
  'notifAlertConfig',
  'notificationLog',
  'toastPreferences',
  'helpArticles',
  'onboardingState',
  'tourState',
  'articleVotes',
];

const DEFAULT_PAGE_SIZE = 25;

/** Build the initial per-domain slice metadata map (Req 6.6, 12.1, 12.2). */
function makeInitialSlices() {
  const slices = {};
  for (const name of CONTEXT_DOMAINS) {
    slices[name] = {
      loading: isSupabaseBackend, // ON: hydrating; OFF: data is ready synchronously
      error: null,
      page: 1,
      pageSize: DEFAULT_PAGE_SIZE,
      total: 0,
      staleWarning: false,
    };
  }
  return slices;
}

export function AppProvider({ children }) {
  // ── Per-domain data state ────────────────────────────────────────────────
  // COMPATIBILITY: When the SUPABASE_BACKEND flag is OFF (default) each slice is
  // initialized synchronously from localStorage via storage.js exactly as before
  // — zero behavior change, existing tests stay green. When the flag is ON the
  // slices start empty (collections `[]`, singletons `null`) and are hydrated by
  // an async effect through the Data_Layer facade (Req 6.2, 2.1, 12.1).
  const [nurses, setNurses] = useState(() => (isSupabaseBackend ? [] : getNurses()));
  const [facilities, setFacilities] = useState(() => (isSupabaseBackend ? [] : getFacilities()));
  const [cohorts, setCohorts] = useState(() => (isSupabaseBackend ? [] : getCohorts()));
  const [referrers, setReferrers] = useState(() => (isSupabaseBackend ? [] : getReferrers()));
  const [communityChannels, setCommunityChannels] = useState(() => (isSupabaseBackend ? [] : getCommunityChannels()));
  const [events, setEvents] = useState(() => (isSupabaseBackend ? [] : getEvents()));
  const [outreachTemplates, setOutreachTemplates] = useState(() => (isSupabaseBackend ? [] : getOutreachTemplates()));
  const [placements, setPlacements] = useState(() => (isSupabaseBackend ? [] : getPlacements()));
  const [settings, setSettings] = useState(() => (isSupabaseBackend ? null : getSettings()));
  const [documents, setDocuments] = useState(() => (isSupabaseBackend ? [] : getDocuments()));
  const [documentTemplates, setDocumentTemplates] = useState(() => (isSupabaseBackend ? [] : getDocumentTemplates()));
  const [verificationQueue, setVerificationQueue] = useState(() => (isSupabaseBackend ? [] : getVerificationQueue()));
  const [communications, setCommunications] = useState(() => (isSupabaseBackend ? [] : getCommunications()));
  const [notifications, setNotifications] = useState(() => (isSupabaseBackend ? [] : getNotifications()));
  const [commEmailTemplates, setCommEmailTemplates] = useState(() => (isSupabaseBackend ? [] : getCommEmailTemplates()));
  const [alertRules, setAlertRules] = useState(() => (isSupabaseBackend ? [] : getAlertRules()));
  const [alertHistory, setAlertHistory] = useState(() => (isSupabaseBackend ? [] : getAlertHistory()));
  const [notificationPreferences, setNotificationPreferences] = useState(() => (isSupabaseBackend ? null : getNotificationPreferences()));
  const [scheduledReports, setScheduledReports] = useState(() => (isSupabaseBackend ? [] : getScheduledReports()));
  const [exportHistory, setExportHistory] = useState(() => (isSupabaseBackend ? [] : getExportHistory()));
  const [dashboardLayouts, setDashboardLayouts] = useState(() => (isSupabaseBackend ? [] : getDashboardLayouts()));
  const [activeDashboardLayout, setActiveDashboardLayout] = useState(() => (isSupabaseBackend ? null : getActiveDashboardLayout()));
  const [integrations, setIntegrations] = useState(() => (isSupabaseBackend ? [] : getIntegrations()));
  const [apiEndpoints, setApiEndpoints] = useState(() => (isSupabaseBackend ? [] : getApiEndpoints()));
  const [apiKeys, setApiKeys] = useState(() => (isSupabaseBackend ? [] : getApiKeys()));
  const [webhooks, setWebhooks] = useState(() => (isSupabaseBackend ? [] : getWebhooks()));
  const [webhookDeliveryLog, setWebhookDeliveryLog] = useState(() => (isSupabaseBackend ? [] : getWebhookDeliveryLog()));
  const [syncStatus, setSyncStatus] = useState(() => (isSupabaseBackend ? null : getSyncStatus()));
  const [activityFeed, setActivityFeed] = useState(() => (isSupabaseBackend ? [] : getActivityFeed()));
  const [auditLog, setAuditLog] = useState(() => (isSupabaseBackend ? [] : getAuditLog()));
  const [userSessions, setUserSessions] = useState(() => (isSupabaseBackend ? [] : getUserSessions()));
  const [changeHistory, setChangeHistory] = useState(() => (isSupabaseBackend ? [] : getChangeHistory()));
  const [recentSearches, setRecentSearches] = useState(() => (isSupabaseBackend ? [] : getRecentSearches()));
  const [savedViews, setSavedViews] = useState(() => (isSupabaseBackend ? [] : getSavedViews()));
  const [recentlyViewed, setRecentlyViewed] = useState(() => (isSupabaseBackend ? [] : getRecentlyViewed()));
  const [automationRules, setAutomationRules] = useState(() => (isSupabaseBackend ? [] : getAutomationRules()));
  const [automationTemplates, setAutomationTemplates] = useState(() => (isSupabaseBackend ? [] : getAutomationTemplates()));
  const [executionLog, setExecutionLog] = useState(() => (isSupabaseBackend ? [] : getExecutionLog()));
  const [scheduledActions, setScheduledActions] = useState(() => (isSupabaseBackend ? [] : getScheduledActions()));
  const [notificationAlerts, setNotificationAlerts] = useState(() => (isSupabaseBackend ? [] : getNotificationAlerts()));
  const [notifAlertConfig, setNotifAlertConfig] = useState(() => (isSupabaseBackend ? null : getNotifAlertConfig()));
  const [notificationLog, setNotificationLog] = useState(() => (isSupabaseBackend ? [] : getNotificationLog()));
  const [toastPreferences, setToastPreferences] = useState(() => (isSupabaseBackend ? null : getToastPreferences()));
  const [helpArticles, setHelpArticles] = useState(() => (isSupabaseBackend ? [] : getHelpArticles()));
  const [onboardingState, setOnboardingState] = useState(() => (isSupabaseBackend ? null : getOnboardingState()));
  const [tourState, setTourState] = useState(() => (isSupabaseBackend ? null : getTourState()));
  const [articleVotes, setArticleVotes] = useState(() => (isSupabaseBackend ? null : getArticleVotes()));
  const [toasts, setToasts] = useState([]);

  // Additive per-domain async slice metadata (Req 6.6, 9.3, 12.2).
  const [slices, setSlices] = useState(makeInitialSlices);

  // ── Toast system (unchanged public behavior) ─────────────────────────────
  const toastIdCounter = useRef(0);

  const addToast = useCallback((notification) => {
    toastIdCounter.current += 1;
    const id = `ctx-toast-${toastIdCounter.current}`;
    const newToast = { ...notification, id, createdAt: Date.now() };
    setToasts((prev) => [newToast, ...prev]);
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Stable name→setState map so generic actions can update the matching
  // top-level field by domain name. setState identities are stable across
  // renders, so an empty dependency list is correct.
  const setters = useMemo(
    () => ({
      nurses: setNurses,
      facilities: setFacilities,
      cohorts: setCohorts,
      referrers: setReferrers,
      communityChannels: setCommunityChannels,
      events: setEvents,
      outreachTemplates: setOutreachTemplates,
      placements: setPlacements,
      settings: setSettings,
      documents: setDocuments,
      documentTemplates: setDocumentTemplates,
      verificationQueue: setVerificationQueue,
      communications: setCommunications,
      notifications: setNotifications,
      commEmailTemplates: setCommEmailTemplates,
      alertRules: setAlertRules,
      alertHistory: setAlertHistory,
      notificationPreferences: setNotificationPreferences,
      scheduledReports: setScheduledReports,
      exportHistory: setExportHistory,
      dashboardLayouts: setDashboardLayouts,
      activeDashboardLayout: setActiveDashboardLayout,
      integrations: setIntegrations,
      apiEndpoints: setApiEndpoints,
      apiKeys: setApiKeys,
      webhooks: setWebhooks,
      webhookDeliveryLog: setWebhookDeliveryLog,
      syncStatus: setSyncStatus,
      activityFeed: setActivityFeed,
      auditLog: setAuditLog,
      userSessions: setUserSessions,
      changeHistory: setChangeHistory,
      recentSearches: setRecentSearches,
      savedViews: setSavedViews,
      recentlyViewed: setRecentlyViewed,
      automationRules: setAutomationRules,
      automationTemplates: setAutomationTemplates,
      executionLog: setExecutionLog,
      scheduledActions: setScheduledActions,
      notificationAlerts: setNotificationAlerts,
      notifAlertConfig: setNotifAlertConfig,
      notificationLog: setNotificationLog,
      toastPreferences: setToastPreferences,
      helpArticles: setHelpArticles,
      onboardingState: setOnboardingState,
      tourState: setTourState,
      articleVotes: setArticleVotes,
    }),
    [],
  );

  /** Patch a single domain's slice metadata immutably. */
  const patchSlice = useCallback((name, patch) => {
    setSlices((prev) => ({ ...prev, [name]: { ...prev[name], ...patch } }));
  }, []);

  /**
   * Async loader for a domain through the Data_Layer facade (flag ON only).
   * When a `page`/`filters` option is supplied for a collection it uses the
   * paginated `list`; otherwise it hydrates the full collection/singleton via
   * `getCollection`. On failure it keeps previously displayed records and marks
   * the slice stale so the UI can flag potentially-outdated data (Req 1.6, 9.3,
   * 12.6). When the flag is OFF this is a no-op — the legacy synchronous state is
   * already populated (Req 9.1).
   */
  const loadDomain = useCallback(
    async (name, opts = {}) => {
      if (!isSupabaseBackend) return { data: null, error: null };
      const setter = setters[name];
      const domain = getDomain(name);
      patchSlice(name, { loading: true, error: null });
      try {
        const wantsPage =
          domain && domain.kind === 'collection' &&
          (opts.page != null || opts.filters != null || opts.sort != null);
        if (wantsPage) {
          const res = await dlList(name, opts);
          if (res.error) {
            patchSlice(name, { loading: false, error: res.error, staleWarning: true });
            return res;
          }
          if (setter) setter(res.data);
          patchSlice(name, {
            loading: false,
            error: null,
            staleWarning: false,
            page: res.page,
            pageSize: res.pageSize,
            total: res.total,
          });
          return res;
        }

        const res = await dlGetCollection(name);
        if (res.error) {
          // Keep previously displayed records; mark potentially stale (Req 1.6).
          patchSlice(name, { loading: false, error: res.error, staleWarning: true });
          return res;
        }
        if (setter) setter(res.data);
        const total = Array.isArray(res.data) ? res.data.length : 0;
        patchSlice(name, { loading: false, error: null, staleWarning: false, total });
        return res;
      } catch (err) {
        const mapped = mapError(err);
        patchSlice(name, { loading: false, error: mapped, staleWarning: true });
        return { data: null, error: mapped };
      }
    },
    [patchSlice, setters],
  );

  /** Retry a failed load; a successful load clears the failed/stale state. */
  const retryDomain = useCallback((name, opts) => loadDomain(name, opts), [loadDomain]);

  /**
   * Route a whole-collection write through the facade (flag ON). Surfaces a
   * returned conflict via the existing toast system without silently overwriting
   * the user's data (which was already applied optimistically), and reports write
   * failures as "not saved" so the user can retry (Req 2.5, 2.6, 1.5, 9.4).
   */
  const writeThrough = useCallback(
    (name, value) => {
      patchSlice(name, { loading: true, error: null });
      Promise.resolve(dlSaveCollection(name, value))
        .then((res) => {
          if (res && res.conflict) {
            addToast({
              type: 'warning',
              title: 'Record changed',
              message:
                'This record was changed since you last loaded it. Your input was kept — reload to see the current value before saving again.',
            });
            patchSlice(name, { loading: false, error: null });
          } else if (res && res.error) {
            addToast({
              type: 'error',
              title: 'Not saved',
              message: res.error.message || 'Your changes could not be saved. Please retry.',
            });
            patchSlice(name, { loading: false, error: res.error, staleWarning: true });
          } else {
            patchSlice(name, { loading: false, error: null, staleWarning: false });
          }
        })
        .catch((err) => {
          const mapped = mapError(err);
          addToast({ type: 'error', title: 'Not saved', message: mapped.message });
          patchSlice(name, { loading: false, error: mapped, staleWarning: true });
        });
    },
    [patchSlice, addToast],
  );

  // ── Update functions ──────────────────────────────────────────────────────
  // Identical signatures to before. When the flag is OFF they behave EXACTLY as
  // today: optimistic setX + synchronous saveX through storage.js. When the flag
  // is ON they still apply the optimistic setX (so the public field reflects the
  // change immediately) and route the write through the Data_Layer facade, which
  // diffs + issues versioned writes and reports conflicts (Req 6.1, 2.5, 2.6).
  const updateNurses = useCallback((updatedNurses) => {
    setNurses(updatedNurses);
    if (isSupabaseBackend) writeThrough('nurses', updatedNurses);
    else saveNurses(updatedNurses);
  }, [writeThrough]);

  const updateFacilities = useCallback((updatedFacilities) => {
    setFacilities(updatedFacilities);
    if (isSupabaseBackend) writeThrough('facilities', updatedFacilities);
    else saveFacilities(updatedFacilities);
  }, [writeThrough]);

  const updateCohorts = useCallback((updatedCohorts) => {
    setCohorts(updatedCohorts);
    if (isSupabaseBackend) writeThrough('cohorts', updatedCohorts);
    else saveCohorts(updatedCohorts);
  }, [writeThrough]);

  const updateReferrers = useCallback((updatedReferrers) => {
    setReferrers(updatedReferrers);
    if (isSupabaseBackend) writeThrough('referrers', updatedReferrers);
    else saveReferrers(updatedReferrers);
  }, [writeThrough]);

  const updateCommunityChannels = useCallback((updatedChannels) => {
    setCommunityChannels(updatedChannels);
    if (isSupabaseBackend) writeThrough('communityChannels', updatedChannels);
    else saveCommunityChannels(updatedChannels);
  }, [writeThrough]);

  const updateEvents = useCallback((updatedEvents) => {
    setEvents(updatedEvents);
    if (isSupabaseBackend) writeThrough('events', updatedEvents);
    else saveEvents(updatedEvents);
  }, [writeThrough]);

  const updateOutreachTemplates = useCallback((updatedTemplates) => {
    setOutreachTemplates(updatedTemplates);
    if (isSupabaseBackend) writeThrough('outreachTemplates', updatedTemplates);
    else saveOutreachTemplates(updatedTemplates);
  }, [writeThrough]);

  const updatePlacements = useCallback((updatedPlacements) => {
    setPlacements(updatedPlacements);
    if (isSupabaseBackend) writeThrough('placements', updatedPlacements);
    else savePlacements(updatedPlacements);
  }, [writeThrough]);

  const updateSettings = useCallback((updatedSettings) => {
    setSettings(updatedSettings);
    if (isSupabaseBackend) writeThrough('settings', updatedSettings);
    else saveSettings(updatedSettings);
  }, [writeThrough]);

  const updateDocuments = useCallback((updatedDocuments) => {
    setDocuments(updatedDocuments);
    if (isSupabaseBackend) writeThrough('documents', updatedDocuments);
    else saveDocuments(updatedDocuments);
  }, [writeThrough]);

  const updateDocumentTemplates = useCallback((updatedTemplates) => {
    setDocumentTemplates(updatedTemplates);
    if (isSupabaseBackend) writeThrough('documentTemplates', updatedTemplates);
    else saveDocumentTemplates(updatedTemplates);
  }, [writeThrough]);

  const updateVerificationQueue = useCallback((updatedQueue) => {
    setVerificationQueue(updatedQueue);
    if (isSupabaseBackend) writeThrough('verificationQueue', updatedQueue);
    else saveVerificationQueue(updatedQueue);
  }, [writeThrough]);

  const updateCommunications = useCallback((updatedCommunications) => {
    setCommunications(updatedCommunications);
    if (isSupabaseBackend) writeThrough('communications', updatedCommunications);
    else saveCommunications(updatedCommunications);
  }, [writeThrough]);

  const updateNotifications = useCallback((updatedNotifications) => {
    setNotifications(updatedNotifications);
    if (isSupabaseBackend) writeThrough('notifications', updatedNotifications);
    else saveNotifications(updatedNotifications);
  }, [writeThrough]);

  const updateCommEmailTemplates = useCallback((updatedTemplates) => {
    setCommEmailTemplates(updatedTemplates);
    if (isSupabaseBackend) writeThrough('commEmailTemplates', updatedTemplates);
    else saveCommEmailTemplates(updatedTemplates);
  }, [writeThrough]);

  const updateAlertRules = useCallback((updatedRules) => {
    setAlertRules(updatedRules);
    if (isSupabaseBackend) writeThrough('alertRules', updatedRules);
    else saveAlertRules(updatedRules);
  }, [writeThrough]);

  const updateAlertHistory = useCallback((updatedHistory) => {
    setAlertHistory(updatedHistory);
    if (isSupabaseBackend) writeThrough('alertHistory', updatedHistory);
    else saveAlertHistory(updatedHistory);
  }, [writeThrough]);

  const updateNotificationPreferences = useCallback((updatedPreferences) => {
    setNotificationPreferences(updatedPreferences);
    if (isSupabaseBackend) writeThrough('notificationPreferences', updatedPreferences);
    else saveNotificationPreferences(updatedPreferences);
  }, [writeThrough]);

  const updateScheduledReports = useCallback((updatedReports) => {
    setScheduledReports(updatedReports);
    if (isSupabaseBackend) writeThrough('scheduledReports', updatedReports);
    else saveScheduledReports(updatedReports);
  }, [writeThrough]);

  const updateExportHistory = useCallback((updatedHistory) => {
    setExportHistory(updatedHistory);
    if (isSupabaseBackend) writeThrough('exportHistory', updatedHistory);
    else saveExportHistory(updatedHistory);
  }, [writeThrough]);

  const updateDashboardLayouts = useCallback((updatedLayouts) => {
    setDashboardLayouts(updatedLayouts);
    if (isSupabaseBackend) writeThrough('dashboardLayouts', updatedLayouts);
    else saveDashboardLayouts(updatedLayouts);
  }, [writeThrough]);

  const updateActiveDashboardLayout = useCallback((updatedLayout) => {
    setActiveDashboardLayout(updatedLayout);
    if (isSupabaseBackend) writeThrough('activeDashboardLayout', updatedLayout);
    else saveActiveDashboardLayout(updatedLayout);
  }, [writeThrough]);

  const updateIntegrations = useCallback((updatedIntegrations) => {
    setIntegrations(updatedIntegrations);
    if (isSupabaseBackend) writeThrough('integrations', updatedIntegrations);
    else saveIntegrations(updatedIntegrations);
  }, [writeThrough]);

  const updateApiEndpoints = useCallback((updatedEndpoints) => {
    setApiEndpoints(updatedEndpoints);
    if (isSupabaseBackend) writeThrough('apiEndpoints', updatedEndpoints);
    else saveApiEndpoints(updatedEndpoints);
  }, [writeThrough]);

  const updateApiKeys = useCallback((updatedKeys) => {
    setApiKeys(updatedKeys);
    if (isSupabaseBackend) writeThrough('apiKeys', updatedKeys);
    else saveApiKeys(updatedKeys);
  }, [writeThrough]);

  const updateWebhooks = useCallback((updatedWebhooks) => {
    setWebhooks(updatedWebhooks);
    if (isSupabaseBackend) writeThrough('webhooks', updatedWebhooks);
    else saveWebhooks(updatedWebhooks);
  }, [writeThrough]);

  const updateWebhookDeliveryLog = useCallback((updatedLog) => {
    setWebhookDeliveryLog(updatedLog);
    if (isSupabaseBackend) writeThrough('webhookDeliveryLog', updatedLog);
    else saveWebhookDeliveryLog(updatedLog);
  }, [writeThrough]);

  const updateSyncStatus = useCallback((updatedStatus) => {
    setSyncStatus(updatedStatus);
    if (isSupabaseBackend) writeThrough('syncStatus', updatedStatus);
    else saveSyncStatus(updatedStatus);
  }, [writeThrough]);

  const updateActivityFeed = useCallback((updatedFeed) => {
    setActivityFeed(updatedFeed);
    if (isSupabaseBackend) writeThrough('activityFeed', updatedFeed);
    else saveActivityFeed(updatedFeed);
  }, [writeThrough]);

  const updateAuditLog = useCallback((updatedLog) => {
    setAuditLog(updatedLog);
    if (isSupabaseBackend) writeThrough('auditLog', updatedLog);
    else saveAuditLog(updatedLog);
  }, [writeThrough]);

  const updateUserSessions = useCallback((updatedSessions) => {
    setUserSessions(updatedSessions);
    if (isSupabaseBackend) writeThrough('userSessions', updatedSessions);
    else saveUserSessions(updatedSessions);
  }, [writeThrough]);

  // Special: supports a functional updater form in addition to a plain value.
  // Both branches preserve the legacy synchronous save when the flag is OFF and
  // route through the facade when ON (Req 6.1).
  const updateChangeHistory = useCallback((updatedHistoryOrFn) => {
    if (typeof updatedHistoryOrFn === 'function') {
      setChangeHistory((prev) => {
        const next = updatedHistoryOrFn(prev);
        if (isSupabaseBackend) writeThrough('changeHistory', next);
        else saveChangeHistory(next);
        return next;
      });
    } else {
      setChangeHistory(updatedHistoryOrFn);
      if (isSupabaseBackend) writeThrough('changeHistory', updatedHistoryOrFn);
      else saveChangeHistory(updatedHistoryOrFn);
    }
  }, [writeThrough]);

  const updateRecentSearches = useCallback((updatedSearches) => {
    setRecentSearches(updatedSearches);
    if (isSupabaseBackend) writeThrough('recentSearches', updatedSearches);
    else saveRecentSearches(updatedSearches);
  }, [writeThrough]);

  const updateSavedViews = useCallback((updatedViews) => {
    setSavedViews(updatedViews);
    if (isSupabaseBackend) writeThrough('savedViews', updatedViews);
    else saveSavedViews(updatedViews);
  }, [writeThrough]);

  const updateRecentlyViewed = useCallback((updatedItems) => {
    setRecentlyViewed(updatedItems);
    if (isSupabaseBackend) writeThrough('recentlyViewed', updatedItems);
    else saveRecentlyViewed(updatedItems);
  }, [writeThrough]);

  const updateAutomationRules = useCallback((updatedRules) => {
    setAutomationRules(updatedRules);
    if (isSupabaseBackend) writeThrough('automationRules', updatedRules);
    else saveAutomationRules(updatedRules);
  }, [writeThrough]);

  const updateAutomationTemplates = useCallback((updatedTemplates) => {
    setAutomationTemplates(updatedTemplates);
    if (isSupabaseBackend) writeThrough('automationTemplates', updatedTemplates);
    else saveAutomationTemplates(updatedTemplates);
  }, [writeThrough]);

  const updateExecutionLog = useCallback((updatedLog) => {
    setExecutionLog(updatedLog);
    if (isSupabaseBackend) writeThrough('executionLog', updatedLog);
    else saveExecutionLog(updatedLog);
  }, [writeThrough]);

  const updateScheduledActions = useCallback((updatedActions) => {
    setScheduledActions(updatedActions);
    if (isSupabaseBackend) writeThrough('scheduledActions', updatedActions);
    else saveScheduledActions(updatedActions);
  }, [writeThrough]);

  const updateNotificationAlerts = useCallback((updatedAlerts) => {
    setNotificationAlerts(updatedAlerts);
    if (isSupabaseBackend) writeThrough('notificationAlerts', updatedAlerts);
    else saveNotificationAlerts(updatedAlerts);
  }, [writeThrough]);

  const updateNotifAlertConfig = useCallback((updatedConfig) => {
    setNotifAlertConfig(updatedConfig);
    if (isSupabaseBackend) writeThrough('notifAlertConfig', updatedConfig);
    else saveNotifAlertConfig(updatedConfig);
  }, [writeThrough]);

  const updateNotificationLog = useCallback((updatedLog) => {
    setNotificationLog(updatedLog);
    if (isSupabaseBackend) writeThrough('notificationLog', updatedLog);
    else saveNotificationLog(updatedLog);
  }, [writeThrough]);

  const updateToastPreferences = useCallback((updatedPrefs) => {
    setToastPreferences(updatedPrefs);
    if (isSupabaseBackend) writeThrough('toastPreferences', updatedPrefs);
    else saveToastPreferences(updatedPrefs);
  }, [writeThrough]);

  const updateHelpArticles = useCallback((updatedArticles) => {
    setHelpArticles(updatedArticles);
    if (isSupabaseBackend) writeThrough('helpArticles', updatedArticles);
    else saveHelpArticles(updatedArticles);
  }, [writeThrough]);

  const updateOnboardingState = useCallback((updatedState) => {
    setOnboardingState(updatedState);
    if (isSupabaseBackend) writeThrough('onboardingState', updatedState);
    else saveOnboardingState(updatedState);
  }, [writeThrough]);

  const updateTourState = useCallback((updatedState) => {
    setTourState(updatedState);
    if (isSupabaseBackend) writeThrough('tourState', updatedState);
    else saveTourState(updatedState);
  }, [writeThrough]);

  const updateArticleVotes = useCallback((updatedVotes) => {
    setArticleVotes(updatedVotes);
    if (isSupabaseBackend) writeThrough('articleVotes', updatedVotes);
    else saveArticleVotes(updatedVotes);
  }, [writeThrough]);

  // Additive per-domain `load*`/`retry*` actions generated from the registry.
  const domainActions = useMemo(() => {
    const actions = {};
    for (const name of CONTEXT_DOMAINS) {
      const cap = name.charAt(0).toUpperCase() + name.slice(1);
      actions[`load${cap}`] = (opts) => loadDomain(name, opts);
      actions[`retry${cap}`] = (opts) => retryDomain(name, opts);
    }
    return actions;
  }, [loadDomain, retryDomain]);

  // Hydrate every domain from the Data_Layer once on mount when the flag is ON.
  // When the flag is OFF this effect is a no-op and the synchronous state stands
  // (legacy behavior unchanged, Req 9.1).
  useEffect(() => {
    if (!isSupabaseBackend) return;
    Promise.all(CONTEXT_DOMAINS.map((name) => loadDomain(name))).catch(() => {
      // Per-domain failures are captured on each slice; nothing to do globally.
    });
  }, [loadDomain]);

  // NOTE: This useMemo has 90+ dependencies covering every state slice and updater.
  // It effectively recomputes on every state change, providing minimal memoization benefit.
  // This is intentional scaffolding for a future context-splitting refactor where individual
  // domain slices will be moved into separate providers, at which point each useMemo will
  // have a smaller, meaningful dependency set.
  const value = useMemo(() => ({
    nurses,
    facilities,
    cohorts,
    referrers,
    communityChannels,
    events,
    outreachTemplates,
    placements,
    settings,
    documents,
    documentTemplates,
    verificationQueue,
    communications,
    notifications,
    commEmailTemplates,
    alertRules,
    alertHistory,
    notificationPreferences,
    scheduledReports,
    exportHistory,
    dashboardLayouts,
    activeDashboardLayout,
    integrations,
    apiEndpoints,
    apiKeys,
    webhooks,
    webhookDeliveryLog,
    syncStatus,
    activityFeed,
    auditLog,
    userSessions,
    changeHistory,
    recentSearches,
    savedViews,
    recentlyViewed,
    automationRules,
    automationTemplates,
    executionLog,
    scheduledActions,
    notificationAlerts,
    notifAlertConfig,
    notificationLog,
    toastPreferences,
    helpArticles,
    onboardingState,
    tourState,
    articleVotes,
    updateNurses,
    updateFacilities,
    updateCohorts,
    updateReferrers,
    updateCommunityChannels,
    updateEvents,
    updateOutreachTemplates,
    updatePlacements,
    updateSettings,
    updateDocuments,
    updateDocumentTemplates,
    updateVerificationQueue,
    updateCommunications,
    updateNotifications,
    updateCommEmailTemplates,
    updateAlertRules,
    updateAlertHistory,
    updateNotificationPreferences,
    updateScheduledReports,
    updateExportHistory,
    updateDashboardLayouts,
    updateActiveDashboardLayout,
    updateIntegrations,
    updateApiEndpoints,
    updateApiKeys,
    updateWebhooks,
    updateWebhookDeliveryLog,
    updateSyncStatus,
    updateActivityFeed,
    updateAuditLog,
    updateUserSessions,
    updateChangeHistory,
    updateRecentSearches,
    updateSavedViews,
    updateRecentlyViewed,
    updateAutomationRules,
    updateAutomationTemplates,
    updateExecutionLog,
    updateScheduledActions,
    updateNotificationAlerts,
    updateNotifAlertConfig,
    updateNotificationLog,
    updateToastPreferences,
    updateHelpArticles,
    updateOnboardingState,
    updateTourState,
    updateArticleVotes,
    toasts,
    addToast,
    dismissToast,
    // Additive async data-layer surface (Task 9). Extra keys only.
    slices,
    loadDomain,
    retryDomain,
    ...domainActions,
  }), [
    nurses,
    facilities,
    cohorts,
    referrers,
    communityChannels,
    events,
    outreachTemplates,
    placements,
    settings,
    documents,
    documentTemplates,
    verificationQueue,
    communications,
    notifications,
    commEmailTemplates,
    alertRules,
    alertHistory,
    notificationPreferences,
    scheduledReports,
    exportHistory,
    dashboardLayouts,
    activeDashboardLayout,
    integrations,
    apiEndpoints,
    apiKeys,
    webhooks,
    webhookDeliveryLog,
    syncStatus,
    activityFeed,
    auditLog,
    userSessions,
    changeHistory,
    recentSearches,
    savedViews,
    recentlyViewed,
    automationRules,
    automationTemplates,
    executionLog,
    scheduledActions,
    notificationAlerts,
    notifAlertConfig,
    notificationLog,
    toastPreferences,
    helpArticles,
    onboardingState,
    tourState,
    articleVotes,
    updateNurses,
    updateFacilities,
    updateCohorts,
    updateReferrers,
    updateCommunityChannels,
    updateEvents,
    updateOutreachTemplates,
    updatePlacements,
    updateSettings,
    updateDocuments,
    updateDocumentTemplates,
    updateVerificationQueue,
    updateCommunications,
    updateNotifications,
    updateCommEmailTemplates,
    updateAlertRules,
    updateAlertHistory,
    updateNotificationPreferences,
    updateScheduledReports,
    updateExportHistory,
    updateDashboardLayouts,
    updateActiveDashboardLayout,
    updateIntegrations,
    updateApiEndpoints,
    updateApiKeys,
    updateWebhooks,
    updateWebhookDeliveryLog,
    updateSyncStatus,
    updateActivityFeed,
    updateAuditLog,
    updateUserSessions,
    updateChangeHistory,
    updateRecentSearches,
    updateSavedViews,
    updateRecentlyViewed,
    updateAutomationRules,
    updateAutomationTemplates,
    updateExecutionLog,
    updateScheduledActions,
    updateNotificationAlerts,
    updateNotifAlertConfig,
    updateNotificationLog,
    updateToastPreferences,
    updateHelpArticles,
    updateOnboardingState,
    updateTourState,
    updateArticleVotes,
    toasts,
    addToast,
    dismissToast,
    slices,
    loadDomain,
    retryDomain,
    domainActions,
  ]);

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppContext() {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
}

export default AppContext;
