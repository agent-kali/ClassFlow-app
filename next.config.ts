import type { NextConfig } from "next";

/**
 * The browser calls `/api/*` on its own origin and Next forwards it to
 * FastAPI. This keeps the backend origin out of the client bundle and avoids
 * CORS entirely, so no CORS middleware is needed on the backend.
 */
const LOCAL_ORIGIN = "http://127.0.0.1:8000";

/**
 * Vercel bakes the rewrite destination into the deployment. A missing origin
 * must not fall back to a URL stored in git, and an http origin would send
 * passwords from Vercel to the API in the clear. Local development still
 * falls back to the loopback API when BACKEND_ORIGIN is unset.
 */
function resolveBackendOrigin(): string {
  const configured = process.env.BACKEND_ORIGIN?.trim();
  if (process.env.VERCEL !== "1") {
    return configured || LOCAL_ORIGIN;
  }
  if (!configured) {
    throw new Error(
      "BACKEND_ORIGIN is missing. Set BACKEND_ORIGIN to an https URL before building on Vercel.",
    );
  }
  let url: URL;
  try {
    url = new URL(configured);
  } catch {
    throw new Error(
      "BACKEND_ORIGIN must be an https URL when building on Vercel.",
    );
  }
  if (url.protocol !== "https:" || url.hostname === "") {
    throw new Error(
      "BACKEND_ORIGIN must be an https URL when building on Vercel.",
    );
  }
  return configured;
}

const BACKEND_ORIGIN = resolveBackendOrigin();

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_ORIGIN}/:path*` }];
  },
};

export default nextConfig;
