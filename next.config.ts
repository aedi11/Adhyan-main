import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Pin the workspace root so Turbopack doesn't pick up an unrelated lockfile
  // higher up in the filesystem.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
