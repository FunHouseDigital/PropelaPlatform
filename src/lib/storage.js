import { seedNurses } from '../data/seedNurses';
import { seedFacilities } from '../data/seedFacilities';
import { seedCohorts } from '../data/seedCohorts';
import { seedReferrers, seedCommunityChannels, seedEvents } from '../data/seedAcquisition';
import { seedOutreachTemplates } from '../data/seedOutreach';
import { seedPlacements } from '../data/seedPlacements';
import { seedSettings } from '../data/seedSettings';
import { seedDocuments } from '../data/seedDocuments';
import { seedCommunications } from '../data/seedCommunications';
import { seedReports } from '../data/seedReports';

const STORAGE_PREFIX = 'propela_ops_';

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
  return getData('notificationPreferences') || {
    document_expiry: true,
    compliance_alert: true,
    pipeline_change: true,
    placement_update: true,
  };
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
