import { useRef, useCallback, useEffect, useState } from 'react';

/**
 * Returns a debounced version of the provided callback along with a flush function.
 * The callback will only be invoked after `delay` ms have elapsed
 * since the last call to the returned function.
 *
 * Call `flush()` to immediately execute any pending debounced call
 * (e.g. before unmount or when a modal closes).
 *
 * Useful for delaying localStorage writes on text input fields
 * so that saves do not fire on every keystroke.
 *
 * @param {Function} callback - The function to debounce
 * @param {number} delay - Delay in milliseconds (default 500)
 * @returns {{ debouncedFn: Function, flush: Function }}
 */
export function useDebounce(callback, delay = 500) {
  const timerRef = useRef(null);
  const callbackRef = useRef(callback);
  const pendingArgsRef = useRef(null);

  // Keep the callback ref current so we always invoke the latest version
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Clean up on unmount - flush any pending call
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
        if (pendingArgsRef.current !== null) {
          callbackRef.current(...pendingArgsRef.current);
          pendingArgsRef.current = null;
        }
      }
    };
  }, []);

  const debouncedFn = useCallback(
    (...args) => {
      pendingArgsRef.current = args;
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      timerRef.current = setTimeout(() => {
        callbackRef.current(...args);
        pendingArgsRef.current = null;
        timerRef.current = null;
      }, delay);
    },
    [delay]
  );

  const flush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      if (pendingArgsRef.current !== null) {
        callbackRef.current(...pendingArgsRef.current);
        pendingArgsRef.current = null;
      }
    }
  }, []);

  // Return both the debounced function and the flush helper.
  // For backwards compatibility, calling the return value directly still works
  // since we attach flush as a property.
  debouncedFn.flush = flush;
  return debouncedFn;
}

/**
 * Returns a debounced version of a value. The returned value only updates
 * after `delay` ms have passed without the input value changing.
 *
 * Useful for debouncing search input values before triggering filtering.
 *
 * @param {*} value - The value to debounce
 * @param {number} delay - Delay in milliseconds (default 300)
 * @returns {*} The debounced value
 */
export function useDebouncedValue(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

export default useDebounce;
