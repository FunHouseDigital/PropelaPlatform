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
