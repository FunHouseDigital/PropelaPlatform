import { useMemo, useSyncExternalStore } from 'react';

export default function useMediaQuery(query) {
  const { subscribe, getSnapshot } = useMemo(() => {
    return {
      subscribe(callback) {
        const mediaQuery = window.matchMedia(query);
        mediaQuery.addEventListener('change', callback);
        return () => mediaQuery.removeEventListener('change', callback);
      },
      getSnapshot() {
        return window.matchMedia(query).matches;
      },
    };
  }, [query]);

  return useSyncExternalStore(subscribe, getSnapshot);
}
