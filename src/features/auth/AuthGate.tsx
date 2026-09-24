"use client";

import { useEffect, useLayoutEffect } from "react";
import { useRouter } from "next/navigation";
import { isMockMode } from "@/data/client";
import { decideRoute, shouldResetScheduleCache, type AppRole } from "@/data/access";
import { useAuthStore } from "@/data/authStore";
import { useClassFlowStore } from "@/data/store";

/**
 * Holds the schedule off screen until we know who is signed in, and until the
 * cache belongs to that person. A failed session check is a connection error,
 * not a silent switch to fixture data.
 */
export function AuthGate({
  role,
  children,
}: {
  role: AppRole;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const path = role === "manager" ? "/manager" : "/teacher";
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const error = useAuthStore((s) => s.error);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const expire = useAuthStore((s) => s.expire);
  const loadedForUserId = useClassFlowStore((s) => s.loadedForUserId);
  const loadErrorStatus = useClassFlowStore((s) => s.loadErrorStatus);
  const reset = useClassFlowStore((s) => s.reset);

  useEffect(() => {
    if (isMockMode()) return;
    if (status === "loading") void bootstrap();
  }, [status, bootstrap]);

  const sessionLost = loadErrorStatus === 401;
  const needsReset =
    !sessionLost &&
    status === "authenticated" &&
    user !== null &&
    shouldResetScheduleCache({
      loadedForUserId,
      nextUserId: user.id,
      sessionLost: false,
    });

  useLayoutEffect(() => {
    if (isMockMode()) return;
    if (sessionLost) {
      expire();
      reset();
      return;
    }
    if (needsReset) reset();
  }, [sessionLost, needsReset, expire, reset]);

  const decision = isMockMode()
    ? "render"
    : decideRoute({
        mockMode: false,
        path,
        status: sessionLost ? "anonymous" : status,
        role: user?.role,
      });

  useEffect(() => {
    if (isMockMode()) return;
    if (decision === "login") router.replace("/login");
    if (decision === "manager") router.replace("/manager");
    if (decision === "teacher") router.replace("/teacher");
  }, [decision, router]);

  if (isMockMode()) return <>{children}</>;

  if (decision === "error") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-[17px] font-semibold">The schedule could not be loaded</h1>
        <p className="max-w-md text-[13px] text-ink-mute">{error}</p>
        <button
          type="button"
          onClick={() => void bootstrap()}
          className="mt-1 rounded bg-accent px-3 py-1.5 text-[13px] font-semibold text-accent-ink hover:opacity-90"
        >
          Try again
        </button>
      </div>
    );
  }

  if (decision !== "render" || needsReset || sessionLost) {
    return (
      <div className="flex h-dvh items-center justify-center" role="status" aria-live="polite">
        <p className="text-[13px] text-ink-mute">Checking session…</p>
      </div>
    );
  }

  return <>{children}</>;
}
