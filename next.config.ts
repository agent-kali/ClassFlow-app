import type { NextConfig } from "next";

/**
 * The browser calls `/api/*` on its own origin and Next forwards it to
 * FastAPI. This keeps the backend origin out of the client bundle and avoids
 * CORS entirely, so no CORS middleware is needed on the backend.
 */
const BACKEND_ORIGIN = process.env.BACKEND_ORIGIN ?? "http://127.0.0.1:8000";

const nextConfig: NextConfig = {
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${BACKEND_ORIGIN}/:path*` }];
  },
};

export default nextConfig;
