import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV !== "production",
  register: true,
  reloadOnOnline: true,
  cacheOnNavigation: true,
});
const nextConfig: NextConfig = {
  reactCompiler: true,
  output: 'standalone',
  turbopack: {},
  async headers() {
    return [{ source: "/sw.js", headers: [{ key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, { key: "Content-Type", value: "application/javascript; charset=utf-8" }] }];
  },
  webpack: (config) => {
    config.experiments = { ...config.experiments, asyncWebAssembly: true };
    config.module.rules.push({ test: /\.wasm$/, type: 'asset/resource' });
    return config;
  },
  serverExternalPackages: ['node-unrar-js'],
};
export default withSerwist(nextConfig);
