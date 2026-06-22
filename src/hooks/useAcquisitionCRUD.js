import { useState, useMemo, useCallback } from 'react';
import { getData, setData } from '../lib/storage';

/**
 * Reusable hook encapsulating the common CRUD pattern shared across
 * OrganisationsTrack, ReferralTrack, CommunityTrack, and EventsTrack.
 *
 * @param {string} storageKey - The localStorage key (without prefix) e.g. 'facilities'
 * @param {Function} getterFn - Storage getter function (e.g. getFacilities)
 * @param {Function} saverFn - Storage saver function (e.g. saveFacilities)
 * @param {Object} options
 * @param {Function} options.searchFilter - Custom search filter function(item, query) => boolean
 * @returns {{ items, setItems, addItem, updateItem, deleteItem, filtered }}
 */
export function useAcquisitionCRUD(getterFn, saverFn, options = {}) {
  const [items, setItems] = useState(() => getterFn());
  const [searchQuery, setSearchQuery] = useState('');

  const { searchFilter } = options;

  const addItem = useCallback(
    (newItem) => {
      const updated = [newItem, ...items];
      setItems(updated);
      saverFn(updated);
      return updated;
    },
    [items, saverFn]
  );

  const updateItem = useCallback(
    (itemId, field, value) => {
      const updated = items.map((item) =>
        item.id === itemId ? { ...item, [field]: value } : item
      );
      setItems(updated);
      saverFn(updated);
      return updated;
    },
    [items, saverFn]
  );

  const updateItemFull = useCallback(
    (itemId, updatedItem) => {
      const updated = items.map((item) =>
        item.id === itemId ? updatedItem : item
      );
      setItems(updated);
      saverFn(updated);
      return updated;
    },
    [items, saverFn]
  );

  const deleteItem = useCallback(
    (itemId) => {
      const updated = items.filter((item) => item.id !== itemId);
      setItems(updated);
      saverFn(updated);
      return updated;
    },
    [items, saverFn]
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    if (searchFilter) {
      return items.filter((item) => searchFilter(item, q));
    }
    // Default: search across all string values
    return items.filter((item) =>
      Object.values(item).some(
        (val) => typeof val === 'string' && val.toLowerCase().includes(q)
      )
    );
  }, [items, searchQuery, searchFilter]);

  return {
    items,
    setItems,
    addItem,
    updateItem,
    updateItemFull,
    deleteItem,
    filtered,
    searchQuery,
    setSearchQuery,
  };
}

export default useAcquisitionCRUD;
