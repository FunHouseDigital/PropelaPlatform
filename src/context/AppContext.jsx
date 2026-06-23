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
 */

import { createContext, useContext, useState, useCallback, useRef } from 'react';
import {
  getNurses,
  saveNurses,
  getFacilities,
  saveFacilities,
  getCohorts,
  saveCohorts,
  getReferrers,
  saveReferrers,
  getCommunityChannels,
  saveCommunityChannels,
  getEvents,
  saveEvents,
  getOutreachTemplates,
  saveOutreachTemplates,
  getPlacements,
  savePlacements,
  getSettings,
  saveSettings,
  getDocuments,
  saveDocuments,
  getDocumentTemplates,
  saveDocumentTemplates,
  getVerificationQueue,
  saveVerificationQueue,
  getCommunications,
  saveCommunications,
  getNotifications,
  saveNotifications,
  getCommEmailTemplates,
  saveCommEmailTemplates,
  getAlertRules,
  saveAlertRules,
  getAlertHistory,
  saveAlertHistory,
  getNotificationPreferences,
  saveNotificationPreferences,
  getScheduledReports,
  saveScheduledReports,
  getExportHistory,
  saveExportHistory,
  getDashboardLayouts,
  saveDashboardLayouts,
  getActiveDashboardLayout,
  saveActiveDashboardLayout,
  getIntegrations,
  saveIntegrations,
  getApiEndpoints,
  saveApiEndpoints,
  getApiKeys,
  saveApiKeys,
  getWebhooks,
  saveWebhooks,
  getWebhookDeliveryLog,
  saveWebhookDeliveryLog,
  getSyncStatus,
  saveSyncStatus,
  getActivityFeed,
  saveActivityFeed,
  getAuditLog,
  saveAuditLog,
  getUserSessions,
  saveUserSessions,
  getChangeHistory,
  saveChangeHistory,
  getRecentSearches,
  saveRecentSearches,
  getSavedViews,
  saveSavedViews,
  getRecentlyViewed,
  saveRecentlyViewed,
  getAutomationRules,
  saveAutomationRules,
  getAutomationTemplates,
  saveAutomationTemplates,
  getExecutionLog,
  saveExecutionLog,
  getScheduledActions,
  saveScheduledActions,
  getNotificationAlerts,
  saveNotificationAlerts,
  getNotifAlertConfig,
  saveNotifAlertConfig,
  getNotificationLog,
  saveNotificationLog,
  getToastPreferences,
  saveToastPreferences,
  getHelpArticles,
  saveHelpArticles,
  getOnboardingState,
  saveOnboardingState,
  getTourState,
  saveTourState,
  getArticleVotes,
  saveArticleVotes,
} from '../lib/storage';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [nurses, setNurses] = useState(() => getNurses());
  const [facilities, setFacilities] = useState(() => getFacilities());
  const [cohorts, setCohorts] = useState(() => getCohorts());
  const [referrers, setReferrers] = useState(() => getReferrers());
  const [communityChannels, setCommunityChannels] = useState(() => getCommunityChannels());
  const [events, setEvents] = useState(() => getEvents());
  const [outreachTemplates, setOutreachTemplates] = useState(() => getOutreachTemplates());
  const [placements, setPlacements] = useState(() => getPlacements());
  const [settings, setSettings] = useState(() => getSettings());
  const [documents, setDocuments] = useState(() => getDocuments());
  const [documentTemplates, setDocumentTemplates] = useState(() => getDocumentTemplates());
  const [verificationQueue, setVerificationQueue] = useState(() => getVerificationQueue());
  const [communications, setCommunications] = useState(() => getCommunications());
  const [notifications, setNotifications] = useState(() => getNotifications());
  const [commEmailTemplates, setCommEmailTemplates] = useState(() => getCommEmailTemplates());
  const [alertRules, setAlertRules] = useState(() => getAlertRules());
  const [alertHistory, setAlertHistory] = useState(() => getAlertHistory());
  const [notificationPreferences, setNotificationPreferences] = useState(() => getNotificationPreferences());
  const [scheduledReports, setScheduledReports] = useState(() => getScheduledReports());
  const [exportHistory, setExportHistory] = useState(() => getExportHistory());
  const [dashboardLayouts, setDashboardLayouts] = useState(() => getDashboardLayouts());
  const [activeDashboardLayout, setActiveDashboardLayout] = useState(() => getActiveDashboardLayout());
  const [integrations, setIntegrations] = useState(() => getIntegrations());
  const [apiEndpoints, setApiEndpoints] = useState(() => getApiEndpoints());
  const [apiKeys, setApiKeys] = useState(() => getApiKeys());
  const [webhooks, setWebhooks] = useState(() => getWebhooks());
  const [webhookDeliveryLog, setWebhookDeliveryLog] = useState(() => getWebhookDeliveryLog());
  const [syncStatus, setSyncStatus] = useState(() => getSyncStatus());
  const [activityFeed, setActivityFeed] = useState(() => getActivityFeed());
  const [auditLog, setAuditLog] = useState(() => getAuditLog());
  const [userSessions, setUserSessions] = useState(() => getUserSessions());
  const [changeHistory, setChangeHistory] = useState(() => getChangeHistory());
  const [recentSearches, setRecentSearches] = useState(() => getRecentSearches());
  const [savedViews, setSavedViews] = useState(() => getSavedViews());
  const [recentlyViewed, setRecentlyViewed] = useState(() => getRecentlyViewed());
  const [automationRules, setAutomationRules] = useState(() => getAutomationRules());
  const [automationTemplates, setAutomationTemplates] = useState(() => getAutomationTemplates());
  const [executionLog, setExecutionLog] = useState(() => getExecutionLog());
  const [scheduledActions, setScheduledActions] = useState(() => getScheduledActions());
  const [notificationAlerts, setNotificationAlerts] = useState(() => getNotificationAlerts());
  const [notifAlertConfig, setNotifAlertConfig] = useState(() => getNotifAlertConfig());
  const [notificationLog, setNotificationLog] = useState(() => getNotificationLog());
  const [toastPreferences, setToastPreferences] = useState(() => getToastPreferences());
  const [helpArticles, setHelpArticles] = useState(() => getHelpArticles());
  const [onboardingState, setOnboardingState] = useState(() => getOnboardingState());
  const [tourState, setTourState] = useState(() => getTourState());
  const [articleVotes, setArticleVotes] = useState(() => getArticleVotes());
  const [toasts, setToasts] = useState([]);

  // Update functions that write through to localStorage
  const updateNurses = useCallback((updatedNurses) => {
    setNurses(updatedNurses);
    saveNurses(updatedNurses);
  }, []);

  const updateFacilities = useCallback((updatedFacilities) => {
    setFacilities(updatedFacilities);
    saveFacilities(updatedFacilities);
  }, []);

  const updateCohorts = useCallback((updatedCohorts) => {
    setCohorts(updatedCohorts);
    saveCohorts(updatedCohorts);
  }, []);

  const updateReferrers = useCallback((updatedReferrers) => {
    setReferrers(updatedReferrers);
    saveReferrers(updatedReferrers);
  }, []);

  const updateCommunityChannels = useCallback((updatedChannels) => {
    setCommunityChannels(updatedChannels);
    saveCommunityChannels(updatedChannels);
  }, []);

  const updateEvents = useCallback((updatedEvents) => {
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
  }, []);

  const updateOutreachTemplates = useCallback((updatedTemplates) => {
    setOutreachTemplates(updatedTemplates);
    saveOutreachTemplates(updatedTemplates);
  }, []);

  const updatePlacements = useCallback((updatedPlacements) => {
    setPlacements(updatedPlacements);
    savePlacements(updatedPlacements);
  }, []);

  const updateSettings = useCallback((updatedSettings) => {
    setSettings(updatedSettings);
    saveSettings(updatedSettings);
  }, []);

  const updateDocuments = useCallback((updatedDocuments) => {
    setDocuments(updatedDocuments);
    saveDocuments(updatedDocuments);
  }, []);

  const updateDocumentTemplates = useCallback((updatedTemplates) => {
    setDocumentTemplates(updatedTemplates);
    saveDocumentTemplates(updatedTemplates);
  }, []);

  const updateVerificationQueue = useCallback((updatedQueue) => {
    setVerificationQueue(updatedQueue);
    saveVerificationQueue(updatedQueue);
  }, []);

  const updateCommunications = useCallback((updatedCommunications) => {
    setCommunications(updatedCommunications);
    saveCommunications(updatedCommunications);
  }, []);

  const updateNotifications = useCallback((updatedNotifications) => {
    setNotifications(updatedNotifications);
    saveNotifications(updatedNotifications);
  }, []);

  const updateCommEmailTemplates = useCallback((updatedTemplates) => {
    setCommEmailTemplates(updatedTemplates);
    saveCommEmailTemplates(updatedTemplates);
  }, []);

  const updateAlertRules = useCallback((updatedRules) => {
    setAlertRules(updatedRules);
    saveAlertRules(updatedRules);
  }, []);

  const updateAlertHistory = useCallback((updatedHistory) => {
    setAlertHistory(updatedHistory);
    saveAlertHistory(updatedHistory);
  }, []);

  const updateNotificationPreferences = useCallback((updatedPreferences) => {
    setNotificationPreferences(updatedPreferences);
    saveNotificationPreferences(updatedPreferences);
  }, []);

  const updateScheduledReports = useCallback((updatedReports) => {
    setScheduledReports(updatedReports);
    saveScheduledReports(updatedReports);
  }, []);

  const updateExportHistory = useCallback((updatedHistory) => {
    setExportHistory(updatedHistory);
    saveExportHistory(updatedHistory);
  }, []);

  const updateDashboardLayouts = useCallback((updatedLayouts) => {
    setDashboardLayouts(updatedLayouts);
    saveDashboardLayouts(updatedLayouts);
  }, []);

  const updateActiveDashboardLayout = useCallback((updatedLayout) => {
    setActiveDashboardLayout(updatedLayout);
    saveActiveDashboardLayout(updatedLayout);
  }, []);

  const updateIntegrations = useCallback((updatedIntegrations) => {
    setIntegrations(updatedIntegrations);
    saveIntegrations(updatedIntegrations);
  }, []);

  const updateApiEndpoints = useCallback((updatedEndpoints) => {
    setApiEndpoints(updatedEndpoints);
    saveApiEndpoints(updatedEndpoints);
  }, []);

  const updateApiKeys = useCallback((updatedKeys) => {
    setApiKeys(updatedKeys);
    saveApiKeys(updatedKeys);
  }, []);

  const updateWebhooks = useCallback((updatedWebhooks) => {
    setWebhooks(updatedWebhooks);
    saveWebhooks(updatedWebhooks);
  }, []);

  const updateWebhookDeliveryLog = useCallback((updatedLog) => {
    setWebhookDeliveryLog(updatedLog);
    saveWebhookDeliveryLog(updatedLog);
  }, []);

  const updateSyncStatus = useCallback((updatedStatus) => {
    setSyncStatus(updatedStatus);
    saveSyncStatus(updatedStatus);
  }, []);

  const updateActivityFeed = useCallback((updatedFeed) => {
    setActivityFeed(updatedFeed);
    saveActivityFeed(updatedFeed);
  }, []);

  const updateAuditLog = useCallback((updatedLog) => {
    setAuditLog(updatedLog);
    saveAuditLog(updatedLog);
  }, []);

  const updateUserSessions = useCallback((updatedSessions) => {
    setUserSessions(updatedSessions);
    saveUserSessions(updatedSessions);
  }, []);

  const updateChangeHistory = useCallback((updatedHistoryOrFn) => {
    if (typeof updatedHistoryOrFn === 'function') {
      setChangeHistory((prev) => {
        const next = updatedHistoryOrFn(prev);
        saveChangeHistory(next);
        return next;
      });
    } else {
      setChangeHistory(updatedHistoryOrFn);
      saveChangeHistory(updatedHistoryOrFn);
    }
  }, []);

  const updateRecentSearches = useCallback((updatedSearches) => {
    setRecentSearches(updatedSearches);
    saveRecentSearches(updatedSearches);
  }, []);

  const updateSavedViews = useCallback((updatedViews) => {
    setSavedViews(updatedViews);
    saveSavedViews(updatedViews);
  }, []);

  const updateRecentlyViewed = useCallback((updatedItems) => {
    setRecentlyViewed(updatedItems);
    saveRecentlyViewed(updatedItems);
  }, []);

  const updateAutomationRules = useCallback((updatedRules) => {
    setAutomationRules(updatedRules);
    saveAutomationRules(updatedRules);
  }, []);

  const updateAutomationTemplates = useCallback((updatedTemplates) => {
    setAutomationTemplates(updatedTemplates);
    saveAutomationTemplates(updatedTemplates);
  }, []);

  const updateExecutionLog = useCallback((updatedLog) => {
    setExecutionLog(updatedLog);
    saveExecutionLog(updatedLog);
  }, []);

  const updateScheduledActions = useCallback((updatedActions) => {
    setScheduledActions(updatedActions);
    saveScheduledActions(updatedActions);
  }, []);

  const updateNotificationAlerts = useCallback((updatedAlerts) => {
    setNotificationAlerts(updatedAlerts);
    saveNotificationAlerts(updatedAlerts);
  }, []);

  const updateNotifAlertConfig = useCallback((updatedConfig) => {
    setNotifAlertConfig(updatedConfig);
    saveNotifAlertConfig(updatedConfig);
  }, []);

  const updateNotificationLog = useCallback((updatedLog) => {
    setNotificationLog(updatedLog);
    saveNotificationLog(updatedLog);
  }, []);

  const updateToastPreferences = useCallback((updatedPrefs) => {
    setToastPreferences(updatedPrefs);
    saveToastPreferences(updatedPrefs);
  }, []);

  const updateHelpArticles = useCallback((updatedArticles) => {
    setHelpArticles(updatedArticles);
    saveHelpArticles(updatedArticles);
  }, []);

  const updateOnboardingState = useCallback((updatedState) => {
    setOnboardingState(updatedState);
    saveOnboardingState(updatedState);
  }, []);

  const updateTourState = useCallback((updatedState) => {
    setTourState(updatedState);
    saveTourState(updatedState);
  }, []);

  const updateArticleVotes = useCallback((updatedVotes) => {
    setArticleVotes(updatedVotes);
    saveArticleVotes(updatedVotes);
  }, []);

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

  const value = {
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
  };

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
