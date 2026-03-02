# Longbox - Comic Library Manager

## Quick Reference
- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run lint` - ESLint
- `npx drizzle-kit push` - Push schema changes to DB
- `npx drizzle-kit generate` - Generate migrations

## Tech Stack
- Next.js 16.1 (App Router) with React 19, TypeScript (strict)
- PostgreSQL + Drizzle ORM (schema: src/db/schema.ts, config: drizzle.config.ts)
- NextAuth.js 5.0-beta (credentials + OAuth) - config in src/lib/auth.ts
- Tailwind CSS 4 + shadcn/ui (Radix primitives) + Lucide icons
- React Compiler enabled in next.config.ts

## Project Structure
- `src/actions/` - Server actions (auth, library, collections, favorites, reading, etc.)
- `src/app/(auth)/` - Login/signup pages
- `src/app/(dashboard)/` - Protected routes (library, search, discovery, settings, profile)
- `src/app/read/[id]/` - Comic reader (standalone layout)
- `src/app/api/` - API routes (cover serving, auth, scanner stream, stats)
- `src/components/longbox/` - Domain components (40+ files)
- `src/components/ui/` - shadcn/ui base components
- `src/components/reader/` - Comic reader UI
- `src/db/schema.ts` - Full DB schema (19 tables, 4 domains: auth, metadata, user features, system)
- `src/lib/data/` - Data access layer (reading-progress.ts, series-page.ts)
- `src/lib/utils/` - Utilities (comic-metadata.ts, comic-cover-extractor.ts)
- `src/lib/comicvine.ts` - ComicVine API client
- `src/lib/metron.ts` - Metron API client
- `src/lib/scanner/` - File scanner & watcher (chokidar)
- `src/types/longbox.ts` - Shared TypeScript types
- `src/middleware.ts` - Auth middleware

## Design System — Magnetik
All UI follows the Magnetik design language. Do not deviate from these rules:
- **Colors**: Use only semantic CSS tokens — `bg-background`, `bg-card`, `bg-muted`, `bg-secondary`, `bg-primary`, `text-foreground`, `text-muted-foreground`, `text-primary`, `border-border`. Never use hardcoded colors (`bg-green-500`, `text-white`, `bg-black`, etc.)
- **Corners**: `rounded` only — never `rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-full` (exception: avatar circles)
- **No glassmorphism**: No `blur-xl`, `backdrop-blur`, `bg-white/20` overlays. Use solid `bg-card` or `bg-muted` backgrounds
- **Accent color**: Mint Frost (`--primary` in oklch). Used for interactive elements, badges, highlights
- **Hover states**: `group-hover:text-primary`, `hover:bg-accent`, `group-hover:border-primary/30` — subtle, not dramatic
- **Badges/pills**: `bg-background/85 border border-border text-foreground` for overlays on images
- **Typography**: `font-black` for main headings, `font-bold`/`font-medium` for subheadings, `text-muted-foreground` for secondary text

## Routing — Unified Series Page
All series detail views use a single canonical route: `/series/[id]`
- **Data loader**: `src/lib/data/series-page.ts` — `getSeriesPageData(id)` resolves any ID:
  - UUID → local `series.id` lookup
  - Integer → `series.cv_id` lookup
  - Fallback → ComicVine API call
- **Three contexts**: `'library'` (has book files), `'managed'` (in DB, no files), `'discovery'` (ComicVine only)
- **Issue detail**: `/series/[id]/issue/[issueId]`
- **Old routes redirect**: `/library/[seriesId]` → `/series/[seriesId]`, `/discover/series/[id]` → `/series/[id]`, `/series/new?cvId=X` → `/series/X`
- All internal links should point to `/series/{id}` — never `/library/{id}` or `/discover/series/{id}`

## Code Conventions
- Path alias: `@/*` maps to `./src/*`
- Server components by default; client components use `"use client"` directive
- Server actions in `src/actions/` with `"use server"` directive
- Toast notifications via Sonner (not alert/confirm)
- Loading states via `loading.tsx` skeleton files in each route
- Empty states use `<EmptyState>` component from `src/components/longbox/empty-state.tsx`
- Reusable cards: `SeriesGridCard`, `IssueGridCard`, `GridCard` — don't create inline card markup
- Cover images served via `/api/cover/[bookId]` with disk cache at `public/cache/covers/`
- Comic files (CBZ/CBR) extracted via yauzl/node-unrar-js; covers resized with sharp
- Env validation via Zod in `src/lib/env.ts`, runs at startup in `src/instrumentation.ts`
- `revalidatePath` calls should use `/series/{id}` paths

## Database
- PostgreSQL with individual connection vars: DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME
- Defaults: localhost:5432, user=longbox, password=longbox_secret, db=longbox
- UUIDs for primary keys (defaultRandom)
- Enums: series_status (ongoing/ended/canceled), edition_type (issue/tpb/omnibus), request_state (draft/requested/searching/fulfilled)

## Gotchas
- node-unrar-js requires WASM support - configured in next.config.ts webpack config
- `serverExternalPackages: ['node-unrar-js']` required in next.config.ts
- `output: 'standalone'` set for Docker builds
- Cover cache dir (`public/cache/covers/`) is gitignored - must be writable in production
- No test suite exists yet
- `HeroHeader` component exists but is currently unused — the unified series page uses flat layout directly
