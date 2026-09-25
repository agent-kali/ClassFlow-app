import { describe, expect, it } from "vitest";
import {
  decideRoute,
  GUEST_DEMO_OWNER,
  isGuestDemoEntry,
  isGuestFixtureVisit,
  resolveTeacherIdentity,
  shouldResetScheduleCache,
} from "./access";

describe("decideRoute", () => {
  it("keeps the mock demo on the schedule without a login", () => {
    expect(
      decideRoute({ mockMode: true, path: "/manager", status: "anonymous" })
    ).toBe("render");
    expect(
      decideRoute({ mockMode: true, path: "/teacher", status: "anonymous" })
    ).toBe("render");
    expect(decideRoute({ mockMode: true, path: "/login", status: "anonymous" })).toBe(
      "manager"
    );
  });

  it("renders an anonymous guest demo and still sends a bare visit to login", () => {
    expect(
      decideRoute({
        mockMode: false,
        path: "/manager",
        status: "anonymous",
        guestDemo: true,
      })
    ).toBe("render");
    expect(
      decideRoute({
        mockMode: false,
        path: "/teacher",
        status: "anonymous",
        guestDemo: true,
      })
    ).toBe("render");
    expect(
      decideRoute({
        mockMode: false,
        path: "/manager",
        status: "anonymous",
        guestDemo: false,
      })
    ).toBe("login");
    expect(
      decideRoute({
        mockMode: false,
        path: "/teacher",
        status: "anonymous",
      })
    ).toBe("login");
    expect(
      decideRoute({
        mockMode: false,
        path: "/login",
        status: "anonymous",
        guestDemo: true,
      })
    ).toBe("render");
  });

  it("treats only an explicit guest route as a fixture visit when the API is down", () => {
    expect(isGuestFixtureVisit(true, "error")).toBe(true);
    expect(isGuestFixtureVisit(true, "anonymous")).toBe(true);
    expect(isGuestFixtureVisit(false, "error")).toBe(false);
    expect(isGuestFixtureVisit(true, "authenticated")).toBe(false);
  });

  it("renders fixtures when a guest demo cannot reach the API", () => {
    expect(
      decideRoute({
        mockMode: false,
        path: "/manager",
        status: "error",
        guestDemo: true,
      })
    ).toBe("render");
    expect(
      decideRoute({
        mockMode: false,
        path: "/teacher",
        status: "error",
        guestDemo: true,
      })
    ).toBe("render");
    expect(
      decideRoute({
        mockMode: false,
        path: "/login",
        status: "error",
        guestDemo: true,
      })
    ).toBe("error");
  });

  it("sends an anonymous visitor to login and waits while the session loads", () => {
    expect(
      decideRoute({ mockMode: false, path: "/manager", status: "loading" })
    ).toBe("loading");
    expect(
      decideRoute({ mockMode: false, path: "/teacher", status: "anonymous" })
    ).toBe("login");
    expect(
      decideRoute({ mockMode: false, path: "/login", status: "anonymous" })
    ).toBe("render");
  });

  it("keeps a failed session check from opening the schedule or mock data", () => {
    expect(
      decideRoute({ mockMode: false, path: "/manager", status: "error" })
    ).toBe("error");
  });

  it("sends each role to its own screen", () => {
    expect(
      decideRoute({
        mockMode: false,
        path: "/manager",
        status: "authenticated",
        role: "teacher",
      })
    ).toBe("teacher");
    expect(
      decideRoute({
        mockMode: false,
        path: "/teacher",
        status: "authenticated",
        role: "manager",
      })
    ).toBe("manager");
    expect(
      decideRoute({
        mockMode: false,
        path: "/manager",
        status: "authenticated",
        role: "manager",
      })
    ).toBe("render");
    expect(
      decideRoute({
        mockMode: false,
        path: "/teacher",
        status: "authenticated",
        role: "teacher",
      })
    ).toBe("render");
    expect(
      decideRoute({
        mockMode: false,
        path: "/login",
        status: "authenticated",
        role: "teacher",
      })
    ).toBe("teacher");
  });
});

describe("isGuestDemoEntry", () => {
  it("treats the manager tour and an explicit demo flag as the public demo", () => {
    expect(isGuestDemoEntry("/manager", { tour: "1", demo: null })).toBe(true);
    expect(isGuestDemoEntry("/manager", { tour: null, demo: "1" })).toBe(true);
    expect(isGuestDemoEntry("/teacher", { tour: null, demo: "1" })).toBe(true);
    expect(isGuestDemoEntry("/teacher", { tour: "1", demo: null })).toBe(false);
    expect(isGuestDemoEntry("/manager", { tour: null, demo: null })).toBe(false);
    expect(isGuestDemoEntry("/teacher", { tour: null, demo: null })).toBe(false);
    expect(isGuestDemoEntry("/login", { tour: "1", demo: "1" })).toBe(false);
  });
});

describe("resolveTeacherIdentity", () => {
  it("lets mock mode switch teachers", () => {
    expect(
      resolveTeacherIdentity({
        mockMode: true,
        selectedId: "t-mir",
        authenticatedTeacherId: "t-dav",
      })
    ).toEqual({ teacherId: "t-mir", canSwitch: true });
  });

  it("lets a guest demo switch teachers", () => {
    expect(
      resolveTeacherIdentity({
        mockMode: false,
        guestDemo: true,
        selectedId: "t-mir",
        authenticatedTeacherId: null,
      })
    ).toEqual({ teacherId: "t-mir", canSwitch: true });
  });

  it("ignores a selected id on the real path", () => {
    expect(
      resolveTeacherIdentity({
        mockMode: false,
        selectedId: "t-mir",
        authenticatedTeacherId: "t-dav",
      })
    ).toEqual({ teacherId: "t-dav", canSwitch: false });
  });
});

describe("shouldResetScheduleCache", () => {
  it("keeps a cache that already belongs to the signed-in user", () => {
    expect(
      shouldResetScheduleCache({
        loadedForUserId: "usr-dav",
        nextUserId: "usr-dav",
        sessionLost: false,
      })
    ).toBe(false);
  });

  it("drops a guest fixture cache when a real user signs in", () => {
    expect(GUEST_DEMO_OWNER).toBe("guest-demo");
    expect(
      shouldResetScheduleCache({
        loadedForUserId: GUEST_DEMO_OWNER,
        nextUserId: "usr-manager",
        sessionLost: false,
      })
    ).toBe(true);
  });

  it("resets when the user changes, on logout, and on 401", () => {
    expect(
      shouldResetScheduleCache({
        loadedForUserId: "usr-manager",
        nextUserId: "usr-dav",
        sessionLost: false,
      })
    ).toBe(true);
    expect(
      shouldResetScheduleCache({
        loadedForUserId: "usr-manager",
        nextUserId: null,
        sessionLost: false,
      })
    ).toBe(true);
    expect(
      shouldResetScheduleCache({
        loadedForUserId: null,
        nextUserId: "usr-dav",
        sessionLost: true,
      })
    ).toBe(true);
  });

  it("does not reset an empty cache just because someone signed in", () => {
    expect(
      shouldResetScheduleCache({
        loadedForUserId: null,
        nextUserId: "usr-dav",
        sessionLost: false,
      })
    ).toBe(false);
  });
});
