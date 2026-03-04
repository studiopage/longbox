# Phase 5: Reader & External Access Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add pinch/pan/zoom to the comic reader, fix discovery page empty state, implement OPDS 1.2 feeds for Mihon, and add PWA support with offline caching.

**Architecture:** Reader zoom wraps existing image elements with react-zoom-pan-pinch. Discovery page checks for API key config before loading. OPDS 1.2 uses HTTP Basic Auth validated in middleware, with Atom XML built via template literals. PWA uses next-pwa for service worker generation with StaleWhileRevalidate caching for covers.

**Tech Stack:** react-zoom-pan-pinch, next-pwa (Workbox), OPDS 1.2 Atom XML, HTTP Basic Auth, bcryptjs

---

## Batch 1: Reader Zoom

### Task 1: Install react-zoom-pan-pinch

**Files:**
- Modify: `package.json`

**Step 1: Install dependency**

Run: `npm install react-zoom-pan-pinch`

**Step 2: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add react-zoom-pan-pinch dependency"
```

---

### Task 2: Add zoom/pan/pinch to Standard/RTL reader modes

**Files:**
- Modify: `src/app/read/[id]/page.tsx:1-441`

**Context:** The reader page is a client component at `src/app/read/[id]/page.tsx`. It has two rendering paths: Standard/RTL (single page, lines 329-354) and Webtoon (vertical scroll, lines 315-326). Click-zone navigation for Standard/RTL is in `handleImageClick` (lines 201-221) which splits the image into left 30% (prev), right 30% (next), middle 40% (toggle controls).

**Step 1: Add TransformWrapper/TransformComponent imports**

At the top of `src/app/read/[id]/page.tsx`, add:

```typescript
import { TransformWrapper, TransformComponent, useControls } from 'react-zoom-pan-pinch';
```

**Step 2: Add zoom state tracking**

Add a ref to track current zoom scale, after the existing refs (line ~34):

```typescript
const zoomScaleRef = useRef(1);
```

**Step 3: Modify handleImageClick to respect zoom**

Update `handleImageClick` (line 201) to skip click-zone navigation when zoomed in. When `zoomScaleRef.current > 1`, only toggle controls on tap — no page navigation:

```typescript
const handleImageClick = (e: React.MouseEvent) => {
  if (settings.readMode === 'webtoon') {
    toggleControls();
    return;
  }

  // When zoomed in, only toggle controls — don't navigate
  if (zoomScaleRef.current > 1.05) {
    toggleControls();
    return;
  }

  const rect = e.currentTarget.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const width = rect.width;

  if (clickX < width * 0.3) {
    goPrev();
  } else if (clickX > width * 0.7) {
    goNext();
  } else {
    toggleControls();
  }
};
```

**Step 4: Wrap the Standard/RTL image in TransformWrapper**

Replace the Standard/RTL rendering block (lines 329-354) with:

```tsx
<div
  className="relative w-full h-full flex items-center justify-center cursor-pointer"
>
  <TransformWrapper
    key={page}
    initialScale={1}
    minScale={1}
    maxScale={4}
    doubleClick={{ mode: 'toggle', step: 1 }}
    panning={{ disabled: false }}
    onTransformed={(_ref, state) => {
      zoomScaleRef.current = state.scale;
    }}
  >
    <TransformComponent
      wrapperStyle={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      contentStyle={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <img
        src={`/api/read/${id}/${page}`}
        alt={`Page ${page}`}
        className="max-h-screen max-w-full object-contain select-none"
        style={imageStyle}
        onLoad={() => setLoading(false)}
        onError={() => setLoading(false)}
        onClick={handleImageClick}
      />
    </TransformComponent>
  </TransformWrapper>

  {loading && (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
      <div className="w-10 h-10 border-4 border-white/20 border-t-white rounded-full animate-spin" />
    </div>
  )}
</div>
```

Key details:
- `key={page}` on TransformWrapper resets zoom to 1x when page changes
- `doubleClick.mode: 'toggle'` toggles between 1x and 2x on double-tap
- `onTransformed` tracks current scale so `handleImageClick` knows whether we're zoomed
- `minScale={1}` prevents zooming out beyond fit
- `maxScale={4}` allows 4x zoom for detailed panel reading

**Step 5: Verify the build**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 6: Commit**

```bash
git add src/app/read/[id]/page.tsx
git commit -m "feat: add pinch/pan/zoom to comic reader (Standard & RTL modes)"
```

---

### Task 3: Add zoom to Webtoon mode

**Files:**
- Modify: `src/app/read/[id]/page.tsx`

**Context:** Webtoon mode renders all pages in a vertical scroll container (lines 315-326). Zoom should wrap the entire scroll content so users can zoom into any panel while scrolling.

**Step 1: Wrap Webtoon content in TransformWrapper**

Replace the Webtoon rendering block (lines 313-326) with:

```tsx
{settings.readMode === 'webtoon' ? (
  <TransformWrapper
    initialScale={1}
    minScale={1}
    maxScale={4}
    doubleClick={{ mode: 'toggle', step: 1 }}
    panning={{ disabled: false }}
  >
    <TransformComponent
      wrapperStyle={{ width: '100%', height: '100%', overflow: 'auto' }}
    >
      <div className="flex flex-col items-center pt-20 pb-32" onClick={toggleControls}>
        {webtoonPages.map((pageNum) => (
          <img
            key={pageNum}
            src={`/api/read/${id}/${pageNum}`}
            alt={`Page ${pageNum}`}
            className="w-full max-w-3xl"
            style={imageStyle}
            loading="lazy"
          />
        ))}
      </div>
    </TransformComponent>
  </TransformWrapper>
) : (
```

**Step 2: Verify the build**

Run: `npm run build`
Expected: Build succeeds.

**Step 3: Commit**

```bash
git add src/app/read/[id]/page.tsx
git commit -m "feat: add pinch/pan/zoom to Webtoon reader mode"
```

---

## Batch 2: Discovery Page Fix

### Task 4: Create checkComicVineConfigured server action

**Files:**
- Create: `src/actions/discovery.ts`

**Context:** The ComicVine API key is stored in `systemSettings` table. The existing `getSettings()` in `src/actions/settings.ts` (line 11) returns the full settings row which has a `cv_api_key` field. The discovery page at `src/app/(dashboard)/discovery/page.tsx` needs to know if this key is configured before attempting to browse.

**Step 1: Create the server action file**

Create `src/actions/discovery.ts`:

```typescript
'use server';

import { getSettings } from '@/actions/settings';

/**
 * Check whether a ComicVine API key is configured.
 * Used by the discovery page to show helpful guidance when unconfigured.
 */
export async function checkComicVineConfigured(): Promise<boolean> {
  const settings = await getSettings();
  return !!settings?.cv_api_key;
}
```

**Step 2: Commit**

```bash
git add src/actions/discovery.ts
git commit -m "feat: add checkComicVineConfigured server action"
```

---

### Task 5: Update discovery page with config-aware empty state

**Files:**
- Modify: `src/app/(dashboard)/discovery/page.tsx:1-357`

**Context:** The discovery page is a client component. When `browseComicVine()` returns `[]` (line 34 in comicvine.ts — `if (!CV_API_KEY) return [];`), the page shows a generic "No series found" message (lines 291-295). We need to check config on mount and show a targeted empty state.

**Step 1: Add imports**

Add to the imports section:

```typescript
import { checkComicVineConfigured } from '@/actions/discovery';
import { Compass } from 'lucide-react';
```

**Step 2: Add config state**

After the existing state declarations (line ~68), add:

```typescript
const [apiConfigured, setApiConfigured] = useState<boolean | null>(null);
```

**Step 3: Add config check effect**

After the existing `useEffect` for closing search results (lines 137-146), add:

```typescript
// Check ComicVine API configuration
useEffect(() => {
  checkComicVineConfigured().then(setApiConfigured);
}, []);
```

**Step 4: Replace the empty state block**

Replace the current empty state (lines 290-295):

```tsx
) : seriesResults.length === 0 ? (
  <div className="text-center py-16">
    <Book className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
    <h3 className="text-lg font-medium text-muted-foreground">No series found</h3>
    <p className="text-muted-foreground mt-1 text-sm">Try adjusting your filters or check API settings</p>
  </div>
```

With:

```tsx
) : seriesResults.length === 0 ? (
  apiConfigured === false ? (
    <div className="text-center py-16">
      <Compass className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
      <h3 className="text-lg font-medium text-foreground">ComicVine Not Configured</h3>
      <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto">
        Add your ComicVine API key in Settings to browse and discover series.
      </p>
      <div className="flex flex-col items-center gap-3 mt-6">
        <Link
          href="/settings"
          className="px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded hover:bg-primary/20 transition-colors text-sm"
        >
          Go to Settings
        </Link>
        <Link
          href="/discover/characters"
          className="text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          Browse Characters instead
        </Link>
      </div>
    </div>
  ) : (
    <div className="text-center py-16">
      <Book className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
      <h3 className="text-lg font-medium text-muted-foreground">No series found</h3>
      <p className="text-muted-foreground mt-1 text-sm">
        Try adjusting your filters or check your API key in Settings
      </p>
    </div>
  )
```

**Step 5: Verify the build**

Run: `npm run build`
Expected: Build succeeds.

**Step 6: Commit**

```bash
git add src/app/(dashboard)/discovery/page.tsx
git commit -m "feat: show config guidance on discovery page when ComicVine API key missing"
```

---

## Batch 3: OPDS XML Builder + Auth Middleware

### Task 6: Create OPDS Atom XML builder

**Files:**
- Create: `src/lib/opds.ts`

**Context:** OPDS 1.2 uses Atom XML feeds. Navigation feeds list other feeds (catalog, series list, publishers). Acquisition feeds list downloadable books. Each entry has title, id, updated timestamp, links (for covers, downloads). The XML is simple enough to build with template literals — no library needed.

**Step 1: Create the OPDS builder**

Create `src/lib/opds.ts`:

```typescript
/**
 * OPDS 1.2 Atom XML Feed Builder
 *
 * Builds Atom XML feeds for OPDS 1.2 catalog serving.
 * Uses template literals — no XML library needed.
 *
 * OPDS spec: https://specs.opds.io/opds-1.2
 */

const ATOM_NS = 'http://www.w3.org/2005/Atom';
const OPDS_NS = 'http://opds-spec.org/2010/catalog';
const OPENSEARCH_NS = 'http://a9.com/-/spec/opensearch/1.1/';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(date: Date | null): string {
  return (date ?? new Date()).toISOString();
}

export interface NavigationEntry {
  title: string;
  href: string;
  /** Brief description shown below the title */
  content?: string;
  /** Number of items (shown as count) */
  count?: number;
}

export interface AcquisitionEntry {
  id: string;
  title: string;
  /** Author/creator names */
  authors?: string;
  /** Brief summary */
  summary?: string;
  /** ISO timestamp */
  updated: string;
  /** URL to cover thumbnail image */
  coverUrl?: string;
  /** URL to download the file */
  downloadUrl: string;
  /** MIME type of the download (application/x-cbz or application/x-cbr) */
  downloadType: string;
}

/**
 * Build an OPDS Navigation Feed (lists other feeds)
 */
export function buildNavigationFeed(
  title: string,
  selfUrl: string,
  entries: NavigationEntry[]
): string {
  const entryXml = entries.map(e => `
    <entry>
      <title>${escapeXml(e.title)}</title>
      <id>${escapeXml(e.href)}</id>
      <updated>${formatDate(null)}</updated>
      <link rel="subsection" href="${escapeXml(e.href)}" type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
      ${e.content ? `<content type="text">${escapeXml(e.content)}${e.count != null ? ` (${e.count})` : ''}</content>` : ''}
    </entry>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="${ATOM_NS}" xmlns:opds="${OPDS_NS}">
  <id>${escapeXml(selfUrl)}</id>
  <title>${escapeXml(title)}</title>
  <updated>${formatDate(null)}</updated>
  <link rel="self" href="${escapeXml(selfUrl)}" type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
  <link rel="start" href="/api/opds/v1.2/catalog" type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
  <link rel="search" href="/api/opds/v1.2/search" type="application/opensearchdescription+xml"/>
  ${entryXml}
</feed>`;
}

/**
 * Build an OPDS Acquisition Feed (lists downloadable books)
 */
export function buildAcquisitionFeed(
  title: string,
  selfUrl: string,
  entries: AcquisitionEntry[]
): string {
  const entryXml = entries.map(e => `
    <entry>
      <title>${escapeXml(e.title)}</title>
      <id>urn:longbox:book:${escapeXml(e.id)}</id>
      <updated>${e.updated}</updated>
      ${e.authors ? `<author><name>${escapeXml(e.authors)}</name></author>` : ''}
      ${e.summary ? `<summary type="text">${escapeXml(e.summary)}</summary>` : ''}
      ${e.coverUrl ? `<link rel="http://opds-spec.org/image/thumbnail" href="${escapeXml(e.coverUrl)}" type="image/jpeg"/>` : ''}
      <link rel="http://opds-spec.org/acquisition" href="${escapeXml(e.downloadUrl)}" type="${escapeXml(e.downloadType)}"/>
    </entry>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="${ATOM_NS}" xmlns:opds="${OPDS_NS}">
  <id>${escapeXml(selfUrl)}</id>
  <title>${escapeXml(title)}</title>
  <updated>${formatDate(null)}</updated>
  <link rel="self" href="${escapeXml(selfUrl)}" type="application/atom+xml;profile=opds-catalog;kind=acquisition"/>
  <link rel="start" href="/api/opds/v1.2/catalog" type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
  <link rel="search" href="/api/opds/v1.2/search" type="application/opensearchdescription+xml"/>
  ${entryXml}
</feed>`;
}

/**
 * Build OpenSearch description document
 */
export function buildSearchDescription(baseUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="${OPENSEARCH_NS}">
  <ShortName>Longbox</ShortName>
  <Description>Search your Longbox comic library</Description>
  <Url type="application/atom+xml;profile=opds-catalog;kind=acquisition" template="${escapeXml(baseUrl)}/api/opds/v1.2/search?q={searchTerms}"/>
</OpenSearchDescription>`;
}

/**
 * Helper: determine MIME type from file path extension
 */
export function getMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().split('.').pop();
  switch (ext) {
    case 'cbz':
    case 'zip':
      return 'application/x-cbz';
    case 'cbr':
    case 'rar':
      return 'application/x-cbr';
    default:
      return 'application/octet-stream';
  }
}

/** Standard OPDS response headers */
export const OPDS_HEADERS = {
  'Content-Type': 'application/atom+xml; charset=utf-8',
} as const;
```

**Step 2: Commit**

```bash
git add src/lib/opds.ts
git commit -m "feat: add OPDS 1.2 Atom XML builder (navigation, acquisition, search)"
```

---

### Task 7: Add OPDS Basic Auth to middleware

**Files:**
- Modify: `src/middleware.ts:1-47`

**Context:** The existing middleware at `src/middleware.ts` uses NextAuth's `auth()` wrapper for JWT-based session auth. OPDS clients (like Mihon) don't support JWT — they use HTTP Basic Auth. We need to intercept `/api/opds/` requests, validate Basic Auth credentials against the `users` table with bcrypt, and pass the authenticated user ID downstream.

Important: The middleware runs in the Edge runtime which does NOT support `bcryptjs` or direct DB access. We need to delegate auth validation to an API route helper instead. The middleware will check for the `Authorization` header and pass it through; actual validation happens in a shared helper called from each OPDS route handler.

**Step 1: Create OPDS auth helper**

Create `src/lib/opds-auth.ts`:

```typescript
/**
 * OPDS HTTP Basic Auth helper
 *
 * Validates Basic Auth credentials against the users table.
 * Called from OPDS route handlers (not middleware, since middleware
 * runs in Edge runtime which doesn't support bcryptjs).
 */

import { db } from '@/db';
import { users } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyPassword } from '@/lib/auth';
import { NextRequest, NextResponse } from 'next/server';

const UNAUTHORIZED_RESPONSE = new NextResponse('Unauthorized', {
  status: 401,
  headers: {
    'WWW-Authenticate': 'Basic realm="Longbox OPDS"',
  },
});

/**
 * Validate OPDS Basic Auth and return the user ID.
 * Returns null and a 401 response if auth fails.
 */
export async function validateOPDSAuth(
  request: NextRequest
): Promise<{ userId: string } | NextResponse> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Basic ')) {
    return UNAUTHORIZED_RESPONSE;
  }

  const base64 = authHeader.slice(6);
  let decoded: string;
  try {
    decoded = atob(base64);
  } catch {
    return UNAUTHORIZED_RESPONSE;
  }

  const colonIndex = decoded.indexOf(':');
  if (colonIndex === -1) {
    return UNAUTHORIZED_RESPONSE;
  }

  const email = decoded.slice(0, colonIndex);
  const password = decoded.slice(colonIndex + 1);

  if (!email || !password) {
    return UNAUTHORIZED_RESPONSE;
  }

  // Look up user by email
  const [user] = await db
    .select({ id: users.id, password: users.password })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user?.password) {
    return UNAUTHORIZED_RESPONSE;
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return UNAUTHORIZED_RESPONSE;
  }

  return { userId: user.id };
}
```

**Step 2: Update middleware to allow OPDS routes without JWT**

In `src/middleware.ts`, add `/api/opds` to the `alwaysAccessible` array so the NextAuth wrapper doesn't redirect OPDS clients to the login page:

Change line 8:
```typescript
const alwaysAccessible = ['/_next', '/favicon.ico', '/api/auth', '/api/opds'];
```

**Step 3: Commit**

```bash
git add src/lib/opds-auth.ts src/middleware.ts
git commit -m "feat: add OPDS Basic Auth helper and allow OPDS routes in middleware"
```

---

## Batch 4: OPDS Route Handlers (Catalog, Series, Publishers)

### Task 8: Create OPDS catalog root feed

**Files:**
- Create: `src/app/api/opds/v1.2/catalog/route.ts`

**Context:** The catalog is the entry point for OPDS clients. It lists navigation links to: all series, browse by publisher, recently added, reading list, and search. Uses `buildNavigationFeed()` from `src/lib/opds.ts`. Auth via `validateOPDSAuth()` from `src/lib/opds-auth.ts`.

**Step 1: Create the route handler**

Create `src/app/api/opds/v1.2/catalog/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { buildNavigationFeed, OPDS_HEADERS } from '@/lib/opds';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const feed = buildNavigationFeed(
    'Longbox',
    '/api/opds/v1.2/catalog',
    [
      {
        title: 'All Series',
        href: '/api/opds/v1.2/series',
        content: 'Browse all series alphabetically',
      },
      {
        title: 'By Publisher',
        href: '/api/opds/v1.2/publishers',
        content: 'Browse series grouped by publisher',
      },
      {
        title: 'Recently Added',
        href: '/api/opds/v1.2/new',
        content: 'Recently added books',
      },
      {
        title: 'Reading List',
        href: '/api/opds/v1.2/reading',
        content: 'Your reading list',
      },
    ]
  );

  return new NextResponse(feed, { headers: OPDS_HEADERS });
}
```

**Step 2: Commit**

```bash
git add src/app/api/opds/v1.2/catalog/route.ts
git commit -m "feat: add OPDS catalog root navigation feed"
```

---

### Task 9: Create OPDS series list and series detail feeds

**Files:**
- Create: `src/app/api/opds/v1.2/series/route.ts`
- Create: `src/app/api/opds/v1.2/series/[id]/route.ts`

**Context:** The series list is a navigation feed listing all series alphabetically (each links to its detail feed). The series detail feed is an acquisition feed listing all books in a series with download links. Schema reference: `series` table (id, name, publisher — `src/db/schema.ts:108`), `books` table (id, series_id, title, number, authors, summary, file_path, created_at — `src/db/schema.ts:219`).

**Step 1: Create series list feed**

Create `src/app/api/opds/v1.2/series/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { series, books } from '@/db/schema';
import { asc, count, eq } from 'drizzle-orm';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { buildNavigationFeed, OPDS_HEADERS } from '@/lib/opds';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  // Get all series with book counts
  const rows = await db
    .select({
      id: series.id,
      name: series.name,
      publisher: series.publisher,
      bookCount: count(books.id),
    })
    .from(series)
    .leftJoin(books, eq(books.series_id, series.id))
    .groupBy(series.id, series.name, series.publisher)
    .orderBy(asc(series.name));

  const entries = rows.map(row => ({
    title: row.name,
    href: `/api/opds/v1.2/series/${row.id}`,
    content: row.publisher ?? 'Unknown Publisher',
    count: row.bookCount,
  }));

  const feed = buildNavigationFeed(
    'All Series',
    '/api/opds/v1.2/series',
    entries
  );

  return new NextResponse(feed, { headers: OPDS_HEADERS });
}
```

**Step 2: Create series detail (acquisition) feed**

Create `src/app/api/opds/v1.2/series/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { series, books } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { validateOPDSAuth } from '@/lib/opds-auth';
import {
  buildAcquisitionFeed,
  getMimeType,
  OPDS_HEADERS,
  type AcquisitionEntry,
} from '@/lib/opds';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  // Get series info
  const [seriesRow] = await db
    .select({ name: series.name })
    .from(series)
    .where(eq(series.id, id))
    .limit(1);

  if (!seriesRow) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Get all books in the series
  const bookRows = await db
    .select()
    .from(books)
    .where(eq(books.series_id, id))
    .orderBy(asc(books.number));

  const entries: AcquisitionEntry[] = bookRows.map(book => ({
    id: book.id,
    title: book.number ? `${book.title} #${book.number}` : book.title,
    authors: book.authors ?? undefined,
    summary: book.summary ?? undefined,
    updated: (book.updated_at ?? book.created_at ?? new Date()).toISOString(),
    coverUrl: `/api/cover/${book.id}`,
    downloadUrl: `/api/read/${book.id}/download`,
    downloadType: getMimeType(book.file_path),
  }));

  const feed = buildAcquisitionFeed(
    seriesRow.name,
    `/api/opds/v1.2/series/${id}`,
    entries
  );

  return new NextResponse(feed, { headers: OPDS_HEADERS });
}
```

**Step 3: Commit**

```bash
git add src/app/api/opds/v1.2/series/route.ts src/app/api/opds/v1.2/series/\[id\]/route.ts
git commit -m "feat: add OPDS series list and series detail feeds"
```

---

### Task 10: Create OPDS publishers feed

**Files:**
- Create: `src/app/api/opds/v1.2/publishers/route.ts`

**Context:** Lists unique publishers from the `series` table. Each entry links to the series list filtered by publisher. Since OPDS doesn't support query-param filtering natively, we'll use a `?publisher=` param on the series list route.

**Step 1: Create publishers feed**

Create `src/app/api/opds/v1.2/publishers/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { series, books } from '@/db/schema';
import { sql, asc, count, eq, isNotNull } from 'drizzle-orm';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { buildNavigationFeed, OPDS_HEADERS } from '@/lib/opds';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  // Get distinct publishers with series counts
  const rows = await db
    .select({
      publisher: series.publisher,
      seriesCount: count(series.id),
    })
    .from(series)
    .where(isNotNull(series.publisher))
    .groupBy(series.publisher)
    .orderBy(asc(series.publisher));

  const entries = rows
    .filter(r => r.publisher)
    .map(row => ({
      title: row.publisher!,
      href: `/api/opds/v1.2/series?publisher=${encodeURIComponent(row.publisher!)}`,
      content: 'Browse series',
      count: row.seriesCount,
    }));

  const feed = buildNavigationFeed(
    'Publishers',
    '/api/opds/v1.2/publishers',
    entries
  );

  return new NextResponse(feed, { headers: OPDS_HEADERS });
}
```

**Step 2: Update series list route to support publisher filter**

In `src/app/api/opds/v1.2/series/route.ts`, add publisher query param support. After parsing auth, add:

```typescript
const publisherFilter = request.nextUrl.searchParams.get('publisher');
```

And modify the query to conditionally filter:

```typescript
const baseQuery = db
  .select({
    id: series.id,
    name: series.name,
    publisher: series.publisher,
    bookCount: count(books.id),
  })
  .from(series)
  .leftJoin(books, eq(books.series_id, series.id));

const rows = publisherFilter
  ? await baseQuery
      .where(eq(series.publisher, publisherFilter))
      .groupBy(series.id, series.name, series.publisher)
      .orderBy(asc(series.name))
  : await baseQuery
      .groupBy(series.id, series.name, series.publisher)
      .orderBy(asc(series.name));
```

Update the feed title to reflect filtering:

```typescript
const feedTitle = publisherFilter ? `Series — ${publisherFilter}` : 'All Series';
```

**Step 3: Commit**

```bash
git add src/app/api/opds/v1.2/publishers/route.ts src/app/api/opds/v1.2/series/route.ts
git commit -m "feat: add OPDS publishers feed and publisher filtering on series list"
```

---

## Batch 5: OPDS Route Handlers (New, Reading, Collections, Search, Download)

### Task 11: Create OPDS recently added and reading list feeds

**Files:**
- Create: `src/app/api/opds/v1.2/new/route.ts`
- Create: `src/app/api/opds/v1.2/reading/route.ts`

**Context:** "Recently Added" shows the latest 50 books ordered by `created_at desc`. "Reading List" shows the user's reading list (from `reading_list` table — `src/db/schema.ts:355`, joined with `books`). The reading list is user-specific, so we use the authenticated `userId` from `validateOPDSAuth()`.

**Step 1: Create recently added feed**

Create `src/app/api/opds/v1.2/new/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { books } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { validateOPDSAuth } from '@/lib/opds-auth';
import {
  buildAcquisitionFeed,
  getMimeType,
  OPDS_HEADERS,
  type AcquisitionEntry,
} from '@/lib/opds';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const rows = await db
    .select()
    .from(books)
    .orderBy(desc(books.created_at))
    .limit(50);

  const entries: AcquisitionEntry[] = rows.map(book => ({
    id: book.id,
    title: book.number ? `${book.title} #${book.number}` : book.title,
    authors: book.authors ?? undefined,
    summary: book.summary ?? undefined,
    updated: (book.created_at ?? new Date()).toISOString(),
    coverUrl: `/api/cover/${book.id}`,
    downloadUrl: `/api/read/${book.id}/download`,
    downloadType: getMimeType(book.file_path),
  }));

  const feed = buildAcquisitionFeed(
    'Recently Added',
    '/api/opds/v1.2/new',
    entries
  );

  return new NextResponse(feed, { headers: OPDS_HEADERS });
}
```

**Step 2: Create reading list feed**

Create `src/app/api/opds/v1.2/reading/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { readingList, books } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { validateOPDSAuth } from '@/lib/opds-auth';
import {
  buildAcquisitionFeed,
  getMimeType,
  OPDS_HEADERS,
  type AcquisitionEntry,
} from '@/lib/opds';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const rows = await db
    .select({
      id: books.id,
      title: books.title,
      number: books.number,
      authors: books.authors,
      summary: books.summary,
      file_path: books.file_path,
      created_at: books.created_at,
    })
    .from(readingList)
    .innerJoin(books, eq(readingList.book_id, books.id))
    .where(eq(readingList.user_id, auth.userId))
    .orderBy(desc(readingList.id));

  const entries: AcquisitionEntry[] = rows.map(book => ({
    id: book.id,
    title: book.number ? `${book.title} #${book.number}` : book.title,
    authors: book.authors ?? undefined,
    summary: book.summary ?? undefined,
    updated: (book.created_at ?? new Date()).toISOString(),
    coverUrl: `/api/cover/${book.id}`,
    downloadUrl: `/api/read/${book.id}/download`,
    downloadType: getMimeType(book.file_path),
  }));

  const feed = buildAcquisitionFeed(
    'Reading List',
    '/api/opds/v1.2/reading',
    entries
  );

  return new NextResponse(feed, { headers: OPDS_HEADERS });
}
```

**Step 3: Commit**

```bash
git add src/app/api/opds/v1.2/new/route.ts src/app/api/opds/v1.2/reading/route.ts
git commit -m "feat: add OPDS recently added and reading list feeds"
```

---

### Task 12: Create OPDS smart collection feed

**Files:**
- Create: `src/app/api/opds/v1.2/collections/[id]/route.ts`

**Context:** Smart collections are stored in the `collections` table (`src/db/schema.ts:328`) with `smart_rules` jsonb field. The rules engine at `src/lib/rules-engine.ts` translates rules to Drizzle WHERE clauses via `buildWhereClause(rules, userId)`. For manual collections, books are in `collection_items`. We need to support both types.

Also add a collections navigation entry to the catalog.

**Step 1: Create collection feed**

Create `src/app/api/opds/v1.2/collections/[id]/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { collections, collectionItems, books, series } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { validateOPDSAuth } from '@/lib/opds-auth';
import {
  buildAcquisitionFeed,
  getMimeType,
  OPDS_HEADERS,
  type AcquisitionEntry,
} from '@/lib/opds';
import type { SmartRules } from '@/types/longbox';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  // Get collection
  const [collection] = await db
    .select()
    .from(collections)
    .where(eq(collections.id, id))
    .limit(1);

  if (!collection) {
    return new NextResponse('Not Found', { status: 404 });
  }

  let bookRows: typeof books.$inferSelect[];

  if (collection.smart_rules) {
    // Smart collection: use rules engine
    // Import dynamically to avoid circular deps
    const { buildWhereClause } = await import('@/lib/rules-engine');
    const where = buildWhereClause(collection.smart_rules as SmartRules, auth.userId);

    bookRows = await db
      .select({
        id: books.id,
        series_id: books.series_id,
        file_path: books.file_path,
        file_size: books.file_size,
        title: books.title,
        number: books.number,
        page_count: books.page_count,
        summary: books.summary,
        publisher: books.publisher,
        authors: books.authors,
        published_date: books.published_date,
        metron_id: books.metron_id,
        credits: books.credits,
        story_arcs: books.story_arcs,
        match_flags: books.match_flags,
        created_at: books.created_at,
        updated_at: books.updated_at,
      })
      .from(books)
      .innerJoin(series, eq(books.series_id, series.id))
      .where(where)
      .orderBy(asc(books.title))
      .limit(200);
  } else {
    // Manual collection: use collection_items join
    bookRows = await db
      .select({
        id: books.id,
        series_id: books.series_id,
        file_path: books.file_path,
        file_size: books.file_size,
        title: books.title,
        number: books.number,
        page_count: books.page_count,
        summary: books.summary,
        publisher: books.publisher,
        authors: books.authors,
        published_date: books.published_date,
        metron_id: books.metron_id,
        credits: books.credits,
        story_arcs: books.story_arcs,
        match_flags: books.match_flags,
        created_at: books.created_at,
        updated_at: books.updated_at,
      })
      .from(collectionItems)
      .innerJoin(books, eq(collectionItems.book_id, books.id))
      .where(eq(collectionItems.collection_id, id))
      .orderBy(asc(books.title))
      .limit(200);
  }

  const entries: AcquisitionEntry[] = bookRows.map(book => ({
    id: book.id,
    title: book.number ? `${book.title} #${book.number}` : book.title,
    authors: book.authors ?? undefined,
    summary: book.summary ?? undefined,
    updated: (book.updated_at ?? book.created_at ?? new Date()).toISOString(),
    coverUrl: `/api/cover/${book.id}`,
    downloadUrl: `/api/read/${book.id}/download`,
    downloadType: getMimeType(book.file_path),
  }));

  const feed = buildAcquisitionFeed(
    collection.name,
    `/api/opds/v1.2/collections/${id}`,
    entries
  );

  return new NextResponse(feed, { headers: OPDS_HEADERS });
}
```

**Step 2: Update catalog to include collections**

In `src/app/api/opds/v1.2/catalog/route.ts`, add a collections navigation entry. First, fetch user's collections:

```typescript
import { db } from '@/db';
import { collections } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
```

After auth validation, fetch collections and build entries dynamically:

```typescript
// Get user's collections for the catalog
const userCollections = await db
  .select({ id: collections.id, name: collections.name })
  .from(collections)
  .where(eq(collections.user_id, auth.userId))
  .orderBy(desc(collections.pinned), collections.name);

const collectionEntries = userCollections.map(c => ({
  title: c.name,
  href: `/api/opds/v1.2/collections/${c.id}`,
  content: 'Smart/manual collection',
}));
```

Add collection entries to the navigation feed entries array (after the Reading List entry).

**Step 3: Commit**

```bash
git add src/app/api/opds/v1.2/collections/\[id\]/route.ts src/app/api/opds/v1.2/catalog/route.ts
git commit -m "feat: add OPDS smart collection feeds and collections in catalog"
```

---

### Task 13: Create OPDS search feed

**Files:**
- Create: `src/app/api/opds/v1.2/search/route.ts`

**Context:** OPDS search uses OpenSearch. The search description XML is served via a GET when no `q` param is present. When `q` is present, it returns an acquisition feed of matching books. Search matches against `books.title` and `series.name` using `ilike`.

**Step 1: Create search route**

Create `src/app/api/opds/v1.2/search/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { books, series } from '@/db/schema';
import { eq, or, ilike } from 'drizzle-orm';
import { validateOPDSAuth } from '@/lib/opds-auth';
import {
  buildAcquisitionFeed,
  buildSearchDescription,
  getMimeType,
  OPDS_HEADERS,
  type AcquisitionEntry,
} from '@/lib/opds';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const query = request.nextUrl.searchParams.get('q');

  // If no query, return OpenSearch description
  if (!query) {
    const baseUrl = request.nextUrl.origin;
    const xml = buildSearchDescription(baseUrl);
    return new NextResponse(xml, {
      headers: { 'Content-Type': 'application/opensearchdescription+xml; charset=utf-8' },
    });
  }

  // Search books and series
  const rows = await db
    .select({
      id: books.id,
      title: books.title,
      number: books.number,
      authors: books.authors,
      summary: books.summary,
      file_path: books.file_path,
      created_at: books.created_at,
      updated_at: books.updated_at,
    })
    .from(books)
    .innerJoin(series, eq(books.series_id, series.id))
    .where(
      or(
        ilike(books.title, `%${query}%`),
        ilike(series.name, `%${query}%`)
      )
    )
    .limit(50);

  const entries: AcquisitionEntry[] = rows.map(book => ({
    id: book.id,
    title: book.number ? `${book.title} #${book.number}` : book.title,
    authors: book.authors ?? undefined,
    summary: book.summary ?? undefined,
    updated: (book.updated_at ?? book.created_at ?? new Date()).toISOString(),
    coverUrl: `/api/cover/${book.id}`,
    downloadUrl: `/api/read/${book.id}/download`,
    downloadType: getMimeType(book.file_path),
  }));

  const feed = buildAcquisitionFeed(
    `Search: ${query}`,
    `/api/opds/v1.2/search?q=${encodeURIComponent(query)}`,
    entries
  );

  return new NextResponse(feed, { headers: OPDS_HEADERS });
}
```

**Step 2: Commit**

```bash
git add src/app/api/opds/v1.2/search/route.ts
git commit -m "feat: add OPDS search feed with OpenSearch description"
```

---

### Task 14: Create book download endpoint for OPDS

**Files:**
- Create: `src/app/api/read/[id]/download/route.ts`

**Context:** OPDS acquisition entries need a direct download link to the comic file. The existing reader API at `src/app/api/read/[id]/[page]/route.ts` extracts individual pages. We need a new endpoint that streams the entire file. Auth uses the same OPDS Basic Auth (or session auth for browser use).

**Step 1: Create download route**

Create `src/app/api/read/[id]/download/route.ts`:

```typescript
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import { db } from '@/db';
import { books } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { auth } from '@/lib/auth';
import { getMimeType } from '@/lib/opds';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Support both session auth (browser) and Basic Auth (OPDS clients)
  const session = await auth();
  if (!session?.user) {
    const opdsAuth = await validateOPDSAuth(request);
    if (opdsAuth instanceof NextResponse) return opdsAuth;
  }

  const { id } = await params;

  // Look up book
  const [book] = await db
    .select({ file_path: books.file_path, title: books.title })
    .from(books)
    .where(eq(books.id, id))
    .limit(1);

  if (!book) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Read file
  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.readFile(book.file_path);
  } catch {
    return new NextResponse('File not accessible', { status: 500 });
  }

  const ext = path.extname(book.file_path);
  const filename = `${book.title}${ext}`;
  const mimeType = getMimeType(book.file_path);

  return new NextResponse(fileBuffer, {
    headers: {
      'Content-Type': mimeType,
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Content-Length': String(fileBuffer.length),
    },
  });
}
```

**Step 2: Verify the build**

Run: `npm run build`
Expected: Build succeeds with no errors.

**Step 3: Commit**

```bash
git add src/app/api/read/\[id\]/download/route.ts
git commit -m "feat: add book file download endpoint for OPDS acquisition"
```

---

## Batch 6: PWA Support

### Task 15: Install next-pwa and create manifest

**Files:**
- Modify: `package.json`
- Create: `public/manifest.json`
- Create: `public/icons/icon-192.png` (placeholder)
- Create: `public/icons/icon-512.png` (placeholder)

**Step 1: Install next-pwa**

Run: `npm install next-pwa`

**Step 2: Create manifest**

Create `public/manifest.json`:

```json
{
  "name": "Longbox",
  "short_name": "Longbox",
  "description": "Your Personal Comic Server",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "orientation": "any",
  "theme_color": "#0a0f0a",
  "background_color": "#0a0f0a",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

**Step 3: Generate placeholder icons**

Use sharp (already installed) to generate simple placeholder icons. Create a Node script and run it:

```bash
node -e "
const sharp = require('sharp');
const fs = require('fs');
fs.mkdirSync('public/icons', { recursive: true });

// Create a simple dark green square with 'LB' text as placeholder
const svg192 = '<svg width=\"192\" height=\"192\" xmlns=\"http://www.w3.org/2000/svg\"><rect width=\"192\" height=\"192\" fill=\"#0d1410\" rx=\"32\"/><text x=\"96\" y=\"110\" font-size=\"72\" font-family=\"sans-serif\" font-weight=\"bold\" text-anchor=\"middle\" fill=\"#c0c8b8\">LB</text></svg>';
const svg512 = '<svg width=\"512\" height=\"512\" xmlns=\"http://www.w3.org/2000/svg\"><rect width=\"512\" height=\"512\" fill=\"#0d1410\" rx=\"80\"/><text x=\"256\" y=\"296\" font-size=\"192\" font-family=\"sans-serif\" font-weight=\"bold\" text-anchor=\"middle\" fill=\"#c0c8b8\">LB</text></svg>';

sharp(Buffer.from(svg192)).png().toFile('public/icons/icon-192.png');
sharp(Buffer.from(svg512)).png().toFile('public/icons/icon-512.png');
console.log('Icons generated');
"
```

**Step 4: Commit**

```bash
git add package.json package-lock.json public/manifest.json public/icons/
git commit -m "chore: add next-pwa, PWA manifest, and placeholder icons"
```

---

### Task 16: Configure next-pwa and add manifest metadata to layout

**Files:**
- Modify: `next.config.ts:1-33`
- Modify: `src/app/layout.tsx:1-31`

**Context:** `next.config.ts` exports a `nextConfig` object. We need to wrap it with `withPWA()`. The root layout at `src/app/layout.tsx` needs manifest and theme-color metadata.

**Step 1: Update next.config.ts**

Wrap the config with `withPWA`. Note: `next-pwa` uses a default export function. Add at the top:

```typescript
import withPWA from 'next-pwa';
```

At the bottom, change the export from:
```typescript
export default nextConfig;
```
To:
```typescript
const pwaConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: true,
  skipWaiting: true,
});

export default pwaConfig(nextConfig);
```

**Step 2: Update layout metadata**

In `src/app/layout.tsx`, update the metadata export (line 11-14):

```typescript
export const metadata: Metadata = {
  title: 'Longbox',
  description: 'Your Personal Comic Server',
  manifest: '/manifest.json',
  themeColor: '#0a0f0a',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Longbox',
  },
};
```

Also add viewport meta for mobile in a separate export after metadata:

```typescript
export const viewport = {
  themeColor: '#0a0f0a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};
```

**Step 3: Add generated PWA files to .gitignore**

The service worker files generated by next-pwa should not be committed. Add to `.gitignore`:

```
# PWA generated files
public/sw.js
public/sw.js.map
public/workbox-*.js
public/workbox-*.js.map
public/worker-*.js
public/worker-*.js.map
```

**Step 4: Verify the build**

Run: `npm run build`
Expected: Build succeeds. `public/sw.js` is generated (only in production build).

**Step 5: Commit**

```bash
git add next.config.ts src/app/layout.tsx .gitignore
git commit -m "feat: configure next-pwa with app shell + cover caching strategy"
```

---

## Batch 7: Build Verification & CLAUDE.md Update

### Task 17: Full build verification

**Step 1: Run lint**

Run: `npm run lint`
Expected: No errors.

**Step 2: Run production build**

Run: `npm run build`
Expected: Build succeeds with all routes compiled.

**Step 3: Fix any issues found**

If lint or build fails, fix the issues. Common issues:
- React Compiler complaints about refs in effects — use the same ref pattern from Phase 3
- Import path issues — verify `@/` aliases resolve correctly
- TypeScript strict mode errors — ensure all types are properly defined

---

### Task 18: Update CLAUDE.md

**Files:**
- Modify: `CLAUDE.md`

**Step 1: Update Phase 5 in roadmap**

Mark Phase 5 as complete. Update the roadmap section. Add new files to the project structure section. Add OPDS architecture notes.

Key additions:
- New files: `src/lib/opds.ts`, `src/lib/opds-auth.ts`, `src/actions/discovery.ts`, OPDS route handlers, download endpoint, PWA files
- Modified files: reader page (zoom), discovery page (config check), middleware (OPDS routes), next.config.ts (PWA), layout (manifest)
- Architecture: OPDS Basic Auth pattern, PWA caching strategy
- Dependencies: react-zoom-pan-pinch, next-pwa

**Step 2: Commit**

```bash
git add CLAUDE.md
git commit -m "docs: update CLAUDE.md with Phase 5 completion"
```
