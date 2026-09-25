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

/**
 * Authenticated browser traffic uses the same-origin Next rewrite only.
 * There is no second base URL: the session cookie is host-only on this origin.
 */
export const API_BASE_URL = "/api";

let cached: DataSource | null = null;
let guestDemo: DataSource | null = null;

export function getDataSource(): DataSource {
  if (!cached) {
    cached = isMockMode()
      ? createMockSource()
      : createHttpSource({ baseUrl: API_BASE_URL });
  }
  return cached;
}

/**
 * Fixture schedule for an explicit guest demo visit. Separate from
 * `getDataSource()` so a failed API call or a signed-in session never lands
 * here. Lost on refresh, same as the mock build.
 */
export function getGuestDemoSource(): DataSource {
  if (!guestDemo) guestDemo = createMockSource();
  return guestDemo;
}
