/**
 * Seed-source loader (Task 11.1).
 *
 * Composes every seed generator under `src/data/*` into a single
 * `{ domainName: sourceData }` map, mirroring exactly how `src/lib/storage.js`
 * distributes each generator's output across domains. Collections resolve to
 * arrays; singletons resolve to a single object (or null).
 *
 * This module is pure (calling the generators has no side effects — no
 * localStorage, no network, no secrets), so the migration engine and its tests
 * can obtain the full source set deterministically.
 *
 * Domains that `storage.js` only ever populates with runtime defaults or
 * per-user state (reportTemplates, notificationPreferences, recentSearches,
 * savedViews, recentlyViewed, onboardingState, tourState, articleVotes) have no
 * seed generator and are intentionally omitted — the engine treats a missing
 * source as an empty set (sourceCount 0).
 */

import {
  seedCommunityChannels,
  seedEvents,
  seedReferrers,
} from '../../data/seedAcquisition';
import { seedAuditTrail } from '../../data/seedAuditTrail';
import { seedAutomations } from '../../data/seedAutomations';
import { seedCohorts } from '../../data/seedCohorts';
import { seedCommunications } from '../../data/seedCommunications';
import { seedDocuments } from '../../data/seedDocuments';
import { seedFacilities } from '../../data/seedFacilities';
import { seedHelp } from '../../data/seedHelp';
import { seedIntegrations } from '../../data/seedIntegrations';
import { seedNotifications } from '../../data/seedNotifications';
import { seedNurses } from '../../data/seedNurses';
import { seedOutreachTemplates } from '../../data/seedOutreach';
import { seedPlacements } from '../../data/seedPlacements';
import { seedReports } from '../../data/seedReports';
import { seedSettings } from '../../data/seedSettings';

/**
 * Build the full domain → source-data map for the migration.
 *
 * @returns {Record<string, unknown>} domainName → array | object | null
 */
export function loadSeedSources() {
  const docs = seedDocuments();
  const comms = seedCommunications();
  const reports = seedReports();
  const integrations = seedIntegrations();
  const audit = seedAuditTrail();
  const automations = seedAutomations();
  const notifications = seedNotifications();
  const help = seedHelp();

  return {
    // ---- Recruitment core ----
    nurses: seedNurses(),
    facilities: seedFacilities(),
    cohorts: seedCohorts(),
    placements: seedPlacements(),

    // ---- Acquisition ----
    referrers: seedReferrers(),
    communityChannels: seedCommunityChannels(),
    events: seedEvents(),
    outreachTemplates: seedOutreachTemplates(),

    // ---- Documents ----
    documents: docs.documents,
    documentTemplates: docs.templates,
    verificationQueue: docs.verificationQueue,

    // ---- Communications ----
    communications: comms.communications,
    notifications: comms.notifications,
    commEmailTemplates: comms.emailTemplates,
    alertRules: comms.alertRules,
    alertHistory: comms.alertHistory,

    // ---- Reporting ----
    scheduledReports: reports.scheduledReports,
    exportHistory: reports.exportHistory,
    dashboardLayouts: reports.dashboardLayouts,
    activeDashboardLayout: reports.dashboardLayouts[0] || null,

    // ---- Integrations (Admin-only) ----
    integrations: integrations.integrations,
    apiEndpoints: integrations.apiEndpoints,
    apiKeys: integrations.apiKeys,
    webhooks: integrations.webhooks,
    webhookDeliveryLog: integrations.webhookDeliveryLog,
    syncStatus: integrations.syncStatus,

    // ---- Audit & activity ----
    activityFeed: audit.activityFeed,
    auditLog: audit.auditLog,
    userSessions: audit.userSessions,
    changeHistory: audit.changeHistory,

    // ---- Automation ----
    automationRules: automations.automationRules,
    automationTemplates: automations.automationTemplates,
    executionLog: automations.executionLog,
    scheduledActions: automations.scheduledActions,

    // ---- Notifications & alerts ----
    notificationAlerts: notifications.notificationAlerts,
    notifAlertConfig: notifications.notifAlertConfig,
    notificationLog: notifications.notificationLog,
    toastPreferences: notifications.toastPreferences,

    // ---- Help & onboarding ----
    helpArticles: help.helpArticles,
    onboardingSteps: help.onboardingSteps,
    // seedHelp() returns featureTours as an object keyed by page; the table is a
    // collection, so migrate the object's values (each carries a stable `id`).
    featureTours: Object.values(help.featureTours),

    // ---- Configuration (Admin-only) ----
    settings: seedSettings(),
  };
}

export default loadSeedSources;
