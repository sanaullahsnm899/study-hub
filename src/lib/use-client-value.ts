"use client";

import { useSyncExternalStore } from "react";

const noopSubscribe = () => () => {};

/**
 * Read a browser-only value without a setState-in-effect round trip.
 * Renders `serverValue` on the server and during hydration, then the real one.
 */
export function useClientValue<T>(getSnapshot: () => T, serverValue: T): T {
  return useSyncExternalStore(noopSubscribe, getSnapshot, () => serverValue);
}

/** True once the component is running in the browser. */
export function useIsClient(): boolean {
  return useClientValue(() => true, false);
}
