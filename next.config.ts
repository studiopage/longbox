import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  // instrumentationHook is enabled by default in Next.js 15+
  output: 'standalone', // For Docker builds

  // Empty turbopack config to silence warning
  turbopack: {},

  // Configure webpack to handle WASM files for node-unrar-js
  webpack: (config, { isServer }) => {
    // Handle WASM files
    config.experiments = {
      ...config.experiments,
      asyncWebAssembly: true,
    };

    // Add rule for WASM files
    config.module.rules.push({
      test: /\.wasm$/,
      type: 'asset/resource',
    });

    return config;
  },

  // Server external packages that use native modules or WASM
  serverExternalPackages: ['node-unrar-js'],
};

export default nextConfig;
