"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { decideRoute, homeForRole } from "@/data/access";
import { useAuthStore } from "@/data/authStore";
import { isMockMode } from "@/data/client";
import { useClassFlowStore } from "@/data/store";

export function LoginScreen() {
  const router = useRouter();
  const status = useAuthStore((s) => s.status);
  const user = useAuthStore((s) => s.user);
  const connectionError = useAuthStore((s) => s.error);
  const bootstrap = useAuthStore((s) => s.bootstrap);
  const login = useAuthStore((s) => s.login);
  const reset = useClassFlowStore((s) => s.reset);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isMockMode()) {
      router.replace("/manager");
      return;
    }
    if (status === "loading") void bootstrap();
  }, [status, bootstrap, router]);

  const decision = decideRoute({
    mockMode: isMockMode(),
    path: "/login",
    status: isMockMode() ? "anonymous" : status,
    role: user?.role,
    guestDemo: false,
  });

  useEffect(() => {
    if (decision === "manager") router.replace("/manager");
    if (decision === "teacher") router.replace("/teacher");
  }, [decision, router]);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const signedIn = await login(email, password);
      reset();
      router.replace(homeForRole(signedIn.role));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Something went wrong.");
    } finally {
      setSubmitting(false);
    }
  }

  if (decision === "loading" || decision === "manager" || decision === "teacher") {
    return (
      <div className="flex h-dvh items-center justify-center" role="status">
        <p className="text-[13px] text-ink-mute">Checking session…</p>
      </div>
    );
  }

  if (decision === "error") {
    return (
      <div className="flex h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <h1 className="text-[17px] font-semibold">ClassFlow could not be reached</h1>
        <p className="max-w-md text-[13px] text-ink-mute">{connectionError}</p>
        <button
          type="button"
          onClick={() => void bootstrap()}
          className="mt-1 rounded bg-accent px-3 py-1.5 text-[13px] font-semibold text-accent-ink"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-sm rounded-lg border border-line bg-surface p-6 shadow-sm"
      >
        <h1 className="text-[18px] font-bold tracking-tight">ClassFlow</h1>
        <p className="mt-1 text-[13px] text-ink-mute">Sign in to the schedule.</p>
        <label className="mt-5 block text-[12px] font-medium text-ink-mute" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="username"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className="mt-1 w-full rounded border border-line bg-raised px-2 py-1.5 text-[14px] focus:border-accent focus:outline-none"
        />
        <label className="mt-3 block text-[12px] font-medium text-ink-mute" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          className="mt-1 w-full rounded border border-line bg-raised px-2 py-1.5 text-[14px] focus:border-accent focus:outline-none"
        />
        {error && (
          <p role="alert" className="mt-3 text-[13px] text-danger">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={submitting}
          className="mt-5 w-full rounded bg-accent px-3 py-2 text-[13px] font-semibold text-accent-ink hover:opacity-90 disabled:opacity-60"
        >
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
