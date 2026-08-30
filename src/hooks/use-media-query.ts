'use client';

import { useSyncExternalStore, useCallback } from 'react';

/**
 * Hook for responsive breakpoint detection.
 * Returns true if the given media query matches.
 * Uses useSyncExternalStore for correct concurrent-mode behavior.
 *
 * @example
 * const isMobile = useMediaQuery('(max-width: 768px)');
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (callback: () => void) => {
      const mediaQuery = window.matchMedia(query);
      mediaQuery.addEventListener('change', callback);
      return () => mediaQuery.removeEventListener('change', callback);
    },
    [query]
  );

  const getSnapshot = useCallback(() => {
    return window.matchMedia(query).matches;
  }, [query]);

  const getServerSnapshot = useCallback(() => {
    return false;
  }, []);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
