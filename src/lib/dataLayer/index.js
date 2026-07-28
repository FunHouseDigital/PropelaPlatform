/**
 * Data_Layer facade — flag-based adapter router (Task 2.4).
 *
 * Reads the `SUPABASE_BACKEND` feature flag exactly once at module
 * initialization and binds every Data_Layer operation to exactly one adapter:
 * the legacy `storageAdapter` (flag OFF, the live default) or the
 * `supabaseAdapter` (flag ON). Because the selection happens once and all
 * traffic flows through the chosen `adapter`, exactly one adapter services every
 * operation — satisfying the routing mutual-exclusion requirements (Req 9.1,
 * 9.2; Property 6).
 *
 * The facade exposes two coordinated surfaces:
 *   1. Generic operations parameterized by domain name (`list`, `getById`,
 *      `create`, `update`, `remove`, `bulkUpsert`, `getCollection`,
 *      `saveCollection`).
 *   2. Per-domain bindings generated from the registry — including a `legacy`
 *      map keyed by the exact `storage.js` function names (getNurses,
 *      saveNurses, …) so existing callers can adopt the facade with a mechanical
 *      import swap (Req 6.1).
 */

import { isFeatureEnabled } from '../featureFlags';
import { listDomains } from './domains';
import * as storageAdapter from './storageAdapter';
import * as supabaseAdapter from './supabaseAdapter';

/**
 * Resolve the active adapter once at import time. A page reload is required for
 * a flag change to take effect (consistent with `featureFlags` semantics).
 */
export const isSupabaseBackend = isFeatureEnabled('SUPABASE_BACKEND');
const adapter = isSupabaseBackend ? supabaseAdapter : storageAdapter;

// ---- Stable nurse record operations ---------------------------------------

const NURSE_DOMAIN = 'nurses';

/**
 * Nurse management uses this explicit record-level surface rather than the
 * whole-collection compatibility API below. Each function closes over the
 * adapter selected above, so neither a feature-flag change nor a failed request
 * can switch persistence backends during the current module lifetime.
 */
export const listNurses = (...args) => adapter.listNurses(...args);
export const getNurse = (...args) => adapter.getNurse(...args);
export const createNurse = (...args) => adapter.createNurse(...args);
export const updateNurse = (...args) => adapter.updateNurse(...args);
export const deleteNurse = (...args) => adapter.deleteNurse(...args);

/**
 * Persist a pipeline stage/readiness pair through the same version-gated update
 * operation used by ordinary nurse edits.
 *
 * @param {string} id Nurse identifier.
 * @param {{ pipelineStage: string, readinessStatus: string }} changes
 * @param {number} baseVersion Last server-confirmed nurse version.
 */
export const changeNursePipeline = (id, changes, baseVersion) =>
  updateNurse(id, changes, baseVersion);

/**
 * Deliberately record-only workflow API. Whole-collection `getNurses` and
 * `saveNurses` remain available through `legacy`/`perDomain` for compatibility,
 * but are not exposed here and must not be used by the Supabase nurse workflow.
 */
export const nurseOps = Object.freeze({
  list: listNurses,
  get: getNurse,
  create: createNurse,
  update: updateNurse,
  changePipeline: changeNursePipeline,
  remove: deleteNurse,
});

// ---- Generic, domain-parameterized operations -----------------------------

/** List records for a collection domain (paginated, filterable, sortable). */
export const list = (name, opts) => adapter.list(name, opts);

/** Read a single record by primary key. */
export const getById = (name, id) => adapter.getById(name, id);

/** Create a single record. */
export const create = (name, record) => adapter.create(name, record);

/** Conditionally update a record, carrying the last-read `baseVersion`. */
export const update = (name, id, changes, baseVersion) =>
  adapter.update(name, id, changes, baseVersion);

/** Conditionally delete a record, carrying the last-read `baseVersion`. */
export const remove = (name, id, baseVersion) => adapter.remove(name, id, baseVersion);

/** Non-atomic bulk create-or-update by primary key. */
export const bulkUpsert = (name, records) => adapter.bulkUpsert(name, records);

/**
 * Atomic, all-or-none mass update carrying each record's last-read `version`.
 * Routes to the active adapter's transactional bulk-update path (Postgres RPC
 * when the Supabase backend is active; client-side all-or-none otherwise).
 */
export const bulkUpdate = (name, records) => adapter.bulkUpdate(name, records);

/** Whole-collection retrieval mirroring `storage.js` getX(). */
export const getCollection = (name) => adapter.getCollection(name);

/** Whole-collection persistence mirroring `storage.js` saveX(value). */
export const saveCollection = (name, value) => adapter.saveCollection(name, value);

// ---- Per-domain bindings generated from the registry ----------------------

/**
 * Rich per-domain operations keyed by canonical domain name, e.g.
 * `domainOps.nurses.list({ page })` or `domainOps.placements.update(id, ...)`.
 * @type {Record<string, {
 *   list: Function, get: Function, create: Function, update: Function,
 *   remove: Function, bulkUpsert: Function, getAll: Function, saveAll: Function
 * }>}
 */
export const domainOps = {};

/**
 * Compatibility bindings keyed by the exact `storage.js` function name so
 * existing modules can migrate with a one-line import change. Whole-collection
 * getters/savers only (mirrors the current storage surface).
 * @type {Record<string, Function>}
 */
export const legacy = {};

for (const domain of listDomains()) {
  const { name, legacyGetter, legacySaver } = domain;

  const nurseDomain = name === NURSE_DOMAIN;
  domainOps[name] = {
    list: nurseDomain ? listNurses : (opts) => adapter.list(name, opts),
    get: nurseDomain ? getNurse : (id) => adapter.getById(name, id),
    create: nurseDomain ? createNurse : (record) => adapter.create(name, record),
    update: nurseDomain
      ? updateNurse
      : (id, changes, baseVersion) => adapter.update(name, id, changes, baseVersion),
    remove: nurseDomain ? deleteNurse : (id, baseVersion) => adapter.remove(name, id, baseVersion),
    bulkUpsert: (records) => adapter.bulkUpsert(name, records),
    bulkUpdate: (records) => adapter.bulkUpdate(name, records),
    getAll: () => adapter.getCollection(name),
    saveAll: (value) => adapter.saveCollection(name, value),
  };

  if (legacyGetter) {
    legacy[legacyGetter] = () => adapter.getCollection(name);
  }
  if (legacySaver) {
    legacy[legacySaver] = (value) => adapter.saveCollection(name, value);
  }
}

/**
 * Flat per-domain bindings generated from the registry and routed through the
 * active adapter, e.g. `perDomain.listNurses({ page })`, `perDomain.getNurse(id)`,
 * `perDomain.createNurse(rec)`, `perDomain.updateNurse(id, changes, v)`,
 * `perDomain.deleteNurse(id, v)`, and the whole-collection `perDomain.saveNurses(arr)`
 * compatibility shim. These mirror the design's per-domain public API names and
 * work identically whether the flag is ON (Supabase) or OFF (legacy), since both
 * adapters expose the same generic operations (Req 6.1, 1.1, 1.2, 2.1).
 * @type {Record<string, Function>}
 */
export const perDomain = {};

/** Capitalize the first character of a domain name. */
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/** Naive singularization for building `getNurse`/`createNurse`-style names. */
function singularize(name) {
  if (/ies$/.test(name)) return name.replace(/ies$/, 'y');
  if (/sses$/.test(name)) return name.replace(/es$/, '');
  if (/s$/.test(name)) return name.replace(/s$/, '');
  return name;
}

for (const domain of listDomains()) {
  const { name, legacyGetter, legacySaver } = domain;
  const plural = capitalize(name);
  const singular = capitalize(singularize(name));

  const nurseDomain = name === NURSE_DOMAIN;
  perDomain[`list${plural}`] = nurseDomain ? listNurses : (opts) => adapter.list(name, opts);
  perDomain[`get${singular}`] = nurseDomain ? getNurse : (id) => adapter.getById(name, id);
  perDomain[`create${singular}`] = nurseDomain
    ? createNurse
    : (record) => adapter.create(name, record);
  perDomain[`update${singular}`] = nurseDomain
    ? updateNurse
    : (id, changes, baseVersion) => adapter.update(name, id, changes, baseVersion);
  perDomain[`delete${singular}`] = nurseDomain
    ? deleteNurse
    : (id, baseVersion) => adapter.remove(name, id, baseVersion);
  perDomain[`bulkUpsert${plural}`] = (records) => adapter.bulkUpsert(name, records);
  perDomain[`bulkUpdate${plural}`] = (records) => adapter.bulkUpdate(name, records);

  if (legacyGetter) {
    perDomain[legacyGetter] = () => adapter.getCollection(name);
  }
  if (legacySaver) {
    perDomain[legacySaver] = (value) => adapter.saveCollection(name, value);
  }
}

/**
 * Default export bundles the generic operations, the per-domain and legacy
 * bindings, and the resolved routing flag for diagnostics/tests.
 */
const dataLayer = {
  isSupabaseBackend,
  listNurses,
  getNurse,
  createNurse,
  updateNurse,
  changeNursePipeline,
  deleteNurse,
  nurseOps,
  list,
  getById,
  create,
  update,
  remove,
  bulkUpsert,
  bulkUpdate,
  getCollection,
  saveCollection,
  domainOps,
  legacy,
  perDomain,
};

export default dataLayer;
