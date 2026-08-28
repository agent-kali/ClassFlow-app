"use client";

import { useEffect, useState } from "react";

/** The manager schedule's phone breakpoint, matching Tailwind's `md`. */
export const NARROW_BREAKPOINT = 768;

/**
 * True below the phone breakpoint. Starts false so the server and the first
 * client render agree; the media query settles it immediately after mount.
 */
export function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${NARROW_BREAKPOINT - 1}px)`);
    const sync = () => setNarrow(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return narrow;
}
