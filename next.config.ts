import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // instrumentationHook is enabled by default in Next.js 15+
  output: 'standalone', // For Docker builds
};

export default nextConfig;
