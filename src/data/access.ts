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

export function decideRoute(input: {
  mockMode: boolean;
  path: AppPath;
  status: AuthStatus;
  role?: AppRole;
}): RouteDecision {
  if (input.mockMode) {
    return input.path === "/login" ? "manager" : "render";
  }
  if (input.status === "loading") return "loading";
  if (input.status === "error") return "error";
  if (input.status === "anonymous") {
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
  selectedId: string | null;
  authenticatedTeacherId: string | null;
}): { teacherId: string | null; canSwitch: boolean } {
  if (input.mockMode) {
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
