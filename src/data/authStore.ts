"use client";

import { create } from "zustand";
import { fetchMe, loginRequest, logoutRequest, type AuthUser } from "./authClient";

export type AuthStatus = "loading" | "authenticated" | "anonymous" | "error";

interface AuthState {
  status: AuthStatus;
  user: AuthUser | null;
  error: string | null;
  bootstrap: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthUser>;
  logout: () => Promise<void>;
  expire: () => void;
}

function describe(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

export const useAuthStore = create<AuthState>((set) => ({
  status: "loading",
  user: null,
  error: null,

  async bootstrap() {
    set({ status: "loading", error: null });
    try {
      const user = await fetchMe();
      set(
        user
          ? { status: "authenticated", user, error: null }
          : { status: "anonymous", user: null, error: null }
      );
    } catch (error) {
      set({ status: "error", user: null, error: describe(error) });
    }
  },

  async login(email, password) {
    const user = await loginRequest(email, password);
    set({ status: "authenticated", user, error: null });
    return user;
  },

  async logout() {
    try {
      await logoutRequest();
    } finally {
      set({ status: "anonymous", user: null, error: null });
    }
  },

  expire() {
    set({ status: "anonymous", user: null, error: null });
  },
}));
