# Phase 5: Reader & External Access — Design Document

**Date**: 2026-03-04
**Status**: Approved

## Overview

Phase 5 adds four features to Longbox:

1. **Reader zoom/pan/pinch** — touch-friendly zoom via react-zoom-pan-pinch
2. **Discovery page fix** — diagnose and fix empty state when no API key configured
3. **OPDS 1.2 feeds** — Atom XML feeds for Mihon and other OPDS readers
4. **PWA support** — installable app with offline caching

## 1. Reader Zoom (react-zoom-pan-pinch)

### Problem
The reader has no zoom capability. Users can't pinch-to-zoom on mobile or double-tap to enlarge panels. This is critical for phone-sized screens reading detailed comic art.

### Solution
Wrap page images in `<TransformWrapper>` / `<TransformComponent>` from `react-zoom-pan-pinch`.

### Behavior
- **Pinch**: Zoom freely (native gesture)
- **Double-tap**: Toggle between 1x and 2x zoom
- **Pan**: Drag to move when zoomed in
- **Click-zone navigation**: Disabled when zoom scale > 1. At 1x, click zones work normally.
- **Webtoon mode**: Zoom wraps the entire scroll container
- **Page change**: Zoom resets to 1x when navigating pages
- **Settings**: Zoom state not persisted (always starts at 1x)

### Files
- `src/app/read/[id]/page.tsx` — wrap image in transform components, adjust click handler
- `package.json` — add `react-zoom-pan-pinch`

## 2. Discovery Page Fix

### Problem
`browseComicVine()` silently returns `[]` when no ComicVine API key is configured. Users see "No series found" with no guidance on how to fix it.

### Solution
1. New server action `checkComicVineConfigured()` in `src/actions/discovery.ts` — checks `appSettings` for `cv_api_key`
2. On mount, check config status:
   - **Not configured**: Show `EmptyState` with Compass icon, "ComicVine Not Configured" title, link to Settings > Configuration, and "Browse Characters" fallback link
   - **Configured but empty results**: Current "No series found" plus hint about checking API key
3. Character discovery (`/discover/characters`) works independently via SuperheroAPI — always available as fallback

### Files
- `src/actions/discovery.ts` (new) — `checkComicVineConfigured()`
- `src/app/(dashboard)/discovery/page.tsx` — config check, conditional empty state

## 3. OPDS 1.2 Feed for Mihon

### Auth Layer
- Extend `src/middleware.ts` to intercept `/api/opds/**` requests
- Extract `Authorization: Basic base64(email:password)` header
- Validate against `users` table using `verifyPassword()` from `src/lib/auth.ts`
- Return `401` with `WWW-Authenticate: Basic realm="Longbox OPDS"` on failure
- Inject authenticated user ID into custom request header for route handlers

### XML Builder (`src/lib/opds.ts`)
Template literal functions (no XML library):
- `buildNavigationFeed(title, entries[])` — catalog/navigation feeds
- `buildAcquisitionFeed(title, books[])` — book listings with download/cover links
- `buildSearchDescription()` — OpenSearch descriptor XML

### Route Handlers

| Route | Purpose | Feed Type |
|-------|---------|-----------|
| `/api/opds/v1.2/catalog` | Root navigation | Navigation |
| `/api/opds/v1.2/series` | All series alphabetically | Navigation |
| `/api/opds/v1.2/series/[id]` | Books in a series | Acquisition |
| `/api/opds/v1.2/publishers` | Browse by publisher | Navigation |
| `/api/opds/v1.2/new` | Recently added books | Acquisition |
| `/api/opds/v1.2/reading` | User's reading list | Acquisition |
| `/api/opds/v1.2/collections/[id]` | Smart collection books | Acquisition |
| `/api/opds/v1.2/search` | OpenSearch by title/series | Acquisition |

### Download Endpoint
New route at `/api/read/[id]/download/route.ts` streams the CBZ/CBR file directly for OPDS acquisition.

### Cover Integration
Acquisition entries link to existing `/api/cover/[bookId]` for thumbnails.

### Smart Collection Integration
Collection feeds use existing `rules-engine.ts` to evaluate smart rules and return matching books as OPDS acquisition entries.

## 4. PWA Support

### Manifest (`public/manifest.json`)
- name/short_name: "Longbox"
- theme_color/background_color: "#0a0f0a" (dark green)
- display: "standalone"
- orientation: "any"
- Icons: 192x192 and 512x512 (placeholder initially)

### Service Worker (via `next-pwa`)
Caching strategies:
- **App shell** (HTML/JS/CSS): `NetworkFirst` — try fresh, fall back to cache
- **Cover images** (`/api/cover/*`): `StaleWhileRevalidate` — serve cached, refresh in background
- **API responses** (`/api/*`): `NetworkOnly` — no caching for dynamic data
- **Static assets** (`/_next/static/*`): `CacheFirst` — immutable, cache permanently

### Configuration
- `next.config.ts`: Wrap with `withPWA({ dest: 'public', disable: process.env.NODE_ENV === 'development' })`
- `src/app/layout.tsx`: Add manifest link and theme-color metadata
- Disabled in development to avoid service worker interference

### Files
- `public/manifest.json` (new)
- `public/icons/icon-192.png`, `icon-512.png` (new, placeholder)
- `next.config.ts` (modified)
- `src/app/layout.tsx` (modified)
- `package.json` — add `next-pwa`

## New File Structure

```
src/actions/discovery.ts                        — checkComicVineConfigured()
src/lib/opds.ts                                 — OPDS Atom XML builder
src/app/api/opds/v1.2/catalog/route.ts          — Root navigation feed
src/app/api/opds/v1.2/series/route.ts           — All series feed
src/app/api/opds/v1.2/series/[id]/route.ts      — Series books feed
src/app/api/opds/v1.2/publishers/route.ts       — Publishers feed
src/app/api/opds/v1.2/new/route.ts              — Recently added feed
src/app/api/opds/v1.2/reading/route.ts          — Reading list feed
src/app/api/opds/v1.2/collections/[id]/route.ts — Collection feed
src/app/api/opds/v1.2/search/route.ts           — Search feed
src/app/api/read/[id]/download/route.ts         — File download for OPDS
public/manifest.json                            — PWA manifest
public/icons/icon-192.png                       — PWA icon
public/icons/icon-512.png                       — PWA icon
```

## Modified Files

```
src/app/read/[id]/page.tsx              — Zoom/pan/pinch integration
src/app/(dashboard)/discovery/page.tsx  — Config check, improved empty state
src/middleware.ts                        — OPDS Basic Auth handling
next.config.ts                          — next-pwa wrapper
src/app/layout.tsx                      — PWA manifest metadata
package.json                            — react-zoom-pan-pinch, next-pwa
```

## Dependencies

- `react-zoom-pan-pinch` (~15KB) — pinch/pan/double-tap zoom for reader
- `next-pwa` — Workbox-based service worker generation for Next.js
