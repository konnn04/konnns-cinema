'use client';

import { useSyncExternalStore } from 'react';

const emptySubscribe = () => () => {};

// True only after client hydration completes. Needed when a zustand persist
// store's rehydrated (localStorage) value would otherwise differ from the
// server-rendered markup and trigger a hydration mismatch.
export function useHasMounted() {
  return useSyncExternalStore(emptySubscribe, () => true, () => false);
}
