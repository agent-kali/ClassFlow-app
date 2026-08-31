"use client";

import { useSyncExternalStore, type ReactNode } from "react";

/** Client snapshot is always true; nothing external will flip it later. */
const subscribe = () => () => {};

/**
 * The demo's data is seeded around the real current date in a client-side
 * in-memory store, so screens render client-only to avoid a server HTML
 * mismatch. A real backend removes the need for this gate.
 */
export function ClientOnly({ children }: { children: ReactNode }) {
  const mounted = useSyncExternalStore(subscribe, () => true, () => false);
  if (!mounted) return null;
  return children;
}
