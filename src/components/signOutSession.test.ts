import { describe, expect, it, vi } from "vitest";
import { signOutSession } from "./signOutSession";

describe("signOutSession", () => {
  it("drops the schedule and leaves for login only after logout succeeds", async () => {
    const logout = vi.fn(async () => {});
    const resetSchedule = vi.fn();
    const goToLogin = vi.fn();

    await signOutSession({ logout, resetSchedule, goToLogin });

    expect(logout).toHaveBeenCalledOnce();
    expect(resetSchedule).toHaveBeenCalledOnce();
    expect(goToLogin).toHaveBeenCalledOnce();
    expect(resetSchedule.mock.invocationCallOrder[0]).toBeLessThan(
      goToLogin.mock.invocationCallOrder[0]
    );
  });

  it("keeps the schedule and the current page when logout fails", async () => {
    const logout = vi.fn(async () => {
      throw new Error("Could not reach the ClassFlow API. Check that the backend is running.");
    });
    const resetSchedule = vi.fn();
    const goToLogin = vi.fn();

    await signOutSession({ logout, resetSchedule, goToLogin });

    expect(logout).toHaveBeenCalledOnce();
    expect(resetSchedule).not.toHaveBeenCalled();
    expect(goToLogin).not.toHaveBeenCalled();
  });
});
