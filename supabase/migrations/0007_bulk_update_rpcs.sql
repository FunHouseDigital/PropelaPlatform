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
