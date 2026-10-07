import type { NextConfig } from "next";

const backendUrl = process.env.BACKEND_URL ?? "http://localhost:8000";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  rewrites() {
    return [
      // Public profile: myhub.site/@username ("@folder" is a parallel route slot in the App Router)
      { source: "/@:username", destination: "/u/:username" },
      // Same-origin proxy to Django, so session and CSRF cookies just work
      { source: "/api/:path*", destination: `${backendUrl}/api/:path*` },
      { source: "/_allauth/:path*", destination: `${backendUrl}/_allauth/:path*` },
      { source: "/media/:path*", destination: `${backendUrl}/media/:path*` },
    ];
  },
};

export default nextConfig;
