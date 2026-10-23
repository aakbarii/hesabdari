import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  devIndicators: false,
  allowedDevOrigins: ["192.168.172.168", "127.0.0.1"],
  serverExternalPackages: ["@libsql/client"],
  // Migrations are read from the drizzle folder at runtime; ship it with every serverless function.
  outputFileTracingIncludes: {
    "/**": ["./drizzle/**/*"],
  },
  output: "standalone",
  outputFileTracingExcludes: {
    "/*": ["./data/**/*", "./dist-desktop/**/*", "./.env*"],
  },
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "recharts", "jalali-moment"],
  },
  turbopack: {
    root: path.resolve(__dirname),
  },
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/manifest.json",
        headers: [
          { key: "Cache-Control", value: "public, max-age=3600" },
          { key: "Content-Type", value: "application/manifest+json" },
        ],
      },
      {
        source: "/(apple-touch-icon|icon-192|icon-512).png",
        headers: [
          { key: "Cache-Control", value: "public, max-age=604800, immutable" },
        ],
      },
    ];
  },
};

export default nextConfig;
