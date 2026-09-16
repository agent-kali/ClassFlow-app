import type { DataSource } from "./source";
import { createHttpSource } from "./httpSource";
import { createMockSource } from "./mockSource";

/**
 * Which backend the app talks to.
 *
 * HTTP is the default and the product path: PostgreSQL is the source of truth
 * for lessons. The in-memory fixture source is opt-in only, for the public
 * demo that has no backend deployed, so a misconfigured or unreachable API
 * surfaces as an error rather than quietly serving generated lessons.
 */
export function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_DATA_SOURCE === "mock";
}

/** Defaults to the Next.js rewrite in next.config.ts, which proxies FastAPI. */
export function apiBaseUrl(): string {
  return process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";
}

let cached: DataSource | null = null;

export function getDataSource(): DataSource {
  if (!cached) {
    cached = isMockMode()
      ? createMockSource()
      : createHttpSource({ baseUrl: apiBaseUrl() });
  }
  return cached;
}
