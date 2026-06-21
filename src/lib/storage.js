import { seedNurses } from '../data/seedNurses';
import { seedFacilities } from '../data/seedFacilities';

const STORAGE_PREFIX = 'propela_ops_';

/**
 * Get data from localStorage by key.
 */
export function getData(key) {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + key);
    if (raw === null) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading localStorage key "${key}":`, e);
    return null;
  }
}

/**
 * Set data in localStorage by key.
 */
export function setData(key, value) {
  try {
    localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.error(`Error writing localStorage key "${key}":`, e);
  }
}

/**
 * Remove data from localStorage by key.
 */
export function removeData(key) {
  try {
    localStorage.removeItem(STORAGE_PREFIX + key);
  } catch (e) {
    console.error(`Error removing localStorage key "${key}":`, e);
  }
}

/**
 * Initialize data on first load.
 * Seeds nurse and facility data if no data exists.
 */
export function initializeData() {
  const nurses = getData('nurses');
  if (!nurses || nurses.length === 0) {
    const seededNurses = seedNurses();
    setData('nurses', seededNurses);
  }

  const facilities = getData('facilities');
  if (!facilities || facilities.length === 0) {
    const seededFacilities = seedFacilities();
    setData('facilities', seededFacilities);
  }
}

/**
 * Get all nurses from localStorage.
 */
export function getNurses() {
  return getData('nurses') || [];
}

/**
 * Save all nurses to localStorage.
 */
export function saveNurses(nurses) {
  setData('nurses', nurses);
}

/**
 * Get all facilities from localStorage.
 */
export function getFacilities() {
  return getData('facilities') || [];
}

/**
 * Save all facilities to localStorage.
 */
export function saveFacilities(facilities) {
  setData('facilities', facilities);
}
