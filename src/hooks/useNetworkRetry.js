import { useState, useCallback, useRef, useEffect } from 'react';
import useOnlineStatus from './useOnlineStatus';
import { captureException, addBreadcrumb } from '../lib/errorReporter';

/**
 * Default configuration for network retry behavior.
 */
const DEFAULT_OPTIONS = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  onRetry: null,
  onError: null,
  onSuccess: null,
};

/**
 * Calculate exponential backoff delay with jitter.
 * @param {number} attempt - Current attempt number (0-indexed)
 * @param {number} baseDelay - Base delay in ms
 * @param {number} maxDelay - Maximum delay cap in ms
 * @returns {number} Delay in ms
 */
function getBackoffDelay(attempt, baseDelay, maxDelay) {
  const exponentialDelay = baseDelay * Math.pow(2, attempt);
  const jitter = Math.random() * baseDelay * 0.1;
  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Hook providing a retryable fetch wrapper with exponential backoff.
 *
 * Features:
 * - Exponential backoff with configurable delays
 * - Automatic cancel on unmount
 * - Online/offline awareness
 * - Breadcrumb logging for debugging
 *
 * @param {Object} [options] - Configuration options
 * @param {number} [options.maxRetries=3] - Maximum number of retries
 * @param {number} [options.baseDelay=1000] - Base delay in ms for backoff
 * @param {number} [options.maxDelay=10000] - Maximum delay cap in ms
 * @param {Function} [options.onRetry] - Callback on each retry (attempt, error)
 * @param {Function} [options.onError] - Callback on final failure (error)
 * @param {Function} [options.onSuccess] - Callback on success (data)
 * @returns {Object} { execute, isLoading, error, data, reset }
 */
export default function useNetworkRetry(options = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };
  const { isOnline } = useOnlineStatus();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);
  const timeoutRef = useRef(null);

  // Store callbacks in refs so they can be updated without invalidating execute
  const onRetryRef = useRef(config.onRetry);
  const onErrorRef = useRef(config.onError);
  const onSuccessRef = useRef(config.onSuccess);

  useEffect(() => {
    onRetryRef.current = config.onRetry;
    onErrorRef.current = config.onError;
    onSuccessRef.current = config.onSuccess;
  });

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  const execute = useCallback(
    async (fetchFn) => {
      if (!isOnline) {
        const offlineError = new Error('No network connection');
        setError(offlineError);
        onErrorRef.current?.(offlineError);
        return { success: false, error: offlineError };
      }

      setIsLoading(true);
      setError(null);
      setData(null);

      // Cancel any in-flight request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      let lastError = null;

      for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        if (!isMountedRef.current) {
          return { success: false, error: new Error('Component unmounted') };
        }

        abortControllerRef.current = new AbortController();
        const { signal } = abortControllerRef.current;

        try {
          addBreadcrumb('api', `Network request attempt ${attempt + 1}/${config.maxRetries + 1}`);
          const result = await fetchFn(signal);

          if (!isMountedRef.current) {
            return { success: false, error: new Error('Component unmounted') };
          }

          setData(result);
          setIsLoading(false);
          setError(null);
          onSuccessRef.current?.(result);
          return { success: true, data: result };
        } catch (err) {
          lastError = err;

          // Do not retry if the request was intentionally aborted
          if (err.name === 'AbortError') {
            if (!isMountedRef.current) {
              return { success: false, error: err };
            }
            setIsLoading(false);
            setError(err);
            return { success: false, error: err };
          }

          // If we have retries remaining, wait and try again
          if (attempt < config.maxRetries) {
            onRetryRef.current?.(attempt + 1, err);
            addBreadcrumb('api', `Retry ${attempt + 1} after error: ${err.message}`);

            const delay = getBackoffDelay(attempt, config.baseDelay, config.maxDelay);
            await new Promise((resolve) => {
              timeoutRef.current = setTimeout(resolve, delay);
            });
          }
        }
      }

      // All retries exhausted
      if (isMountedRef.current) {
        setIsLoading(false);
        setError(lastError);
        onErrorRef.current?.(lastError);
        captureException(lastError, {
          component: 'useNetworkRetry',
          userAction: 'network request',
          severity: 'error',
        });
      }

      return { success: false, error: lastError };
    },
    [isOnline, config.maxRetries, config.baseDelay, config.maxDelay]
  );

  const reset = useCallback(() => {
    setIsLoading(false);
    setError(null);
    setData(null);
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  return { execute, isLoading, error, data, reset };
}
