"use client";

import { useEffect, useState, type ReactNode } from "react";

/**
 * The demo's data is seeded around the real current date in a client-side
 * in-memory store, so screens render client-only to avoid a server HTML
 * mismatch. A real backend removes the need for this gate.
 */
export function ClientOnly({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return children;
}
