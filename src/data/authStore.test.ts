import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./authClient", () => ({
  fetchMe: vi.fn(),
  loginRequest: vi.fn(),
  logoutRequest: vi.fn(),
}));

import { logoutRequest } from "./authClient";
import { useAuthStore } from "./authStore";
import type { AuthUser } from "./authClient";

const manager: AuthUser = {
  id: "user-manager",
  email: "manager@localhost",
  role: "manager",
};

function signedIn() {
  useAuthStore.setState({
    status: "authenticated",
    user: manager,
    error: null,
  });
}

describe("logout", () => {
  beforeEach(() => {
    signedIn();
    vi.mocked(logoutRequest).mockReset();
  });

  it("clears the session only after the server confirms logout", async () => {
    vi.mocked(logoutRequest).mockResolvedValue(undefined);

    await useAuthStore.getState().logout();

    expect(logoutRequest).toHaveBeenCalledOnce();
    expect(useAuthStore.getState()).toMatchObject({
      status: "anonymous",
      user: null,
      error: null,
    });
  });

  it("keeps the signed-in user and reports a retryable error when logout fails", async () => {
    vi.mocked(logoutRequest).mockRejectedValue(
      new Error("Could not reach the ClassFlow API. Check that the backend is running.")
    );

    await expect(useAuthStore.getState().logout()).rejects.toThrow(
      "Could not reach the ClassFlow API. Check that the backend is running."
    );

    expect(useAuthStore.getState()).toMatchObject({
      status: "authenticated",
      user: manager,
      error: "Could not reach the ClassFlow API. Check that the backend is running.",
    });
  });

  it("clears a previous logout error once a later attempt succeeds", async () => {
    vi.mocked(logoutRequest).mockRejectedValueOnce(new Error("offline"));
    await expect(useAuthStore.getState().logout()).rejects.toThrow("offline");
    expect(useAuthStore.getState().error).toBe("offline");
    expect(useAuthStore.getState().user).toEqual(manager);

    vi.mocked(logoutRequest).mockResolvedValueOnce(undefined);
    await useAuthStore.getState().logout();

    expect(useAuthStore.getState()).toMatchObject({
      status: "anonymous",
      user: null,
      error: null,
    });
  });
});
