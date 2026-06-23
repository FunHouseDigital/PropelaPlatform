import { renderHook, act } from '@testing-library/react';
import useMediaQuery from '../useMediaQuery';

describe('useMediaQuery', () => {
  let listeners;

  beforeEach(() => {
    listeners = [];
    window.matchMedia = vi.fn((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: (event, cb) => {
        listeners.push(cb);
      },
      removeEventListener: (event, cb) => {
        listeners = listeners.filter((l) => l !== cb);
      },
      dispatchEvent: () => {},
    }));
  });

  it('returns false when media query does not match', () => {
    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
    expect(result.current).toBe(false);
  });

  it('returns true when media query matches', () => {
    window.matchMedia = vi.fn((query) => ({
      matches: true,
      media: query,
      onchange: null,
      addEventListener: (event, cb) => {
        listeners.push(cb);
      },
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }));

    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('responds to media query changes', () => {
    let currentMatches = false;
    window.matchMedia = vi.fn((query) => ({
      get matches() {
        return currentMatches;
      },
      media: query,
      onchange: null,
      addEventListener: (event, cb) => {
        listeners.push(cb);
      },
      removeEventListener: (event, cb) => {
        listeners = listeners.filter((l) => l !== cb);
      },
      dispatchEvent: () => {},
    }));

    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
    expect(result.current).toBe(false);

    // Simulate a change event
    act(() => {
      currentMatches = true;
      listeners.forEach((cb) => cb());
    });

    expect(result.current).toBe(true);
  });

  it('cleans up listener on unmount', () => {
    const removeEventListener = vi.fn();
    window.matchMedia = vi.fn((query) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener,
      dispatchEvent: () => {},
    }));

    const { unmount } = renderHook(() => useMediaQuery('(min-width: 1024px)'));
    unmount();
    expect(removeEventListener).toHaveBeenCalledWith('change', expect.any(Function));
  });
});
