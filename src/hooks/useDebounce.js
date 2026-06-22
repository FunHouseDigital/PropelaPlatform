import { useRef, useCallback, useEffect } from 'react';

/**
 * Returns a debounced version of the provided callback.
 * The callback will only be invoked after `delay` ms have elapsed
 * since the last call to the returned function.
 *
 * Useful for delaying localStorage writes on text input fields
 * so that saves do not fire on every keystroke.
 *
 * @param {Function} callback - The function to debounce
 * @param {number} delay - Delay in milliseconds (default 500)
 * @returns {Function} - Debounced function
 */
export function useDebounce(callback, delay = 500) {
  const timerRef = useRef(null);
  const callbackRef = useRef(callback);

  // Keep the callback ref current so we always invoke the latest version
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const debouncedFn = useCallback(
    (...args) => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
      }, delay);
    },
    [delay]
  );

  return debouncedFn;
}

export default useDebounce;
