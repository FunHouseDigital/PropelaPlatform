import { getData, setData, removeData, initializeData } from '../storage';

describe('storage utility functions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('getData', () => {
    it('returns null for non-existent keys', () => {
      expect(getData('nonexistent')).toBeNull();
    });

    it('returns parsed JSON for existing keys', () => {
      localStorage.setItem('propela_ops_testKey', JSON.stringify({ name: 'test' }));
      expect(getData('testKey')).toEqual({ name: 'test' });
    });

    it('returns arrays correctly', () => {
      localStorage.setItem('propela_ops_list', JSON.stringify([1, 2, 3]));
      expect(getData('list')).toEqual([1, 2, 3]);
    });

    it('returns null for invalid JSON', () => {
      localStorage.setItem('propela_ops_bad', 'not valid json{');
      expect(getData('bad')).toBeNull();
    });
  });

  describe('setData', () => {
    it('stores data with the propela_ops_ prefix', () => {
      setData('myKey', { value: 42 });
      const stored = localStorage.getItem('propela_ops_myKey');
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
    it('seeds data when localStorage is empty', () => {
      initializeData();
      // Nurses should be seeded
      const nurses = getData('nurses');
      expect(nurses).not.toBeNull();
      expect(Array.isArray(nurses)).toBe(true);
      expect(nurses.length).toBeGreaterThan(0);
    });

    it('does not overwrite existing data', () => {
      const existingNurses = [{ id: 'existing-1', fullName: 'Existing Nurse' }];
      setData('nurses', existingNurses);
      initializeData();
      const nurses = getData('nurses');
      expect(nurses).toEqual(existingNurses);
    });
  });
});
