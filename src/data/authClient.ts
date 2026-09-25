import { ApiError } from "./httpSource";
import { API_BASE_URL } from "./client";

export interface AuthTeacher {
  id: string;
  code: string;
  name: string;
}

export interface AuthUser {
  id: string;
  email: string;
  role: "manager" | "teacher";
  teacher?: AuthTeacher;
}

const NETWORK_MESSAGE =
  "Could not reach the ClassFlow API. Check that the backend is running.";

async function send(path: string, body?: unknown): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, {
      method: body === undefined && path === "/auth/me" ? "GET" : "POST",
      credentials: "same-origin",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError(0, "network_error", NETWORK_MESSAGE);
  }
}

async function readError(response: Response): Promise<ApiError> {
  let message = `Request failed with status ${response.status}.`;
  let code = "request_failed";
  try {
    const body = (await response.json()) as { message?: string; code?: string };
    if (body.message) message = body.message;
    if (body.code) code = body.code;
  } catch {
    // The status alone is enough to decide 401 versus a broken response.
  }
  return new ApiError(response.status, code, message);
}

export async function loginRequest(email: string, password: string): Promise<AuthUser> {
  const response = await send("/auth/login", { email, password });
  if (!response.ok) throw await readError(response);
  return (await response.json()) as AuthUser;
}

export async function logoutRequest(): Promise<void> {
  const response = await send("/auth/logout", {});
  if (!response.ok && response.status !== 204) throw await readError(response);
}

export async function fetchMe(): Promise<AuthUser | null> {
  const response = await send("/auth/me");
  if (response.status === 401) return null;
  if (!response.ok) throw await readError(response);
  return (await response.json()) as AuthUser;
}
