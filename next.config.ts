import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Keep local dev manifests isolated from production/OpenNext builds.
  // Next dev and next build can otherwise corrupt one another when run concurrently.
  distDir: process.env.NODE_ENV === "development" ? ".next-dev" : ".next",
  experimental: { optimizePackageImports: ["lucide-react", "framer-motion"] },
  headers: async () => [
    {
      source: "/(.*)",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
};

export default nextConfig;
