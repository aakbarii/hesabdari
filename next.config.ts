import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
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
};

export default nextConfig;
