"use client";

import { useEffect } from "react";
import { useAuthStore } from "./authStore";
import { useScheduleStatus } from "./hooks";
import { useClassFlowStore } from "./store";

/**
 * Loads the schedule from the backend once, and holds the screen until it is
 * there. If the API cannot be reached the manager is told so and offered a
 * retry — the schedule is never quietly replaced with generated lessons,
 * because a wrong schedule is worse than a missing one.
 */
export function ScheduleBoundary({ children }: { children: React.ReactNode }) {
  const { status, error, load } = useScheduleStatus();
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const loadErrorStatus = useClassFlowStore((s) => s.loadErrorStatus);

  useEffect(() => {
    if (status === "idle") void load(userId);
  }, [status, load, userId]);

  if (loadErrorStatus === 401) {
    return (
      <div className="flex h-dvh items-center justify-center" role="status">
        <p className="text-[13px] text-ink-mute">Checking session…</p>
      </div>
    );
  }

  if (status === "ready") return <>{children}</>;

  if (status === "error") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-[17px] font-semibold">The schedule could not be loaded</h1>
        <p className="max-w-md text-[13px] text-ink-mute">{error}</p>
        <button
          type="button"
          onClick={() => void load()}
          className="mt-1 rounded bg-accent px-3 py-1.5 text-[13px] font-semibold text-accent-ink hover:opacity-90"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div
      className="flex h-dvh items-center justify-center"
      role="status"
      aria-live="polite"
    >
      <p className="text-[13px] text-ink-mute">Loading the schedule…</p>
    </div>
  );
}
