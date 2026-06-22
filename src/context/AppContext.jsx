import { createContext, useContext, useState, useEffect, useCallback } from 'react';
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

  const updateChangeHistory = useCallback((updatedHistory) => {
    setChangeHistory(updatedHistory);
    saveChangeHistory(updatedHistory);
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
