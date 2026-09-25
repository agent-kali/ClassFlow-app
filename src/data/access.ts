/**
 * Pure decisions for the auth gate. Routing here is UX. The API still checks
 * every request.
 */

export type AppRole = "manager" | "teacher";
export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error";
export type AppPath = "/manager" | "/teacher" | "/login";
export type RouteDecision = "loading" | "login" | "manager" | "teacher" | "render" | "error";

export function homeForRole(role: AppRole): "/manager" | "/teacher" {
  return role === "manager" ? "/manager" : "/teacher";
}

/** Cache owner for an explicit fixture demo. Never a real account id. */
export const GUEST_DEMO_OWNER = "guest-demo";

/**
 * Public demo entry only. `tour=1` is the manager handoff from the landing.
 * `demo=1` keeps that visit on fixtures after the tour is dismissed, and is
 * how the teacher experience is opened. A bare schedule URL is not a demo.
 *
 * `isGuestFixtureVisit` is that entry plus an anonymous visitor, or the same
 * entry when the session probe could not reach the API. A bare schedule URL
 * never qualifies, even when the status is "error".
 */
export function isGuestFixtureVisit(guestDemo: boolean, status: AuthStatus): boolean {
  return guestDemo && (status === "anonymous" || status === "error");
}

export function isGuestDemoEntry(
  path: AppPath,
  params: { tour?: string | null; demo?: string | null }
): boolean {
  if (path === "/login") return false;
  if (params.demo === "1") return true;
  return path === "/manager" && params.tour === "1";
}

export function decideRoute(input: {
  mockMode: boolean;
  path: AppPath;
  status: AuthStatus;
  role?: AppRole;
  /** Explicit fixture visit. Ignored unless the visitor is anonymous. */
  guestDemo?: boolean;
}): RouteDecision {
  if (input.mockMode) {
    return input.path === "/login" ? "manager" : "render";
  }
  if (input.status === "loading") return "loading";
  // A guest route can still show fixtures when the session probe cannot reach
  // the API. A bare schedule URL stays an error and never becomes fixtures.
  if (input.status === "error") {
    if (input.guestDemo && input.path !== "/login") return "render";
    return "error";
  }
  if (input.status === "anonymous") {
    if (input.guestDemo && input.path !== "/login") return "render";
    return input.path === "/login" ? "render" : "login";
  }
  const role = input.role;
  if (!role) return "loading";
  if (input.path === "/login") return role === "manager" ? "manager" : "teacher";
  if (input.path === "/manager") return role === "manager" ? "render" : "teacher";
  return role === "teacher" ? "render" : "manager";
}

/**
 * Mock mode may pick any fixture teacher. The real path uses only the teacher
 * linked to the session, and ignores a client-selected id.
 */
export function resolveTeacherIdentity(input: {
  mockMode: boolean;
  guestDemo?: boolean;
  selectedId: string | null;
  authenticatedTeacherId: string | null;
}): { teacherId: string | null; canSwitch: boolean } {
  if (input.mockMode || input.guestDemo) {
    return { teacherId: input.selectedId, canSwitch: true };
  }
  return { teacherId: input.authenticatedTeacherId, canSwitch: false };
}

/**
 * Same user keeps a cache that already belongs to them. Logout, a different
 * user, or a 401 must drop it before the next screen renders.
 */
export function shouldResetScheduleCache(input: {
  loadedForUserId: string | null;
  nextUserId: string | null;
  sessionLost: boolean;
}): boolean {
  if (input.sessionLost) return true;
  if (input.nextUserId === null) return input.loadedForUserId !== null;
  if (input.loadedForUserId === null) return false;
  return input.loadedForUserId !== input.nextUserId;
}
