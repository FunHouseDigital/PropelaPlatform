import { useState, useMemo, useCallback } from 'react';

/**
 * Lightweight virtualization hook for rendering long lists efficiently.
 * Only renders items visible in the viewport plus an overscan buffer.
 *
 * @param {Object} options
 * @param {Array} options.items - The full list of items
 * @param {number} options.itemHeight - Height of each item in pixels
 * @param {number} options.containerHeight - Height of the scrollable container in pixels
 * @param {number} [options.overscan=5] - Number of extra items to render above/below viewport
 * @returns {{ visibleItems: Array, totalHeight: number, offsetY: number, containerProps: Object }}
 */
export function useVirtualList({ items, itemHeight, containerHeight, overscan = 5 }) {
  const [scrollTop, setScrollTop] = useState(0);

  const totalHeight = items.length * itemHeight;

  const { visibleItems, offsetY } = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const visibleCount = Math.ceil(containerHeight / itemHeight) + 2 * overscan;
    const endIndex = Math.min(items.length, startIndex + visibleCount);

    return {
      visibleItems: items.slice(startIndex, endIndex).map((item, i) => ({
        item,
        index: startIndex + i,
      })),
      offsetY: startIndex * itemHeight,
    };
  }, [items, itemHeight, containerHeight, overscan, scrollTop]);

  const handleScroll = useCallback((e) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const containerProps = {
    onScroll: handleScroll,
    style: {
      height: containerHeight,
      overflow: 'auto',
      position: 'relative',
    },
  };

  return { visibleItems, totalHeight, offsetY, containerProps };
}

export default useVirtualList;
