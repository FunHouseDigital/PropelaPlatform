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
