import type { NextConfig } from "next";

/**
 * The browser calls `/api/*` on its own origin and Next forwards it to
 * FastAPI. This keeps the backend origin out of the client bundle and avoids
 * CORS entirely, so no CORS middleware is needed on the backend.
 */
const configuredOrigin = process.env.BACKEND_ORIGIN;
const BACKEND_ORIGIN = configuredOrigin ?? "http://127.0.0.1:8000";

// The rewrite destination is fixed at build time. On Vercel, an http origin
// would send passwords from Vercel to the API in the clear.
if (process.env.VERCEL === "1" && !configuredOrigin?.startsWith("https://")) {
  throw new Error("BACKEND_ORIGIN must be an https URL when building on Vercel.");
}

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_ORIGIN}/:path*` }];
  },
};

export default nextConfig;
