import { seedNurses } from './seedData.js'
import { seedOrganisations } from './seedOrganisations.js'

const PREFIX = 'propela_ops_'

const KEYS = {
  nurses: `${PREFIX}nurses`,
  cohorts: `${PREFIX}cohorts`,
  organisations: `${PREFIX}organisations`,
  initialized: `${PREFIX}initialized`,
}

/**
 * Initialize the store with seed data if not already populated.
 */
export function initializeStore() {
  const isInitialized = localStorage.getItem(KEYS.initialized)
  if (!isInitialized) {
    localStorage.setItem(KEYS.nurses, JSON.stringify(seedNurses))
    localStorage.setItem(KEYS.organisations, JSON.stringify(seedOrganisations))
    localStorage.setItem(KEYS.cohorts, JSON.stringify([
      {
        id: 'cohort-1',
        name: 'Cohort 1',
        status: 'Active',
        startDate: '2026-03-01',
        nurseCount: 67,
        description: 'First cohort - OET Fast Track programme',
      },
    ]))
    localStorage.setItem(KEYS.initialized, 'true')
  }
}

/**
 * Get all nurses from localStorage.
 */
export function getNurses() {
  const data = localStorage.getItem(KEYS.nurses)
  return data ? JSON.parse(data) : []
}

/**
 * Save nurses to localStorage.
 */
export function setNurses(nurses) {
  localStorage.setItem(KEYS.nurses, JSON.stringify(nurses))
}

/**
 * Get a single nurse by ID.
 */
export function getNurseById(id) {
  const nurses = getNurses()
  return nurses.find(n => n.id === id) || null
}

/**
 * Update a single nurse record.
 */
export function updateNurse(id, updates) {
  const nurses = getNurses()
  const index = nurses.findIndex(n => n.id === id)
  if (index !== -1) {
    nurses[index] = { ...nurses[index], ...updates }
    setNurses(nurses)
    return nurses[index]
  }
  return null
}

/**
 * Get all cohorts from localStorage.
 */
export function getCohorts() {
  const data = localStorage.getItem(KEYS.cohorts)
  return data ? JSON.parse(data) : []
}

/**
 * Save cohorts to localStorage.
 */
export function setCohorts(cohorts) {
  localStorage.setItem(KEYS.cohorts, JSON.stringify(cohorts))
}

/**
 * Get all organisations from localStorage.
 */
export function getOrganisations() {
  const data = localStorage.getItem(KEYS.organisations)
  return data ? JSON.parse(data) : []
}

/**
 * Save organisations to localStorage.
 */
export function setOrganisations(organisations) {
  localStorage.setItem(KEYS.organisations, JSON.stringify(organisations))
}
