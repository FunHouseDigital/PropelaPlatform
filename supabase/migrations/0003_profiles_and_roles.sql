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
