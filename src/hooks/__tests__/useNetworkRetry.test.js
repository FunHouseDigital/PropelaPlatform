import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import useNetworkRetry from '../useNetworkRetry';

// Mock useOnlineStatus
vi.mock('../useOnlineStatus', () => ({
  default: vi.fn(() => ({ isOnline: true })),
}));

// Mock errorReporter
vi.mock('../../lib/errorReporter', () => ({
  captureException: vi.fn(),
  addBreadcrumb: vi.fn(),
}));

describe('useNetworkRetry', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns data on successful fetch', async () => {
    vi.useRealTimers();
    const mockData = { id: 1, name: 'Test' };
    const fetchFn = vi.fn().mockResolvedValue(mockData);

    const { result } = renderHook(() => useNetworkRetry());

    let response;
    await act(async () => {
      response = await result.current.execute(fetchFn);
    });

    expect(response.success).toBe(true);
    expect(response.data).toEqual(mockData);
    expect(result.current.data).toEqual(mockData);
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('retries on failure with exponential backoff', async () => {
    const mockError = new Error('Network error');
    const mockData = { id: 1 };
    const fetchFn = vi.fn()
      .mockRejectedValueOnce(mockError)
      .mockRejectedValueOnce(mockError)
      .mockResolvedValueOnce(mockData);

    const onRetry = vi.fn();

    const { result } = renderHook(() =>
      useNetworkRetry({ maxRetries: 3, baseDelay: 100, onRetry })
    );

    let responsePromise;
    await act(async () => {
      responsePromise = result.current.execute(fetchFn);
      // Advance through the first retry delay
      await vi.advanceTimersByTimeAsync(200);
      // Advance through the second retry delay
      await vi.advanceTimersByTimeAsync(400);
    });

    const response = await responsePromise;

    expect(fetchFn).toHaveBeenCalledTimes(3);
    expect(onRetry).toHaveBeenCalledTimes(2);
    expect(response.success).toBe(true);
    expect(response.data).toEqual(mockData);
  });

  it('gives up after max retries and reports error', async () => {
    const mockError = new Error('Persistent failure');
    const fetchFn = vi.fn().mockRejectedValue(mockError);
    const onError = vi.fn();

    const { result } = renderHook(() =>
      useNetworkRetry({ maxRetries: 2, baseDelay: 50, onError })
    );

    let responsePromise;
    await act(async () => {
      responsePromise = result.current.execute(fetchFn);
      // Advance through all retry delays
      await vi.advanceTimersByTimeAsync(50);
      await vi.advanceTimersByTimeAsync(150);
    });

    const response = await responsePromise;

    expect(fetchFn).toHaveBeenCalledTimes(3); // initial + 2 retries
    expect(response.success).toBe(false);
    expect(response.error.message).toBe('Persistent failure');
    expect(result.current.error).not.toBeNull();
    expect(onError).toHaveBeenCalledWith(mockError);
  });

  it('does not retry when offline', async () => {
    vi.useRealTimers();
    const { default: useOnlineStatus } = await import('../useOnlineStatus');
    useOnlineStatus.mockReturnValue({ isOnline: false });

    const fetchFn = vi.fn().mockResolvedValue({ ok: true });
    const onError = vi.fn();

    const { result } = renderHook(() => useNetworkRetry({ onError }));

    let response;
    await act(async () => {
      response = await result.current.execute(fetchFn);
    });

    expect(fetchFn).not.toHaveBeenCalled();
    expect(response.success).toBe(false);
    expect(response.error.message).toBe('No network connection');
    expect(onError).toHaveBeenCalled();

    // Restore mock
    useOnlineStatus.mockReturnValue({ isOnline: true });
  });

  it('cancels in-flight requests on reset', async () => {
    vi.useRealTimers();
    const fetchFn = vi.fn((_signal) => new Promise(() => {})); // Never resolves

    const { result } = renderHook(() => useNetworkRetry());

    act(() => {
      result.current.execute(fetchFn);
    });

    act(() => {
      result.current.reset();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.data).toBeNull();
  });

  it('does not update state after unmount', async () => {
    vi.useRealTimers();
    const mockData = { id: 1 };
    let resolvePromise;
    const fetchFn = vi.fn(
      () => new Promise((resolve) => { resolvePromise = resolve; })
    );

    const { result, unmount } = renderHook(() => useNetworkRetry());

    act(() => {
      result.current.execute(fetchFn);
    });

    // Unmount the component before the fetch resolves
    unmount();

    // Resolve the fetch - should not cause errors
    await act(async () => {
      resolvePromise(mockData);
    });

    // No error thrown means the test passes - state updates were skipped
  });
});
