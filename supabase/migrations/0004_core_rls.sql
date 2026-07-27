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
