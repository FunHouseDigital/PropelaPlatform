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
