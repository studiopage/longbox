/// <reference lib="webworker" />
import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { CacheFirst, NetworkFirst, NetworkOnly, StaleWhileRevalidate } from "serwist";
import { Serwist } from "serwist";
declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}
declare const self: ServiceWorkerGlobalScope;
const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    { matcher: /\/_next\/static\/.*/i, handler: new CacheFirst({ cacheName: "next-static" }) },
    { matcher: /\/api\/cover\/.*/i, handler: new CacheFirst({ cacheName: "covers" }) },
    { matcher: /\/api\/page\/.*/i, handler: new CacheFirst({ cacheName: "reader-pages" }) },
    { matcher: /\/api\/(series|issues|collections|library|favorites).*/i, handler: new NetworkFirst({ cacheName: "api-library", networkTimeoutSeconds: 5 }) },
    { matcher: /\/_next\/image\/.*/i, handler: new CacheFirst({ cacheName: "next-image" }) },
    { matcher: ({ request }: { request: Request }) => request.destination === "document" && !request.url.includes("/api/") && !request.url.includes("/read/"), handler: new StaleWhileRevalidate({ cacheName: "pages" }) },
    { matcher: /\/read\/.*/i, handler: new NetworkOnly() },
    { matcher: /\/(api\/auth|login|signup).*/i, handler: new NetworkOnly() },
    ...defaultCache,
  ],
});
serwist.addEventListeners();
