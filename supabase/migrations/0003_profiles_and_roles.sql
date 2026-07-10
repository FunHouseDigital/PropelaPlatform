-- =============================================================================
-- Migration 0003 — profiles table + current_role_name() helper
-- Feature: supabase-online-platform  (Task 4.3)
-- Requirements: 4.1, 4.7
-- =============================================================================
-- Roles are stored in a profiles table (one row per auth.users id, exactly one
-- role from {Recruiter, Admin}, Req 4.1). RLS policies resolve the caller's
-- role via current_role_name(), a DB lookup rather than a JWT claim, so a role
-- change takes effect without requiring the user to re-login.
--
-- A user with no profiles row resolves to NULL, and every policy's
-- `current_role_name() = '...'` check fails on NULL — enforcing
-- "no role => no access" (Req 4.7).
-- =============================================================================

CREATE TABLE IF NOT EXISTS profiles (
  user_id    uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text NOT NULL CHECK (role IN ('Recruiter', 'Admin')),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Helper used by every RLS policy. STABLE (result is constant within a
-- statement) and SECURITY DEFINER so it can read `profiles` even while a policy
-- check is being evaluated for the calling (possibly restricted) user.
-- Returns NULL when the caller has no profile row (Req 4.7).
CREATE OR REPLACE FUNCTION current_role_name() RETURNS text AS $$
  SELECT role FROM profiles WHERE user_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;
