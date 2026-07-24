import { seedCommunityChannels, seedEvents,seedReferrers } from '../data/seedAcquisition';
import { seedAuditTrail } from '../data/seedAuditTrail';
import { seedAutomations } from '../data/seedAutomations';
import { seedCohorts } from '../data/seedCohorts';
import { seedCommunications } from '../data/seedCommunications';
import { seedDocuments } from '../data/seedDocuments';
import { seedFacilities } from '../data/seedFacilities';
import { seedHelp } from '../data/seedHelp';
import { seedIntegrations } from '../data/seedIntegrations';
import { seedNotifications as seedNotificationsModule } from '../data/seedNotifications';
import { seedNurses } from '../data/seedNurses';
import { seedOutreachTemplates } from '../data/seedOutreach';
import { seedPlacements } from '../data/seedPlacements';
import { seedReports } from '../data/seedReports';
import { seedSettings } from '../data/seedSettings';
import {
  clearSession,
  getSession,
  migrateLegacyAuthSession,
  rotateSessionStoreMirror,
  setSession,
} from './sessionStore';
import { rotateStorageKeys,STORAGE_PREFIX } from './storageKeys';

/**
 * App-wide localStorage key prefix. Fix #10: the versioned prefix
 * ('propela_ops_v2_') and the legacy-prefix list now live in the single shared
 * module `storageKeys.js`; this file no longer hardcodes the literal. getData /
 * setData / removeData keep identical (key) signatures — only the physical
 * prefix they prepend changed. Logical key names ('nurses', 'loginThrottle', …)
 * and all stored shapes/values are UNCHANGED.
 */

/**
 * Get data from localStorage by key.
 */
export function getData(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading localStorage key "${key}":`, e);
    return null;
  }
}

/**
 * Set data in localStorage by key.
 */
export function setData(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing localStorage key "${key}":`, e);
  }
}

/**
 * Remove data from localStorage by key.
 */
export function removeData(key) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch (e) {
    console.error(`Error removing localStorage key "${key}":`, e);
  }
}

/**
 * Initialize data on first load.
 * Seeds nurse and facility data if no data exists.
 */
export function initializeData() {
  // Fix #9: one-time migration of any legacy auth session out of the higher-risk
  // localStorage and into the in-memory + sessionStorage session store. Runs
  // FIRST so any auth token in localStorage (under the current OR a legacy
  // prefix) is moved to the session store BEFORE the generic localStorage
  // rotation below runs — otherwise the bulk rotation would simply re-prefix an
  // identity token that must never live in localStorage. Safe/idempotent when
  // there is nothing to migrate. Note: AuthProvider seeds currentUser via
  // getAuthSession() during its initial render, which also triggers this
  // migration lazily — calling it here as well guarantees the localStorage key
  // is purged even if that render path is skipped.
  migrateLegacyAuthSession();

  // Fix #10: one-time, idempotent prefix rotation across BOTH storage surfaces.
  // Enumerate every key under a legacy prefix and move it into the current
  // versioned namespace (copy-if-absent, then delete the legacy key) so no key
  // is left behind under the stale prefix. Generic enumeration — does NOT rely
  // on the seed list below — so helper-only keys rotate too. Never throws.
  //   • localStorage: all bulk app data + the Fix #8 loginThrottle counters (an
  //     active lockout therefore survives the upgrade, and stays in localStorage
  //     so it also survives tab close per Fix #8).
  //   • sessionStorage: the Fix #9 auth-session mirror (rotated via sessionStore
  //     so a currently-signed-in user stays signed in across the upgrade within
  //     the same tab). The auth-session path keeps flowing through sessionStore.
  rotateStorageKeys(typeof localStorage !== 'undefined' ? localStorage : null);
  rotateSessionStoreMirror();

  const nurses = getData('nurses');
  if (!nurses || nurses.length === 0) {
    const seededNurses = seedNurses();
    setData('nurses', seededNurses);
  }

  const facilities = getData('facilities');
  if (!facilities || facilities.length === 0) {
    const seededFacilities = seedFacilities();
    setData('facilities', seededFacilities);
  }

  const cohorts = getData('cohorts');
  if (!cohorts || cohorts.length === 0) {
    const seededCohorts = seedCohorts();
    setData('cohorts', seededCohorts);
  }

  const referrers = getData('referrers');
  if (!referrers || referrers.length === 0) {
    const seededReferrers = seedReferrers();
    setData('referrers', seededReferrers);
  }

  const communityChannels = getData('communityChannels');
  if (!communityChannels || communityChannels.length === 0) {
    const seededChannels = seedCommunityChannels();
    setData('communityChannels', seededChannels);
  }

  const events = getData('events');
  if (!events || events.length === 0) {
    const seededEvents = seedEvents();
    setData('events', seededEvents);
  }

  const outreachTemplates = getData('outreachTemplates');
  if (!outreachTemplates || outreachTemplates.length === 0) {
    const seededTemplates = seedOutreachTemplates();
    setData('outreachTemplates', seededTemplates);
  }

  const placements = getData('placements');
  if (!placements || placements.length === 0) {
    const seededPlacements = seedPlacements();
    setData('placements', seededPlacements);
  }

  const settings = getData('settings');
  if (!settings) {
    const seededSettings = seedSettings();
    setData('settings', seededSettings);
  }

  const documents = getData('documents');
  if (!documents || documents.length === 0) {
    const seededDocs = seedDocuments();
    setData('documents', seededDocs.documents);
    setData('documentTemplates', seededDocs.templates);
    setData('verificationQueue', seededDocs.verificationQueue);
  }

  const communications = getData('communications');
  if (!communications || communications.length === 0) {
    const seededComms = seedCommunications();
    setData('communications', seededComms.communications);
    setData('notifications', seededComms.notifications);
    setData('commEmailTemplates', seededComms.emailTemplates);
    setData('alertRules', seededComms.alertRules);
    setData('alertHistory', seededComms.alertHistory);
  }

  const scheduledReports = getData('scheduledReports');
  if (!scheduledReports || scheduledReports.length === 0) {
    const seededReports = seedReports();
    setData('scheduledReports', seededReports.scheduledReports);
    setData('exportHistory', seededReports.exportHistory);
    setData('dashboardLayouts', seededReports.dashboardLayouts);
    // Store the full layout object for consistency (not just the ID string)
    setData('activeDashboardLayout', seededReports.dashboardLayouts[0] || null);
  }

  const activityFeed = getData('activityFeed');
  const auditLog = getData('auditLog');
  const userSessions = getData('userSessions');
  const changeHistoryData = getData('changeHistory');
  if (
    !activityFeed ||
    activityFeed.length === 0 ||
    !auditLog ||
    auditLog.length === 0 ||
    !userSessions ||
    userSessions.length === 0 ||
    !changeHistoryData ||
    changeHistoryData.length === 0
  ) {
    const seededAudit = seedAuditTrail();
    setData('activityFeed', seededAudit.activityFeed);
    setData('auditLog', seededAudit.auditLog);
    setData('userSessions', seededAudit.userSessions);
    setData('changeHistory', seededAudit.changeHistory);
  }

  const integrations = getData('integrations');
  if (!integrations || integrations.length === 0) {
    const seededIntegrations = seedIntegrations();
    setData('integrations', seededIntegrations.integrations);
    setData('apiEndpoints', seededIntegrations.apiEndpoints);
    setData('apiKeys', seededIntegrations.apiKeys);
    setData('webhooks', seededIntegrations.webhooks);
    setData('webhookDeliveryLog', seededIntegrations.webhookDeliveryLog);
    setData('syncStatus', seededIntegrations.syncStatus);
  } else {
    // Re-seed any individually missing integration keys
    const seededIntegrations = seedIntegrations();
    if (!getData('apiEndpoints')) setData('apiEndpoints', seededIntegrations.apiEndpoints);
    if (!getData('apiKeys')) setData('apiKeys', seededIntegrations.apiKeys);
    if (!getData('webhooks')) setData('webhooks', seededIntegrations.webhooks);
    if (!getData('webhookDeliveryLog'))
      setData('webhookDeliveryLog', seededIntegrations.webhookDeliveryLog);
    if (!getData('syncStatus')) setData('syncStatus', seededIntegrations.syncStatus);
  }

  const automationRules = getData('automationRules');
  if (!automationRules || automationRules.length === 0) {
    const seededAutomations = seedAutomations();
    setData('automationRules', seededAutomations.automationRules);
    setData('automationTemplates', seededAutomations.automationTemplates);
    setData('executionLog', seededAutomations.executionLog);
    setData('scheduledActions', seededAutomations.scheduledActions);
  }

  const notificationAlerts = getData('notificationAlerts');
  if (!notificationAlerts || notificationAlerts.length === 0) {
    const seededNotifs = seedNotificationsModule();
    setData('notificationAlerts', seededNotifs.notificationAlerts);
    setData('notifAlertConfig', seededNotifs.notifAlertConfig);
    setData('notificationLog', seededNotifs.notificationLog);
    setData('toastPreferences', seededNotifs.toastPreferences);
  }

  const helpArticlesData = getData('helpArticles');
  if (!helpArticlesData || helpArticlesData.length === 0) {
    const seededHelp = seedHelp();
    setData('helpArticles', seededHelp.helpArticles);
    setData('onboardingSteps', seededHelp.onboardingSteps);
    setData('featureTours', seededHelp.featureTours);
  }

  if (!getData('onboardingState')) {
    setData('onboardingState', {
      currentStep: 0,
      completedSteps: [],
      isComplete: false,
      skipped: false,
      role: '',
      preferences: {
        emailNotifications: true,
        desktopNotifications: false,
        weeklyDigest: true,
        compactLayout: false,
      },
    });
  }

  if (!getData('tourState')) {
    setData('tourState', {
      completedTours: [],
      currentTourId: null,
      currentTourStep: 0,
    });
  }

  if (!getData('articleVotes')) {
    setData('articleVotes', {});
  }
}

/**
 * Get all nurses from localStorage.
 */
export function getNurses() {
  return getData('nurses') || [];
}

/**
 * Save all nurses to localStorage.
 */
export function saveNurses(nurses) {
  setData('nurses', nurses);
}

/**
 * Get all facilities from localStorage.
 */
export function getFacilities() {
  return getData('facilities') || [];
}

/**
 * Save all facilities to localStorage.
 */
export function saveFacilities(facilities) {
  setData('facilities', facilities);
}

/**
 * Get all cohorts from localStorage.
 */
export function getCohorts() {
  return getData('cohorts') || [];
}

/**
 * Save all cohorts to localStorage.
 */
export function saveCohorts(cohorts) {
  setData('cohorts', cohorts);
}

/**
 * Get all referrers from localStorage.
 */
export function getReferrers() {
  return getData('referrers') || [];
}

/**
 * Save all referrers to localStorage.
 */
export function saveReferrers(referrers) {
  setData('referrers', referrers);
}

/**
 * Get all community channels from localStorage.
 */
export function getCommunityChannels() {
  return getData('communityChannels') || [];
}

/**
 * Save all community channels to localStorage.
 */
export function saveCommunityChannels(channels) {
  setData('communityChannels', channels);
}

/**
 * Get all events from localStorage.
 */
export function getEvents() {
  return getData('events') || [];
}

/**
 * Save all events to localStorage.
 */
export function saveEvents(events) {
  setData('events', events);
}

/**
 * Get all outreach templates from localStorage.
 */
export function getOutreachTemplates() {
  return getData('outreachTemplates') || [];
}

/**
 * Save all outreach templates to localStorage.
 */
export function saveOutreachTemplates(templates) {
  setData('outreachTemplates', templates);
}

/**
 * Get all placements from localStorage.
 */
export function getPlacements() {
  return getData('placements') || [];
}

/**
 * Save all placements to localStorage.
 */
export function savePlacements(placements) {
  setData('placements', placements);
}

/**
 * Get all report templates from localStorage.
 */
export function getReportTemplates() {
  return getData('reportTemplates') || [];
}

/**
 * Save all report templates to localStorage.
 */
export function saveReportTemplates(templates) {
  setData('reportTemplates', templates);
}

/**
 * Get settings from localStorage.
 */
export function getSettings() {
  return getData('settings') || seedSettings();
}

/**
 * Save settings to localStorage.
 */
export function saveSettings(settings) {
  setData('settings', settings);
}

/**
 * Get all documents from localStorage.
 */
export function getDocuments() {
  return getData('documents') || [];
}

/**
 * Save all documents to localStorage.
 */
export function saveDocuments(documents) {
  setData('documents', documents);
}

/**
 * Get all document templates from localStorage.
 */
export function getDocumentTemplates() {
  return getData('documentTemplates') || [];
}

/**
 * Save all document templates to localStorage.
 */
export function saveDocumentTemplates(templates) {
  setData('documentTemplates', templates);
}

/**
 * Get all verification queue items from localStorage.
 */
export function getVerificationQueue() {
  return getData('verificationQueue') || [];
}

/**
 * Save all verification queue items to localStorage.
 */
export function saveVerificationQueue(queue) {
  setData('verificationQueue', queue);
}

/**
 * Get all communications from localStorage.
 */
export function getCommunications() {
  return getData('communications') || [];
}

/**
 * Save all communications to localStorage.
 */
export function saveCommunications(communications) {
  setData('communications', communications);
}

/**
 * Get all notifications from localStorage.
 */
export function getNotifications() {
  return getData('notifications') || [];
}

/**
 * Save all notifications to localStorage.
 */
export function saveNotifications(notifications) {
  setData('notifications', notifications);
}

/**
 * Get all communication email templates from localStorage.
 */
export function getCommEmailTemplates() {
  return getData('commEmailTemplates') || [];
}

/**
 * Save all communication email templates to localStorage.
 */
export function saveCommEmailTemplates(templates) {
  setData('commEmailTemplates', templates);
}

/**
 * Get all alert rules from localStorage.
 */
export function getAlertRules() {
  return getData('alertRules') || [];
}

/**
 * Save all alert rules to localStorage.
 */
export function saveAlertRules(rules) {
  setData('alertRules', rules);
}

/**
 * Get all alert history from localStorage.
 */
export function getAlertHistory() {
  return getData('alertHistory') || [];
}

/**
 * Save all alert history to localStorage.
 */
export function saveAlertHistory(history) {
  setData('alertHistory', history);
}

/**
 * Get notification preferences from localStorage.
 */
export function getNotificationPreferences() {
  return (
    getData('notificationPreferences') || {
      document_expiry: true,
      compliance_alert: true,
      pipeline_change: true,
      placement_update: true,
    }
  );
}

/**
 * Save notification preferences to localStorage.
 */
export function saveNotificationPreferences(preferences) {
  setData('notificationPreferences', preferences);
}

/**
 * Get all scheduled reports from localStorage.
 */
export function getScheduledReports() {
  return getData('scheduledReports') || [];
}

/**
 * Save all scheduled reports to localStorage.
 */
export function saveScheduledReports(reports) {
  setData('scheduledReports', reports);
}

/**
 * Get all export history from localStorage.
 */
export function getExportHistory() {
  return getData('exportHistory') || [];
}

/**
 * Save all export history to localStorage.
 */
export function saveExportHistory(history) {
  setData('exportHistory', history);
}

/**
 * Get all dashboard layouts from localStorage.
 */
export function getDashboardLayouts() {
  return getData('dashboardLayouts') || [];
}

/**
 * Save all dashboard layouts to localStorage.
 */
export function saveDashboardLayouts(layouts) {
  setData('dashboardLayouts', layouts);
}

/**
 * Get active dashboard layout from localStorage.
 * Returns a full layout object (with id, name, widgets).
 */
export function getActiveDashboardLayout() {
  return getData('activeDashboardLayout') || null;
}

/**
 * Save active dashboard layout to localStorage.
 * Accepts a full layout object (with id, name, widgets).
 */
export function saveActiveDashboardLayout(layout) {
  setData('activeDashboardLayout', layout);
}

/**
 * Get all integrations from localStorage.
 */
export function getIntegrations() {
  return getData('integrations') || [];
}

/**
 * Save all integrations to localStorage.
 */
export function saveIntegrations(integrations) {
  setData('integrations', integrations);
}

/**
 * Get all API endpoints from localStorage.
 */
export function getApiEndpoints() {
  return getData('apiEndpoints') || [];
}

/**
 * Save all API endpoints to localStorage.
 */
export function saveApiEndpoints(endpoints) {
  setData('apiEndpoints', endpoints);
}

/**
 * Get all API keys from localStorage.
 */
export function getApiKeys() {
  return getData('apiKeys') || [];
}

/**
 * Save all API keys to localStorage.
 */
export function saveApiKeys(keys) {
  setData('apiKeys', keys);
}

/**
 * Get all webhooks from localStorage.
 */
export function getWebhooks() {
  return getData('webhooks') || [];
}

/**
 * Save all webhooks to localStorage.
 */
export function saveWebhooks(webhooks) {
  setData('webhooks', webhooks);
}

/**
 * Get all webhook delivery log entries from localStorage.
 */
export function getWebhookDeliveryLog() {
  return getData('webhookDeliveryLog') || [];
}

/**
 * Save all webhook delivery log entries to localStorage.
 */
export function saveWebhookDeliveryLog(log) {
  setData('webhookDeliveryLog', log);
}

/**
 * Get sync status from localStorage.
 */
export function getSyncStatus() {
  return getData('syncStatus') || {};
}

/**
 * Save sync status to localStorage.
 */
export function saveSyncStatus(status) {
  setData('syncStatus', status);
}

/**
 * Get activity feed from localStorage.
 */
export function getActivityFeed() {
  return getData('activityFeed') || [];
}

/**
 * Save activity feed to localStorage.
 */
export function saveActivityFeed(feed) {
  setData('activityFeed', feed);
}

/**
 * Get audit log from localStorage.
 */
export function getAuditLog() {
  return getData('auditLog') || [];
}

/**
 * Save audit log to localStorage.
 */
export function saveAuditLog(log) {
  setData('auditLog', log);
}

/**
 * Get user sessions from localStorage.
 */
export function getUserSessions() {
  return getData('userSessions') || [];
}

/**
 * Save user sessions to localStorage.
 */
export function saveUserSessions(sessions) {
  setData('userSessions', sessions);
}

/**
 * Get change history from localStorage.
 */
export function getChangeHistory() {
  return getData('changeHistory') || [];
}

/**
 * Save change history to localStorage.
 */
export function saveChangeHistory(history) {
  setData('changeHistory', history);
}

/**
 * Get recent searches from localStorage.
 */
export function getRecentSearches() {
  return getData('recentSearches') || [];
}

/**
 * Save recent searches to localStorage.
 */
export function saveRecentSearches(searches) {
  setData('recentSearches', searches);
}

/**
 * Get saved views from localStorage.
 */
export function getSavedViews() {
  return getData('savedViews') || [];
}

/**
 * Save saved views to localStorage.
 */
export function saveSavedViews(views) {
  setData('savedViews', views);
}

/**
 * Get recently viewed entities from localStorage.
 */
export function getRecentlyViewed() {
  return getData('recentlyViewed') || [];
}

/**
 * Save recently viewed entities to localStorage.
 */
export function saveRecentlyViewed(items) {
  setData('recentlyViewed', items);
}

/**
 * Get all automation rules from localStorage.
 */
export function getAutomationRules() {
  return getData('automationRules') || [];
}

/**
 * Save all automation rules to localStorage.
 */
export function saveAutomationRules(rules) {
  setData('automationRules', rules);
}

/**
 * Get all automation templates from localStorage.
 */
export function getAutomationTemplates() {
  return getData('automationTemplates') || [];
}

/**
 * Save all automation templates to localStorage.
 */
export function saveAutomationTemplates(templates) {
  setData('automationTemplates', templates);
}

/**
 * Get all execution log entries from localStorage.
 */
export function getExecutionLog() {
  return getData('executionLog') || [];
}

/**
 * Save all execution log entries to localStorage.
 */
export function saveExecutionLog(log) {
  setData('executionLog', log);
}

/**
 * Get all scheduled actions from localStorage.
 */
export function getScheduledActions() {
  return getData('scheduledActions') || [];
}

/**
 * Save all scheduled actions to localStorage.
 */
export function saveScheduledActions(actions) {
  setData('scheduledActions', actions);
}

/**
 * Get notification alerts (expanded inbox) from localStorage.
 */
export function getNotificationAlerts() {
  return getData('notificationAlerts') || [];
}

/**
 * Save notification alerts (expanded inbox) to localStorage.
 */
export function saveNotificationAlerts(alerts) {
  setData('notificationAlerts', alerts);
}

/**
 * Get notification alert configuration from localStorage.
 */
export function getNotifAlertConfig() {
  return (
    getData('notifAlertConfig') || {
      rules: [],
      quietHours: {
        enabled: false,
        startTime: '22:00',
        endTime: '07:00',
        timezone: 'Europe/London',
        exceptCritical: true,
      },
    }
  );
}

/**
 * Save notification alert configuration to localStorage.
 */
export function saveNotifAlertConfig(config) {
  setData('notifAlertConfig', config);
}

/**
 * Get notification log (history) from localStorage.
 */
export function getNotificationLog() {
  return getData('notificationLog') || [];
}

/**
 * Save notification log (history) to localStorage.
 */
export function saveNotificationLog(log) {
  setData('notificationLog', log);
}

/**
 * Get toast preferences from localStorage.
 */
export function getToastPreferences() {
  return (
    getData('toastPreferences') || {
      enabled: true,
      duration: 5000,
      maxVisible: 3,
      position: 'top-right',
      showForCategories: [],
      playSoundOnCritical: true,
    }
  );
}

/**
 * Save toast preferences to localStorage.
 */
export function saveToastPreferences(prefs) {
  setData('toastPreferences', prefs);
}

/**
 * Get help articles from localStorage.
 */
export function getHelpArticles() {
  return getData('helpArticles') || [];
}

/**
 * Save help articles to localStorage.
 */
export function saveHelpArticles(articles) {
  setData('helpArticles', articles);
}

/**
 * Get onboarding state from localStorage.
 */
export function getOnboardingState() {
  return (
    getData('onboardingState') || {
      currentStep: 0,
      completedSteps: [],
      isComplete: false,
      skipped: false,
      role: '',
      preferences: {
        emailNotifications: true,
        desktopNotifications: false,
        weeklyDigest: true,
        compactLayout: false,
      },
    }
  );
}

/**
 * Save onboarding state to localStorage.
 */
export function saveOnboardingState(state) {
  setData('onboardingState', state);
}

/**
 * Get tour state from localStorage.
 */
export function getTourState() {
  return (
    getData('tourState') || {
      completedTours: [],
      currentTourId: null,
      currentTourStep: 0,
    }
  );
}

/**
 * Save tour state to localStorage.
 */
export function saveTourState(state) {
  setData('tourState', state);
}

/**
 * Get article votes from localStorage.
 */
export function getArticleVotes() {
  return getData('articleVotes') || {};
}

/**
 * Save article votes to localStorage.
 */
export function saveArticleVotes(votes) {
  setData('articleVotes', votes);
}

/**
 * Get the current auth session (signed-in user's identity), or null when signed
 * out.
 *
 * Fix #9: the session no longer lives in localStorage. It is now held in-memory
 * (source of truth) with a sessionStorage mirror for refresh-survival — see
 * `src/lib/sessionStore.js` for the rationale and the honest XSS caveat. The
 * function name/signature are unchanged so AuthContext and the resilient
 * useAuth() fallback do not need to change.
 */
export function getAuthSession() {
  return getSession();
}

/**
 * Persist the auth session (current user).
 *
 * Fix #9: routes through the in-memory + sessionStorage session store (NOT
 * localStorage). Only non-sensitive identity fields should be passed in (never
 * the password/hash) — AuthContext already restricts this to { id, name, email,
 * role }.
 */
export function saveAuthSession(user) {
  setSession(user);
}

/**
 * Clear the persisted auth session (in-memory + sessionStorage mirror, plus any
 * lingering legacy localStorage copy). Fix #9.
 */
export function clearAuthSession() {
  clearSession();
}

/**
 * Get the persisted login-throttle state (Fix #8) from localStorage.
 *
 * Returns a plain map keyed by normalized email, holding ONLY failure counters
 * + timestamps (never any password/hash). See src/lib/loginThrottle.js for the
 * shape, policy and the honest no-backend caveat. Returns `{}` when empty.
 *
 * DELIBERATELY STAYS IN localStorage (NOT moved to sessionStorage by Fix #9):
 * the lockout counters are anti-abuse state, not a secret/identity token. If
 * they lived in sessionStorage an attacker could reset an active lockout simply
 * by closing the tab (sessionStorage is per-tab and cleared on tab close),
 * weakening Fix #8. Persisting them in localStorage means a lockout survives tab
 * close as intended. (Both stores are still page-script-readable in this
 * no-backend app — this control must ultimately move server-side; see
 * loginThrottle.js.)
 */
export function getLoginThrottle() {
  return getData('loginThrottle') || {};
}

/**
 * Persist the login-throttle state (Fix #8) to localStorage. Kept on
 * localStorage on purpose (see getLoginThrottle) so a lockout survives tab close.
 */
export function saveLoginThrottle(state) {
  setData('loginThrottle', state || {});
}
