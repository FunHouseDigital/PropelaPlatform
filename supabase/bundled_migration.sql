-- =============================================================================
-- bundled_migration.sql — FULL SCHEMA (paste-ready for the Supabase SQL Editor)
-- =============================================================================
-- This file is the concatenation, IN ORDER, of every migration under
-- supabase/migrations/0001..0007. It exists so an operator can stand up a FRESH
-- Supabase project in one paste:
--
--   Supabase Dashboard -> SQL Editor -> New query -> paste this whole file -> Run.
--
-- SOURCE OF TRUTH: the individual files in supabase/migrations/ are authoritative.
-- This bundle is GENERATED from them (0001..0007 concatenated in numeric order)
-- and reflects the reconciled role model:
--   * profiles.role allows {Superadmin, Admin, Manager, Recruiter, Read-only}
--   * handle_new_user() auto-provisions a least-privilege 'Read-only' profile
--   * every Admin RLS policy also grants Superadmin the same full access
--
-- Re-runnable: the DDL uses CREATE ... IF NOT EXISTS / CREATE OR REPLACE /
-- DROP ... IF EXISTS patterns, so applying it more than once is safe.
--
-- No secret is embedded here and none is required to apply it — the operator
-- pastes it while signed into the Supabase dashboard. After applying, create the
-- two Auth users and run supabase/promote_superadmins.sql. See docs/GO_LIVE.md.
-- =============================================================================



-- >>> BEGIN migrations/0001_core_schema.sql >>>

-- =============================================================================
-- Migration 0001 — Core recruitment schema
-- Feature: supabase-online-platform  (Task 4.1)
-- Requirements: 5.1, 5.4, 11.1, 12.4
-- =============================================================================
-- Creates the highest-traffic "Recruitment core" tables plus the two core
-- support tables (documents, audit_log) using the common-columns + hybrid
-- relational/JSONB pattern from design.md ("Data Models").
--
-- Common columns applied to every domain table:
--   id          text PRIMARY KEY         -- preserves existing seed IDs (Req 5.3)
--   owner_id    uuid REFERENCES auth.users(id) -- tenancy/ownership for RLS (Req 4.2)
--   version     integer NOT NULL DEFAULT 1      -- optimistic concurrency (Req 2.5, 11.3)
--   created_at  timestamptz NOT NULL DEFAULT now()
--   updated_at  timestamptz NOT NULL DEFAULT now()
--
-- Typed columns capture the fields that are filtered/sorted/joined (Req 12.4);
-- nested substructures live in JSONB columns for exact write-then-read
-- round-trips (Req 11.1). The trailing `attributes` JSONB captures any
-- remaining seed fields verbatim so seed-shape changes need no new migration.
--
-- The bump_version() trigger (migration 0002) advances version/updated_at on
-- every UPDATE, and RLS (migration 0004) is enabled afterward. Foreign keys
-- enforce referential integrity (Req 5.4).
-- =============================================================================

-- citext gives case-insensitive email matching used by several typed columns.
CREATE EXTENSION IF NOT EXISTS citext;

-- ---------------------------------------------------------------------------
-- NURSES (Recruitment core)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS nurses (
  id                        text PRIMARY KEY,                     -- e.g. 'nurse-001' (Req 5.3)
  owner_id                  uuid REFERENCES auth.users(id),
  full_name                 text NOT NULL,
  preferred_name            text,
  pipeline_stage            text,                                 -- common filter (Req 12.4)
  readiness_status          text,
  cohort_assigned           text,
  oet_status                text,
  final_score               numeric,
  tier                      text,
  email                     citext,
  scorecard_fields          jsonb NOT NULL DEFAULT '{}'::jsonb,   -- nested object, exact round-trip (Req 11.1)
  additional_certifications jsonb NOT NULL DEFAULT '[]'::jsonb,
  communication_log         jsonb NOT NULL DEFAULT '[]'::jsonb,
  attributes                jsonb NOT NULL DEFAULT '{}'::jsonb,   -- remaining scalar fields, forward-compatible
  version                   integer NOT NULL DEFAULT 1,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_nurses_pipeline_stage ON nurses (pipeline_stage);  -- Req 12.4
CREATE INDEX IF NOT EXISTS idx_nurses_cohort         ON nurses (cohort_assigned);
CREATE INDEX IF NOT EXISTS idx_nurses_owner          ON nurses (owner_id);

-- ---------------------------------------------------------------------------
-- FACILITIES
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS facilities (
  id          text PRIMARY KEY,
  owner_id    uuid REFERENCES auth.users(id),
  name        text NOT NULL,
  province    text,
  city        text,
  group_name  text,
  attributes  jsonb NOT NULL DEFAULT '{}'::jsonb,
  version     integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_facilities_province ON facilities (province);  -- Req 12.4
CREATE INDEX IF NOT EXISTS idx_facilities_owner    ON facilities (owner_id);

-- ---------------------------------------------------------------------------
-- COHORTS
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cohorts (
  id          text PRIMARY KEY,
  owner_id    uuid REFERENCES auth.users(id),
  name        text NOT NULL,
  status      text,
  attributes  jsonb NOT NULL DEFAULT '{}'::jsonb,
  version     integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cohorts_status ON cohorts (status);
CREATE INDEX IF NOT EXISTS idx_cohorts_owner  ON cohorts (owner_id);

-- ---------------------------------------------------------------------------
-- PLACEMENTS — FK to nurses & facilities enforces referential integrity (Req 5.4)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS placements (
  id                   text PRIMARY KEY,                          -- 'placement-001'
  owner_id             uuid REFERENCES auth.users(id),
  nurse_id             text REFERENCES nurses(id)     ON DELETE RESTRICT,
  facility_id          text,                                      -- placement DESTINATION facility (UK/Ireland, uk-*/ie-* namespace). Intentionally NOT a foreign key: destinations are a distinct concept from the SA acquisition `facilities` table, so no FK to facilities(id).
  current_stage        text,                                      -- common filter (Req 12.4)
  target_country       text,
  visa_status          text,
  match_score          integer,
  contract_details     jsonb NOT NULL DEFAULT '{}'::jsonb,
  relocation_checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  stage_history        jsonb NOT NULL DEFAULT '[]'::jsonb,
  version              integer NOT NULL DEFAULT 1,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_placements_stage    ON placements (current_stage);  -- Req 12.4
CREATE INDEX IF NOT EXISTS idx_placements_nurse    ON placements (nurse_id);
CREATE INDEX IF NOT EXISTS idx_placements_facility ON placements (facility_id);
CREATE INDEX IF NOT EXISTS idx_placements_owner    ON placements (owner_id);

-- ---------------------------------------------------------------------------
-- DOCUMENTS — FK to nurses; cascade so a nurse's documents follow deletion (Req 5.4)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS documents (
  id          text PRIMARY KEY,
  owner_id    uuid REFERENCES auth.users(id),
  nurse_id    text REFERENCES nurses(id) ON DELETE CASCADE,
  doc_type    text,
  status      text,
  expiry_date date,
  attributes  jsonb NOT NULL DEFAULT '{}'::jsonb,
  version     integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_documents_nurse  ON documents (nurse_id);      -- Req 12.4
CREATE INDEX IF NOT EXISTS idx_documents_expiry ON documents (expiry_date);
CREATE INDEX IF NOT EXISTS idx_documents_owner  ON documents (owner_id);

-- ---------------------------------------------------------------------------
-- AUDIT_LOG — append-mostly, time-ordered (Req 12.4)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS audit_log (
  id          text PRIMARY KEY,
  owner_id    uuid REFERENCES auth.users(id),
  actor       text,
  action      text,
  entity_type text,
  entity_id   text,
  detail      jsonb NOT NULL DEFAULT '{}'::jsonb,
  version     integer NOT NULL DEFAULT 1,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log (created_at DESC);           -- Req 12.4
CREATE INDEX IF NOT EXISTS idx_audit_entity     ON audit_log (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_owner      ON audit_log (owner_id);

-- <<< END migrations/0001_core_schema.sql <<<


-- >>> BEGIN migrations/0002_bump_version_trigger.sql >>>

-- =============================================================================
-- Migration 0002 — bump_version() trigger (core tables)
-- Feature: supabase-online-platform  (Task 4.2)
-- Requirements: 2.2, 2.5, 11.3
-- =============================================================================
-- Defines the shared concurrency-token trigger function and attaches a
-- BEFORE UPDATE ... FOR EACH ROW trigger to every CORE domain table. The
-- function advances the optimistic-concurrency token on every committed
-- UPDATE — including manual edits made directly in the Supabase table editor —
-- so a stale client write (conditional on an older `version`) is always caught
-- (Req 2.2, 2.4, 2.5, 11.3).
--
-- Triggers for the REMAINING domain tables are attached in migration 0005.
-- =============================================================================

CREATE OR REPLACE FUNCTION bump_version() RETURNS trigger AS $$
BEGIN
  NEW.updated_at := now();
  NEW.version    := OLD.version + 1;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach the trigger to each core table. DROP IF EXISTS first so the migration
-- is safely re-runnable.
DROP TRIGGER IF EXISTS trg_bump_version ON nurses;
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON nurses
  FOR EACH ROW EXECUTE FUNCTION bump_version();

DROP TRIGGER IF EXISTS trg_bump_version ON facilities;
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON facilities
  FOR EACH ROW EXECUTE FUNCTION bump_version();

DROP TRIGGER IF EXISTS trg_bump_version ON cohorts;
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON cohorts
  FOR EACH ROW EXECUTE FUNCTION bump_version();

DROP TRIGGER IF EXISTS trg_bump_version ON placements;
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON placements
  FOR EACH ROW EXECUTE FUNCTION bump_version();

DROP TRIGGER IF EXISTS trg_bump_version ON documents;
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION bump_version();

DROP TRIGGER IF EXISTS trg_bump_version ON audit_log;
CREATE TRIGGER trg_bump_version BEFORE UPDATE ON audit_log
  FOR EACH ROW EXECUTE FUNCTION bump_version();

-- <<< END migrations/0002_bump_version_trigger.sql <<<


-- >>> BEGIN migrations/0003_profiles_and_roles.sql >>>

-- =============================================================================
-- Migration 0003 — profiles table + current_role_name() helper
-- Feature: supabase-online-platform  (Task 4.3)
-- Requirements: 4.1, 4.7
-- =============================================================================
-- Roles are stored in a profiles table (one row per auth.users id, exactly one
-- role from the full application role set
-- {Superadmin, Admin, Manager, Recruiter, Read-only}, Req 4.1). RLS policies
-- resolve the caller's role via current_role_name(), a DB lookup rather than a
-- JWT claim, so a role change takes effect without requiring the user to
-- re-login.
--
-- Superadmin is the highest privilege level and is granted the SAME full access
-- as Admin on every table by the RLS policies (see 0004/0006). Propela Ops
-- go-live provisions exactly two Superadmin accounts; public sign-ups are OFF.
--
-- A user with no profiles row resolves to NULL, and every policy's
-- `current_role_name() = '...'` check fails on NULL — enforcing
-- "no role => no access" (Req 4.7). The handle_new_user() trigger below also
-- auto-provisions a least-privilege 'Read-only' profile for every new auth user
-- so a freshly created account can never be left with a NULL role.
-- =============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('Superadmin', 'Admin', 'Manager', 'Recruiter', 'Read-only')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helper used by every RLS policy. STABLE (result is constant within a
-- statement) and SECURITY DEFINER so it can read `profiles` even while a policy
-- check is being evaluated for the calling (possibly restricted) user.
-- Returns NULL when the caller has no profile row (Req 4.7).
CREATE OR REPLACE FUNCTION current_role_name() RETURNS text AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;


-- ---------------------------------------------------------------------------
-- Auto-provision a profile row for every new auth user (least-privilege).
-- ---------------------------------------------------------------------------
-- Without this, a user created in Supabase Auth would have NO profiles row and
-- therefore a NULL role, locking them out of every table (deny-by-default).
-- The trigger inserts a least-privilege 'Read-only' profile on sign-up so an
-- account always resolves to a concrete role. The two real Propela Ops accounts
-- (Vuyo, Aya) are then promoted to 'Superadmin' via
-- supabase/promote_superadmins.sql after they are created.
--
-- SECURITY DEFINER so the insert into `profiles` succeeds regardless of the
-- (possibly restricted) role of the session that triggers the auth insert.
-- ON CONFLICT DO NOTHING keeps it idempotent and never downgrades an existing
-- role (e.g. a re-run or a manual promotion already in place).
CREATE OR REPLACE FUNCTION handle_new_user() RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (user_id, role)
  VALUES (new.id, 'Read-only')
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-runnable: drop the trigger before (re)creating it.
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- <<< END migrations/0003_profiles_and_roles.sql <<<


-- >>> BEGIN migrations/0004_core_rls.sql >>>

-- =============================================================================
-- Migration 0004 — Enable RLS + policies (core tables + profiles)
-- Feature: supabase-online-platform  (Task 4.4)
-- Requirements: 4.2, 4.4, 10.3, 10.4, 4.7
-- =============================================================================
-- Enables Row Level Security on every core domain table and defines two
-- policies per operational table:
--   * admin_all      — Admin AND Superadmin have full access to all rows (Req 4.4).
--                      Superadmin is the go-live top-level role and shares the
--                      exact same full access as Admin on every table.
--   * recruiter_ops  — Recruiter has operational read/write access (Req 4.2)
--
-- RLS relies on DENY-BY-DEFAULT: with RLS enabled and no matching policy, the
-- request returns zero rows (Req 10.4). A NULL role (no profile row) fails every
-- `current_role_name() = '...'` check, so unroled users are denied (Req 4.7).
--
-- Policies are dropped-if-exists before creation so the migration is
-- re-runnable (CREATE POLICY has no IF NOT EXISTS form).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Operational recruitment tables: Admin full access + Recruiter operational.
-- ---------------------------------------------------------------------------

-- NURSES
ALTER TABLE nurses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_all     ON nurses;
DROP POLICY IF EXISTS recruiter_ops ON nurses;
CREATE POLICY admin_all ON nurses FOR ALL
  USING (current_role_name() IN ('Admin','Superadmin'))      WITH CHECK (current_role_name() IN ('Admin','Superadmin'));
CREATE POLICY recruiter_ops ON nurses FOR ALL
  USING (current_role_name() = 'Recruiter')  WITH CHECK (current_role_name() = 'Recruiter');

-- FACILITIES
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_all     ON facilities;
DROP POLICY IF EXISTS recruiter_ops ON facilities;
CREATE POLICY admin_all ON facilities FOR ALL
  USING (current_role_name() IN ('Admin','Superadmin'))      WITH CHECK (current_role_name() IN ('Admin','Superadmin'));
CREATE POLICY recruiter_ops ON facilities FOR ALL
  USING (current_role_name() = 'Recruiter')  WITH CHECK (current_role_name() = 'Recruiter');

-- COHORTS
ALTER TABLE cohorts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_all     ON cohorts;
DROP POLICY IF EXISTS recruiter_ops ON cohorts;
CREATE POLICY admin_all ON cohorts FOR ALL
  USING (current_role_name() IN ('Admin','Superadmin'))      WITH CHECK (current_role_name() IN ('Admin','Superadmin'));
CREATE POLICY recruiter_ops ON cohorts FOR ALL
  USING (current_role_name() = 'Recruiter')  WITH CHECK (current_role_name() = 'Recruiter');

-- PLACEMENTS
ALTER TABLE placements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_all     ON placements;
DROP POLICY IF EXISTS recruiter_ops ON placements;
CREATE POLICY admin_all ON placements FOR ALL
  USING (current_role_name() IN ('Admin','Superadmin'))      WITH CHECK (current_role_name() IN ('Admin','Superadmin'));
CREATE POLICY recruiter_ops ON placements FOR ALL
  USING (current_role_name() = 'Recruiter')  WITH CHECK (current_role_name() = 'Recruiter');

-- DOCUMENTS
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_all     ON documents;
DROP POLICY IF EXISTS recruiter_ops ON documents;
CREATE POLICY admin_all ON documents FOR ALL
  USING (current_role_name() IN ('Admin','Superadmin'))      WITH CHECK (current_role_name() IN ('Admin','Superadmin'));
CREATE POLICY recruiter_ops ON documents FOR ALL
  USING (current_role_name() = 'Recruiter')  WITH CHECK (current_role_name() = 'Recruiter');

-- AUDIT_LOG
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS admin_all     ON audit_log;
DROP POLICY IF EXISTS recruiter_ops ON audit_log;
CREATE POLICY admin_all ON audit_log FOR ALL
  USING (current_role_name() IN ('Admin','Superadmin'))      WITH CHECK (current_role_name() IN ('Admin','Superadmin'));
CREATE POLICY recruiter_ops ON audit_log FOR ALL
  USING (current_role_name() = 'Recruiter')  WITH CHECK (current_role_name() = 'Recruiter');

-- ---------------------------------------------------------------------------
-- PROFILES — a user may read only their own profile; only Admin may write roles.
-- (Deny-by-default means non-admin INSERT/UPDATE/DELETE has no policy => denied.)
-- ---------------------------------------------------------------------------
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_admin_all   ON profiles;
DROP POLICY IF EXISTS profiles_self_select ON profiles;
-- Admin/Superadmin: full read/write of all profiles (role administration).
CREATE POLICY profiles_admin_all ON profiles FOR ALL
  USING (current_role_name() IN ('Admin','Superadmin'))      WITH CHECK (current_role_name() IN ('Admin','Superadmin'));
-- Any authenticated user: read own profile row (for UI role gating).
CREATE POLICY profiles_self_select ON profiles FOR SELECT
  USING (user_id = auth.uid());

-- <<< END migrations/0004_core_rls.sql <<<


-- >>> BEGIN migrations/0005_remaining_schema.sql >>>

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

-- <<< END migrations/0005_remaining_schema.sql <<<


-- >>> BEGIN migrations/0006_remaining_rls.sql >>>

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
--      ONLY an Admin/Superadmin policy exists, so Recruiters (and everyone else)
--      are denied by deny-by-default (Req 4.3).
--
--   2. PER-USER (perUser in domains.js): rows are scoped to owner_id = auth.uid()
--      so a user sees/writes only their own rows, while Admin/Superadmin can
--      access all (Req 4.2, 4.4).
--
--   3. OPERATIONAL (everything else): Admin/Superadmin full access + Recruiter
--      operational access — the same pattern as the core recruitment tables
--      (Req 4.2, 4.4).
--
-- Superadmin is the go-live top-level role and is granted the SAME full access
-- as Admin everywhere via `current_role_name() IN ('Admin','Superadmin')`.
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
      || 'USING (current_role_name() IN (''Admin'',''Superadmin'')) '
      || 'WITH CHECK (current_role_name() IN (''Admin'',''Superadmin''));', t);
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
    -- Admin/Superadmin: full access to all rows.
    EXECUTE format(
      'CREATE POLICY admin_all ON %I FOR ALL '
      || 'USING (current_role_name() IN (''Admin'',''Superadmin'')) '
      || 'WITH CHECK (current_role_name() IN (''Admin'',''Superadmin''));', t);
    -- Owner: read/write only their own rows.
    EXECUTE format(
      'CREATE POLICY owner_rw ON %I FOR ALL '
      || 'USING (owner_id = auth.uid()) '
      || 'WITH CHECK (owner_id = auth.uid());', t);
  END LOOP;
END;
$$;

-- ---- 3. Operational tables ------------------------------------------------
-- Admin/Superadmin full access + Recruiter operational access (core-table pattern).
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
      || 'USING (current_role_name() IN (''Admin'',''Superadmin'')) '
      || 'WITH CHECK (current_role_name() IN (''Admin'',''Superadmin''));', t);
    EXECUTE format(
      'CREATE POLICY recruiter_ops ON %I FOR ALL '
      || 'USING (current_role_name() = ''Recruiter'') '
      || 'WITH CHECK (current_role_name() = ''Recruiter'');', t);
  END LOOP;
END;
$$;

-- <<< END migrations/0006_remaining_rls.sql <<<


-- >>> BEGIN migrations/0007_bulk_update_rpcs.sql >>>

-- =============================================================================
-- Migration 0007 — Transactional mass-update RPC
-- Feature: supabase-online-platform  (Task 7.1)
-- Requirements: 2.3, 11.5, 11.6
-- =============================================================================
-- Provides atomic, all-or-none mass updates over any domain table. A PostgREST
-- batch is NOT transactional across independent rows, so mass updates are routed
-- through a Postgres function that applies the whole batch inside a single
-- transaction (the function body) with a per-row optimistic-concurrency check.
-- If ANY element's `version` gate fails to match a committed row (or any other
-- error occurs), the function RAISEs, which rolls back every change it has made
-- so far — guaranteeing a subsequent read sees either ALL post-update values or
-- ALL pre-update values, never a partial mix (Req 2.3, 11.5, 11.6; Property 4).
--
-- DESIGN CHOICE — option (a): a single GENERIC `bulk_update(table_name, payload)`
-- PL/pgSQL function rather than one hand-written SQL function per domain. The
-- platform has ~40 domain tables that all share the common-columns pattern
-- (`id` PK + `version` token); a generic function keeps the mass-update contract
-- in exactly one place, needs no new migration when a domain is added, and cannot
-- drift per-table. Type-safety is preserved by populating a row of the target
-- table's own rowtype from each JSON element (`jsonb_populate_record`), so every
-- assigned column is coerced to its real column type instead of being handled as
-- loose text. A table allowlist check (the table must exist in the `public`
-- schema) prevents the generic entry point from touching arbitrary relations.
--
-- SECURITY / RLS: the function is SECURITY INVOKER (the default, stated here for
-- clarity). It therefore executes under the CALLER's privileges and Row Level
-- Security still applies to every UPDATE and to the existence re-check below —
-- a Recruiter calling this against an Admin-only table sees zero matching rows
-- and the call fails its version gate exactly as a direct UPDATE would. It never
-- runs as a privileged role, so it cannot bypass the policies from 0004/0006.
--
-- The migration is re-runnable via CREATE OR REPLACE FUNCTION.
-- =============================================================================

CREATE OR REPLACE FUNCTION bulk_update(table_name text, payload jsonb)
  RETURNS SETOF jsonb
  LANGUAGE plpgsql
  SECURITY INVOKER
AS $$
DECLARE
  elem          jsonb;      -- current payload element
  rec_id        text;       -- element's primary key
  base_version  integer;    -- element's expected (last-read) version
  set_clause    text;       -- dynamically built SET list for this element
  updated_row   jsonb;      -- committed row (as jsonb) returned by the UPDATE
  table_exists  boolean;
BEGIN
  -- --- Guard rails -----------------------------------------------------------
  -- Allowlist: only real tables in the public schema may be targeted. This keeps
  -- the generic entry point from being pointed at catalog/other-schema objects.
  SELECT EXISTS (
    SELECT 1
    FROM information_schema.tables t
    WHERE t.table_schema = 'public'
      AND t.table_name = bulk_update.table_name
      AND t.table_type = 'BASE TABLE'
  ) INTO table_exists;

  IF NOT table_exists THEN
    RAISE EXCEPTION 'bulk_update: unknown table %', table_name
      USING ERRCODE = '22023';  -- invalid_parameter_value
  END IF;

  IF payload IS NULL OR jsonb_typeof(payload) <> 'array' THEN
    RAISE EXCEPTION 'bulk_update: payload must be a JSON array'
      USING ERRCODE = '22023';
  END IF;

  -- Empty batch: nothing to do, return no rows (still a successful, atomic call).
  IF jsonb_array_length(payload) = 0 THEN
    RETURN;
  END IF;

  -- --- Apply every element inside this single function transaction -----------
  FOR elem IN SELECT value FROM jsonb_array_elements(payload)
  LOOP
    rec_id := elem ->> 'id';
    IF rec_id IS NULL THEN
      RAISE EXCEPTION 'bulk_update: every element must carry an "id"'
        USING ERRCODE = '22023';
    END IF;

    IF NOT (elem ? 'version') OR elem ->> 'version' IS NULL THEN
      RAISE EXCEPTION 'bulk_update: element id=% must carry a "version"', rec_id
        USING ERRCODE = '22023';
    END IF;
    base_version := (elem ->> 'version')::integer;

    -- Build the SET list from every key EXCEPT id/version and the DB-owned
    -- concurrency/audit columns. Each value is read from a row of the target
    -- table's own rowtype (aliased `c`), so it is coerced to the real column
    -- type. If only id/version are supplied, fall back to a no-op self-assign so
    -- the row is still touched (advancing `version` via the bump_version trigger)
    -- and the version gate is still enforced.
    SELECT string_agg(format('%I = c.%I', k.key, k.key), ', ')
      INTO set_clause
    FROM jsonb_object_keys(elem) AS k(key)
    WHERE k.key NOT IN ('id', 'version', 'created_at', 'updated_at');

    IF set_clause IS NULL THEN
      set_clause := 'id = t.id';
    END IF;

    -- Conditional update gated on id AND the last-read version. `RETURNING`
    -- yields the committed row only when a row actually matched the gate.
    EXECUTE format(
      'UPDATE public.%1$I AS t
          SET %2$s
         FROM jsonb_populate_record(NULL::public.%1$I, $1) AS c
        WHERE t.id = $2
          AND t.version = $3
      RETURNING to_jsonb(t)',
      table_name, set_clause
    )
    INTO updated_row
    USING elem, rec_id, base_version;

    -- Zero rows matched ⇒ the row changed since it was read (or does not exist).
    -- RAISE to roll back the ENTIRE batch so nothing is partially applied. The
    -- message deliberately contains the word "conflict" (with surrounding word
    -- boundaries) and the offending id in DETAIL so the adapter can classify it
    -- as an optimistic-concurrency CONFLICT and surface which record failed.
    IF updated_row IS NULL THEN
      RAISE EXCEPTION 'bulk_update: version conflict on table % for id %',
        table_name, rec_id
        USING ERRCODE = '40001',                 -- serialization_failure
              DETAIL  = rec_id,
              HINT    = 'Reload the affected records and retry the mass update.';
    END IF;

    RETURN NEXT updated_row;
  END LOOP;

  RETURN;
END;
$$;

COMMENT ON FUNCTION bulk_update(text, jsonb) IS
  'Atomic mass update: applies a JSON array of {id, version, ...changes} to a '
  'public domain table in one transaction with a per-row version gate; any '
  'mismatch rolls back the whole batch (Req 2.3, 11.5, 11.6).';

-- <<< END migrations/0007_bulk_update_rpcs.sql <<<
