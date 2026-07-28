import {
  getData,
  getDataStrict,
  initializeApplicationStorage,
  initializeData,
  migrateApplicationStorage,
  removeData,
  setData,
  setDataStrict,
} from '../storage';
import { LEGACY_STORAGE_PREFIXES, STORAGE_PREFIX } from '../storageKeys';

describe('storage utility functions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  // Fix #10: values are now namespaced under the versioned prefix
  // 'propela_ops_v2_'. Assert against the single source of truth so the tests
  // track any future version bump automatically.
  it('uses the versioned prefix from the shared storageKeys module', () => {
    expect(STORAGE_PREFIX).toBe('propela_ops_v2_');
  });

  describe('getData', () => {
    it('returns null for non-existent keys', () => {
      expect(getData('nonexistent')).toBeNull();
    });

    it('returns parsed JSON for existing keys', () => {
      localStorage.setItem(`${STORAGE_PREFIX}testKey`, JSON.stringify({ name: 'test' }));
      expect(getData('testKey')).toEqual({ name: 'test' });
    });

    it('returns arrays correctly', () => {
      localStorage.setItem(`${STORAGE_PREFIX}list`, JSON.stringify([1, 2, 3]));
      expect(getData('list')).toEqual([1, 2, 3]);
    });

    it('returns null for invalid JSON', () => {
      localStorage.setItem(`${STORAGE_PREFIX}bad`, 'not valid json{');
      expect(getData('bad')).toBeNull();
    });

    it('keeps legacy null-on-error behavior while strict reads expose parse failures', () => {
      localStorage.setItem(`${STORAGE_PREFIX}bad`, 'not valid json{');

      expect(() => getDataStrict('bad')).toThrow(SyntaxError);
      expect(getData('bad')).toBeNull();
    });
  });

  describe('setData', () => {
    it('stores data with the versioned propela_ops_v2_ prefix', () => {
      setData('myKey', { value: 42 });
      const stored = localStorage.getItem(`${STORAGE_PREFIX}myKey`);
      expect(JSON.parse(stored)).toEqual({ value: 42 });
    });

    it('stores string values', () => {
      setData('strKey', 'hello');
      expect(getData('strKey')).toBe('hello');
    });

    it('overwrites existing values', () => {
      setData('key', 'first');
      setData('key', 'second');
      expect(getData('key')).toBe('second');
    });

    it('keeps legacy swallowed-error behavior while strict writes expose serialization failures', () => {
      setData('key', 'persisted');
      const circular = {};
      circular.self = circular;

      expect(() => setDataStrict('key', circular)).toThrow(TypeError);
      expect(() => setData('key', circular)).not.toThrow();
      expect(getData('key')).toBe('persisted');
    });
  });

  describe('removeData', () => {
    it('removes existing keys', () => {
      setData('toDelete', 'value');
      expect(getData('toDelete')).toBe('value');
      removeData('toDelete');
      expect(getData('toDelete')).toBeNull();
    });

    it('does not throw when key does not exist', () => {
      expect(() => removeData('nonexistent')).not.toThrow();
    });
  });

  describe('initializeData', () => {
    it('preserves the exact seven-nurse legacy initialization when storage is empty', () => {
      initializeData();

      const nurses = getData('nurses');
      expect(nurses).toHaveLength(7);
      expect(nurses.map(({ id }) => id)).toEqual([
        'nurse-001',
        'nurse-002',
        'nurse-003',
        'nurse-004',
        'nurse-005',
        'nurse-006',
        'nurse-007',
      ]);
    });

    it('does not overwrite existing data', () => {
      const existingNurses = [{ id: 'existing-1', fullName: 'Existing Nurse' }];
      setData('nurses', existingNurses);
      initializeData();
      const nurses = getData('nurses');
      expect(nurses).toEqual(existingNurses);
    });
  });

  describe('feature-mode application storage initialization', () => {
    it('runs key migration without seeding domain data', () => {
      const legacyPrefix = LEGACY_STORAGE_PREFIXES[0];
      const throttle = { user: { failures: 2 } };
      localStorage.setItem(`${legacyPrefix}loginThrottle`, JSON.stringify(throttle));

      migrateApplicationStorage();

      expect(localStorage.getItem(`${legacyPrefix}loginThrottle`)).toBeNull();
      expect(getData('loginThrottle')).toEqual(throttle);
      expect(getData('nurses')).toBeNull();
      expect(getData('facilities')).toBeNull();
    });

    it('does not seed or replace local nurses during Supabase-mode startup', () => {
      initializeApplicationStorage(true);
      expect(getData('nurses')).toBeNull();

      const legacyNurses = [{ id: 'local-only', fullName: 'Local Nurse' }];
      setData('nurses', legacyNurses);
      initializeApplicationStorage(true);

      expect(getData('nurses')).toEqual(legacyNurses);
    });

    it('initializes the seven bundled nurses during legacy-mode startup', () => {
      initializeApplicationStorage(false);

      expect(getData('nurses')).toHaveLength(7);
    });
  });
});
