# Longbox Improvement Plan

This document outlines the comprehensive improvement plan for professionalizing the Longbox application.

## 🎯 Code Streamlining

### 1. Centralize Data Fetching Logic
Currently, database queries are scattered throughout page components. Create dedicated data access layer:

```typescript
// src/lib/data/series.ts
export async function getSeriesWithBooks(seriesId: string) { ... }
export async function getAllLibrarySeries() { ... }

// src/lib/data/books.ts
export async function getBookWithProgress(bookId: string, userId?: string) { ... }
```

### 2. Extract Repeated String Cleaning Logic
The issue detail page has manual title cleaning. Create utility:

```typescript
// src/lib/utils/comic-metadata.ts
export function cleanComicTitle(title: string, filename: string): string
export function parseIssueNumber(filename: string): string | null
```

### 3. Consolidate Server Components Pattern
You have `export const dynamic = 'force-dynamic'` in every page. Consider:
- Set in layout if all pages need it
- Or create a `withDynamicData` wrapper function

### 4. Remove Duplicate Components
You have both `series-card.tsx` (old card-based) and inline series cards in library page. Standardize on one:

```typescript
// Create a reusable SeriesGridCard component
<SeriesGridCard series={s} href={`/library/${s.id}`} />
```

### 5. Type Safety Improvements
- Add proper TypeScript types for all API responses
- Create shared types in `src/types/` instead of inline interfaces
- Use Zod schemas for all external API responses (you're doing this well with ComicVine already)

---

## 🎨 UI Enhancement Recommendations

### 1. Consistent Design System
You're mixing design patterns:
- Home page uses shadcn/ui `<Card>` components
- Library pages use custom Tailwind divs
- Some pages have cinematic headers, others don't

**Recommendation**: Pick one approach and standardize:
```typescript
// Option A: Full shadcn/ui system
// Option B: Custom Tailwind components (current library style)
```

### 2. Missing Cover Images Handling
- Issue thumbnails show just `#{number}` placeholder
- Extract first page from CBZ/CBR files as thumbnail
- Cache thumbnails in `/public/cache/covers/` or serve via API

### 3. Reading Progress Indicators
- Issue detail page shows hardcoded "0% Complete"
- Implement actual progress tracking from `read_progress` table
- Add visual progress bars on series cards

### 4. Loading States & Skeleton UI
Missing loading states for:
- Image loading (covers)
- API requests (ComicVine data)
- Scanner status updates

Add `loading.tsx` files and Suspense boundaries:
```tsx
// src/app/(dashboard)/library/[seriesId]/loading.tsx
export default function Loading() {
  return <SeriesDetailSkeleton />
}
```

### 5. Empty States
Good empty state on library page, but missing on:
- Series with no issues
- Requests page with no requests
- Import queue when empty

### 6. Responsive Mobile Experience
- Sidebar is hidden on mobile but no hamburger menu
- Issue grids need better mobile breakpoints
- Reader controls need touch gestures

### 7. Visual Hierarchy Issues
- Home page "New on ComicVine" section needs better spacing
- Series detail header is overwhelming (50vh height)
- Issue detail page has too much background decoration

**Quick Wins**:
```css
/* Reduce hero height on mobile */
.hero-header { height: 40vh } /* instead of 50vh */

/* Better card hover states */
.series-card:hover { transform: translateY(-4px) }

/* Add subtle shadows */
.issue-card { box-shadow: 0 2px 8px rgba(0,0,0,0.3) }
```

---

## 🏢 Professionalization

### 1. Error Handling & User Feedback
Currently, errors are logged to console but users see nothing:

```typescript
// Implement toast notifications
import { toast } from 'sonner' // Add to package.json

// Wrap operations with user-facing errors
try {
  await syncSeries()
  toast.success("Series synced successfully")
} catch (error) {
  toast.error("Failed to sync series")
}
```

### 2. Add Missing Dependencies
```bash
# Toast notifications
npm install sonner

# Image optimization
npm install sharp

# Better date handling (you already have date-fns)

# Loading states
npm install react-loading-skeleton
```

### 3. Environment Variable Validation
Add startup validation:

```typescript
// src/lib/env.ts
import { z } from 'zod'

const envSchema = z.object({
  DATABASE_URL: z.string().url(),
  LIBRARY_PATH: z.string(),
  NODE_ENV: z.enum(['development', 'production', 'test'])
})

export const env = envSchema.parse(process.env)
```

### 4. Add Proper Metadata for SEO
```typescript
// src/app/layout.tsx
export const metadata: Metadata = {
  title: 'Longbox - Comic Library Manager',
  description: 'Organize, discover, and read your comic collection',
  openGraph: { ... }
}
```

### 5. Database Migration Strategy
You're using Drizzle but no migration files visible. Add:
```bash
npm run db:generate  # Generate migrations
npm run db:migrate   # Run migrations
```

### 6. Add Health Check Endpoint
```typescript
// src/app/api/health/route.ts
export async function GET() {
  const dbHealth = await checkDatabase()
  const cvHealth = await checkComicVineAPI()

  return Response.json({
    status: 'healthy',
    services: { database: dbHealth, comicvine: cvHealth }
  })
}
```

### 7. Scanner Status Real-Time Updates
Use WebSockets or Server-Sent Events for live scanner progress:

```typescript
// src/app/api/scanner/stream/route.ts
export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      // Stream scanner progress
    }
  })
  return new Response(stream)
}
```

### 8. Better Settings Management
Settings page needs:
- Validation before saving
- Test connection buttons
- API key masking (show `sk-***123`)
- Save confirmation feedback

### 9. Code Organization
```
src/
├── actions/           # Server actions (you have some)
├── components/
│   ├── ui/           # Base shadcn components
│   ├── longbox/      # Feature components
│   └── layout/       # NEW: Header, Sidebar, Footer
├── lib/
│   ├── data/         # NEW: Data access layer
│   ├── utils/        # Utilities
│   └── hooks/        # NEW: Custom React hooks
├── services/         # NEW: External API clients
└── types/            # Shared TypeScript types
```

### 10. Performance Optimization
```typescript
// Add React Compiler (you have it in devDeps but not configured)
// next.config.ts
experimental: {
  reactCompiler: true
}

// Add image optimization
import Image from 'next/image'
<Image src={cover} width={300} height={450} alt={title} />

// Add database indexes
await db.execute(sql`CREATE INDEX idx_books_series ON books(series_id)`)
```

---

## 📋 Priority Roadmap

### High Priority (Do First) ✅
1. Extract duplicate logic into utility functions
2. Fix hardcoded "0% Complete" with real reading progress
3. Add loading states to all async operations
4. Implement proper error toasts
5. Generate actual cover thumbnails from comics

### Medium Priority
1. Create consistent card components
2. Add mobile responsive sidebar
3. Standardize hero header heights
4. Add empty states everywhere
5. Environment variable validation

### Low Priority (Nice to Have)
1. WebSocket scanner updates
2. Advanced search filters
3. User authentication
4. Multiple user profiles
5. Export/import library data

---

## 🚀 Quick Wins You Can Do Today

1. **Add Sonner toasts** (15 min)
2. **Create comic title cleaner utility** (20 min)
3. **Fix mobile sidebar** (30 min)
4. **Add loading.tsx files** (30 min)
5. **Standardize card components** (1 hour)

---

## Progress Tracking

- [ ] High Priority Item 1: Extract duplicate logic into utility functions
- [ ] High Priority Item 2: Fix hardcoded "0% Complete" with real reading progress
- [ ] High Priority Item 3: Add loading states to all async operations
- [ ] High Priority Item 4: Implement proper error toasts
- [ ] High Priority Item 5: Generate actual cover thumbnails from comics

---

**Last Updated**: 2026-01-20
**Version**: 1.0
