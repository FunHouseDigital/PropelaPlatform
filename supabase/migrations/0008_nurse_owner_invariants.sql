-- =============================================================================
-- Migration 0008 — Nurse ownership invariants
-- Feature: nurse-management (Task 7.2)
-- Requirements: 3.4, 4.10, 9.1, 9.2, 9.4, 9.6
-- =============================================================================
-- Nurse inserts are attributed to the authenticated caller at the database
-- boundary. A caller may omit owner_id (the trigger fills it from auth.uid()),
-- but may not create a nurse for another user. Once created, owner_id is
-- immutable.
--
-- Update authorization remains the responsibility of the existing operational
-- RLS policies. In particular, the UPDATE branch compares NEW.owner_id only to
-- OLD.owner_id; it does not compare the row owner to auth.uid(). This preserves
-- Admin/Superadmin/Recruiter access to update nurses created by another
-- operational user while preventing ownership transfer.
--
-- This trigger is SECURITY INVOKER and uses auth.uid() from the request JWT. It
-- does not replace or bypass RLS, and it leaves trg_bump_version untouched.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_nurse_owner_invariant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = ''
AS $$
DECLARE
  caller_id uuid := auth.uid();
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF caller_id IS NULL THEN
      RAISE EXCEPTION 'nurse creation requires an authenticated user'
        USING ERRCODE = '42501';
    END IF;

    IF NEW.owner_id IS NULL THEN
      NEW.owner_id := caller_id;
    ELSIF NEW.owner_id IS DISTINCT FROM caller_id THEN
      RAISE EXCEPTION 'nurse owner must match the authenticated user'
        USING ERRCODE = '42501';
    END IF;
  ELSIF TG_OP = 'UPDATE' AND NEW.owner_id IS DISTINCT FROM OLD.owner_id THEN
    RAISE EXCEPTION 'nurse owner cannot be changed'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_nurse_owner ON public.nurses;
CREATE TRIGGER trg_enforce_nurse_owner
  BEFORE INSERT OR UPDATE ON public.nurses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_nurse_owner_invariant();
