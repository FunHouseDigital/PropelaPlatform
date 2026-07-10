-- =============================================================================
-- Migration 0005 — Remaining schema-area tables + bump_version triggers
-- Feature: supabase-online-platform  (Task 4.5)
-- Requirements: 5.1, 5.4, 11.1, 12.4
-- =============================================================================
-- Creates a table for every remaining Data_Domain in the domain registry
-- (src/lib/dataLayer/domains.js), following the common-columns + hybrid JSONB
-- pattern from design.md:
--
--   COLLECTIONS (kind='collection'):
--     id text PRIMARY KEY, owner_id uuid, [typed cols], attributes jsonb,
--     version int, created_at, updated_at
--
--   SINGLETON / PER-USER objects (kind='singleton'):
--     modeled as a single-row-per-owner table:
--     id text PRIMARY KEY, owner_id uuid, value jsonb, version int,
--     created_at, updated_at. Per-user singletons carry UNIQUE(owner_id) so
--     each user holds at most one row.
--
-- The trailing `attributes`/`value` JSONB stores the seed object verbatim for
-- exact write-then-read round-trips (Req 11.1) and tolerates seed-shape changes
-- without new migrations. Time-ordered logs get a created_at DESC index
-- (Req 12.4). Every table receives the bump_version trigger at the end
-- (Req 2.2, 2.5, 11.3). RLS is enabled in migration 0006.
-- =============================================================================

-- ===========================================================================
-- COLLECTION tables (id text PK + owner_id + attributes jsonb + common cols)
-- ===========================================================================

-- ---- Acquisition ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS referrers (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_referrers_owner ON referrers (owner_id);

CREATE TABLE IF NOT EXISTS community_channels (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_community_channels_owner ON community_channels (owner_id);

CREATE TABLE IF NOT EXISTS events (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_owner ON events (owner_id);

CREATE TABLE IF NOT EXISTS outreach_templates (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_outreach_templates_owner ON outreach_templates (owner_id);

-- ---- Documents (extras) ---------------------------------------------------
CREATE TABLE IF NOT EXISTS report_templates (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_report_templates_owner ON report_templates (owner_id);

CREATE TABLE IF NOT EXISTS document_templates (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_document_templates_owner ON document_templates (owner_id);

CREATE TABLE IF NOT EXISTS verification_queue (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_verification_queue_owner ON verification_queue (owner_id);

-- ---- Communications -------------------------------------------------------
CREATE TABLE IF NOT EXISTS communications (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_communications_owner ON communications (owner_id);

CREATE TABLE IF NOT EXISTS notifications (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_owner ON notifications (owner_id);

CREATE TABLE IF NOT EXISTS comm_email_templates (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_comm_email_templates_owner ON comm_email_templates (owner_id);

CREATE TABLE IF NOT EXISTS alert_rules (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alert_rules_owner ON alert_rules (owner_id);

CREATE TABLE IF NOT EXISTS alert_history (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_alert_history_owner ON alert_history (owner_id);

-- ---- Reporting ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS scheduled_reports (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scheduled_reports_owner ON scheduled_reports (owner_id);

CREATE TABLE IF NOT EXISTS export_history (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_export_history_owner ON export_history (owner_id);

CREATE TABLE IF NOT EXISTS dashboard_layouts (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_dashboard_layouts_owner ON dashboard_layouts (owner_id);

-- ---- Integrations (Admin-only domains) ------------------------------------
CREATE TABLE IF NOT EXISTS integrations (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_integrations_owner ON integrations (owner_id);

CREATE TABLE IF NOT EXISTS api_endpoints (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_endpoints_owner ON api_endpoints (owner_id);

CREATE TABLE IF NOT EXISTS api_keys (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_api_keys_owner ON api_keys (owner_id);

CREATE TABLE IF NOT EXISTS webhooks (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_webhooks_owner ON webhooks (owner_id);

CREATE TABLE IF NOT EXISTS webhook_delivery_log (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_log_created_at ON webhook_delivery_log (created_at DESC);

-- ---- Audit & activity -----------------------------------------------------
CREATE TABLE IF NOT EXISTS activity_feed (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_activity_feed_created_at ON activity_feed (created_at DESC);  -- Req 12.4

CREATE TABLE IF NOT EXISTS user_sessions (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_user_sessions_owner ON user_sessions (owner_id);

CREATE TABLE IF NOT EXISTS change_history (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_change_history_created_at ON change_history (created_at DESC);

-- ---- Personalization (per-user collections) -------------------------------
CREATE TABLE IF NOT EXISTS recent_searches (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recent_searches_owner ON recent_searches (owner_id);

CREATE TABLE IF NOT EXISTS saved_views (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_saved_views_owner ON saved_views (owner_id);

CREATE TABLE IF NOT EXISTS recently_viewed (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_recently_viewed_owner ON recently_viewed (owner_id);

-- ---- Automation -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS automation_rules (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_rules_owner ON automation_rules (owner_id);

CREATE TABLE IF NOT EXISTS automation_templates (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_automation_templates_owner ON automation_templates (owner_id);

CREATE TABLE IF NOT EXISTS execution_log (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_execution_log_created_at ON execution_log (created_at DESC);  -- Req 12.4

CREATE TABLE IF NOT EXISTS scheduled_actions (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_scheduled_actions_owner ON scheduled_actions (owner_id);

-- ---- Notifications & alerts -----------------------------------------------
CREATE TABLE IF NOT EXISTS notification_alerts (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_alerts_owner ON notification_alerts (owner_id);

CREATE TABLE IF NOT EXISTS notification_log (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notification_log_created_at ON notification_log (created_at DESC);  -- Req 12.4

-- ---- Help & onboarding (reference collections) ----------------------------
CREATE TABLE IF NOT EXISTS help_articles (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_help_articles_owner ON help_articles (owner_id);

CREATE TABLE IF NOT EXISTS onboarding_steps (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_onboarding_steps_owner ON onboarding_steps (owner_id);

CREATE TABLE IF NOT EXISTS feature_tours (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_feature_tours_owner ON feature_tours (owner_id);

-- ===========================================================================
-- SINGLETON / PER-USER tables (single row per owner; value jsonb + common cols)
-- ===========================================================================

-- Per-user singletons: at most one row per owner (UNIQUE owner_id).
CREATE TABLE IF NOT EXISTS notification_preferences (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id)
);

CREATE TABLE IF NOT EXISTS active_dashboard_layout (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id)
);

CREATE TABLE IF NOT EXISTS toast_preferences (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id)
);

CREATE TABLE IF NOT EXISTS onboarding_state (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id)
);

CREATE TABLE IF NOT EXISTS tour_state (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id)
);

CREATE TABLE IF NOT EXISTS article_votes (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (owner_id)
);

-- Global singletons (not per-user): sync_status & settings are Admin-only;
-- notif_alert_config is a shared operational config. No UNIQUE(owner_id) since
-- they are single global rows rather than per-user.
CREATE TABLE IF NOT EXISTS sync_status (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS notif_alert_config (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS settings (
  id text PRIMARY KEY, owner_id uuid REFERENCES auth.users(id),
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  version integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);

-- ===========================================================================
-- bump_version() triggers for every remaining table (Req 2.2, 2.5, 11.3)
-- The function itself was created in migration 0002.
-- ===========================================================================
DO $$
DECLARE
  t text;
  remaining_tables text[] := ARRAY[
    -- Acquisition
    'referrers','community_channels','events','outreach_templates',
    -- Documents extras
    'report_templates','document_templates','verification_queue',
    -- Communications
    'communications','notifications','comm_email_templates','alert_rules','alert_history',
    -- Reporting
    'scheduled_reports','export_history','dashboard_layouts',
    -- Integrations (Admin-only)
    'integrations','api_endpoints','api_keys','webhooks','webhook_delivery_log',
    -- Audit & activity
    'activity_feed','user_sessions','change_history',
    -- Personalization (per-user)
    'recent_searches','saved_views','recently_viewed',
    -- Automation
    'automation_rules','automation_templates','execution_log','scheduled_actions',
    -- Notifications & alerts
    'notification_alerts','notification_log',
    -- Help & onboarding
    'help_articles','onboarding_steps','feature_tours',
    -- Singleton / per-user
    'notification_preferences','active_dashboard_layout','toast_preferences',
    'onboarding_state','tour_state','article_votes',
    'sync_status','notif_alert_config','settings'
  ];
BEGIN
  FOREACH t IN ARRAY remaining_tables LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_bump_version ON %I;', t);
    EXECUTE format(
      'CREATE TRIGGER trg_bump_version BEFORE UPDATE ON %I FOR EACH ROW EXECUTE FUNCTION bump_version();',
      t
    );
  END LOOP;
END;
$$;
