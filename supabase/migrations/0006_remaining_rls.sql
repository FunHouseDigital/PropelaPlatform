-- =============================================================================
-- Migration 0006 — Enable RLS + policies (remaining tables)
-- Feature: supabase-online-platform  (Task 4.6)
-- Requirements: 4.2, 4.3, 4.4, 10.3, 10.4
-- =============================================================================
-- Enables Row Level Security on every remaining domain table and applies one of
-- three policy shapes, driven by the domain registry flags:
--
--   1. ADMIN-ONLY (adminOnly in domains.js): integrations, api_endpoints,
--      api_keys, webhooks, webhook_delivery_log, sync_status, settings.
--      ONLY an Admin policy exists, so Recruiters (and everyone else) are denied
--      by deny-by-default (Req 4.3).
--
--   2. PER-USER (perUser in domains.js): rows are scoped to owner_id = auth.uid()
--      so a user sees/writes only their own rows, while Admin can access all
--      (Req 4.2, 4.4).
--
--   3. OPERATIONAL (everything else): Admin full access + Recruiter operational
--      access — the same pattern as the core recruitment tables (Req 4.2, 4.4).
--
-- RLS is enabled on every table (Req 10.3); with no matching policy the request
-- returns zero rows (Req 10.4). Policies are dropped-if-exists then recreated so
-- this migration is re-runnable.
-- =============================================================================

-- ---- 1. Admin-only tables -------------------------------------------------
DO $$
DECLARE
  t text;
  admin_only_tables text[] := ARRAY[
    'integrations','api_endpoints','api_keys','webhooks','webhook_delivery_log',
    'sync_status','settings'
  ];
BEGIN
  FOREACH t IN ARRAY admin_only_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS admin_only ON %I;', t);
    EXECUTE format(
      'CREATE POLICY admin_only ON %I FOR ALL '
      || 'USING (current_role_name() = ''Admin'') '
      || 'WITH CHECK (current_role_name() = ''Admin'');', t);
  END LOOP;
END;
$$;

-- ---- 2. Per-user tables ---------------------------------------------------
-- Owner-scoped access for the owning user, plus full access for Admin.
DO $$
DECLARE
  t text;
  per_user_tables text[] := ARRAY[
    'recent_searches','saved_views','recently_viewed',
    'notification_preferences','active_dashboard_layout','toast_preferences',
    'onboarding_state','tour_state','article_votes'
  ];
BEGIN
  FOREACH t IN ARRAY per_user_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS admin_all ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS owner_rw  ON %I;', t);
    -- Admin: full access to all rows.
    EXECUTE format(
      'CREATE POLICY admin_all ON %I FOR ALL '
      || 'USING (current_role_name() = ''Admin'') '
      || 'WITH CHECK (current_role_name() = ''Admin'');', t);
    -- Owner: read/write only their own rows.
    EXECUTE format(
      'CREATE POLICY owner_rw ON %I FOR ALL '
      || 'USING (owner_id = auth.uid()) '
      || 'WITH CHECK (owner_id = auth.uid());', t);
  END LOOP;
END;
$$;

-- ---- 3. Operational tables ------------------------------------------------
-- Admin full access + Recruiter operational access (core-table pattern).
DO $$
DECLARE
  t text;
  operational_tables text[] := ARRAY[
    -- Acquisition
    'referrers','community_channels','events','outreach_templates',
    -- Documents extras
    'report_templates','document_templates','verification_queue',
    -- Communications
    'communications','notifications','comm_email_templates','alert_rules','alert_history',
    -- Reporting
    'scheduled_reports','export_history','dashboard_layouts',
    -- Audit & activity
    'activity_feed','user_sessions','change_history',
    -- Automation
    'automation_rules','automation_templates','execution_log','scheduled_actions',
    -- Notifications & alerts
    'notification_alerts','notification_log','notif_alert_config',
    -- Help & onboarding
    'help_articles','onboarding_steps','feature_tours'
  ];
BEGIN
  FOREACH t IN ARRAY operational_tables LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY;', t);
    EXECUTE format('DROP POLICY IF EXISTS admin_all     ON %I;', t);
    EXECUTE format('DROP POLICY IF EXISTS recruiter_ops ON %I;', t);
    EXECUTE format(
      'CREATE POLICY admin_all ON %I FOR ALL '
      || 'USING (current_role_name() = ''Admin'') '
      || 'WITH CHECK (current_role_name() = ''Admin'');', t);
    EXECUTE format(
      'CREATE POLICY recruiter_ops ON %I FOR ALL '
      || 'USING (current_role_name() = ''Recruiter'') '
      || 'WITH CHECK (current_role_name() = ''Recruiter'');', t);
  END LOOP;
END;
$$;
