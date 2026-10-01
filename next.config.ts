import type { NextConfig } from "next";

/**
 * The browser calls `/api/*` on its own origin and Next forwards it to
 * FastAPI. This keeps the backend origin out of the client bundle and avoids
 * CORS entirely, so no CORS middleware is needed on the backend.
 */
const LOCAL_ORIGIN = "http://127.0.0.1:8000";
// Public Render API. Used only when a Vercel build has no BACKEND_ORIGIN set,
// so the rewrite is https instead of failing the deployment.
const VERCEL_API_ORIGIN = "https://classflow-api-p7j1.onrender.com";

const configuredOrigin = process.env.BACKEND_ORIGIN;
const onVercel = process.env.VERCEL === "1";
const BACKEND_ORIGIN =
  configuredOrigin ?? (onVercel ? VERCEL_API_ORIGIN : LOCAL_ORIGIN);

// The rewrite destination is fixed at build time. On Vercel, an http origin
// would send passwords from Vercel to the API in the clear.
if (onVercel && !BACKEND_ORIGIN.startsWith("https://")) {
  throw new Error("BACKEND_ORIGIN must be an https URL when building on Vercel.");
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_ORIGIN}/:path*` }];
  },
};

export default nextConfig;
