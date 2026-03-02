# Magnetik Visual Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current blue glassmorphism dark theme with a sharp-cornered, Deep Slate + Mint Frost design system inspired by Magnetik brand guidelines.

**Architecture:** Theme-first cascade. Step 1 rewrites `globals.css` so every shadcn/ui component inherits the new palette. Steps 2-8 update individual components to remove glassmorphism, sharpen corners, and align with the new design tokens. Reference: `/design-preview.html`.

**Tech Stack:** Tailwind CSS 4, shadcn/ui CSS custom properties, Next.js App Router

---

### Task 1: Rewrite CSS Theme Foundation

**Files:**
- Modify: `src/app/globals.css`

**Step 1: Replace the dark theme CSS custom properties**

Replace the entire `.dark { ... }` block with the Magnetik palette. This is the single highest-impact change — every shadcn/ui component reads these variables.

```css
.dark {
  /* Deep Slate backgrounds */
  --background: oklch(0.17 0.015 220);       /* #1a2228 */
  --foreground: oklch(0.98 0 0);              /* #fafafa */
  --card: oklch(0.20 0.015 220);              /* #212b33 */
  --card-foreground: oklch(0.98 0 0);         /* #fafafa */
  --popover: oklch(0.18 0.015 220);           /* #1e2830 */
  --popover-foreground: oklch(0.98 0 0);      /* #fafafa */

  /* Mint Frost accent as primary */
  --primary: oklch(0.88 0.05 145);            /* #d1e6d2 */
  --primary-foreground: oklch(0.17 0.015 220); /* #1a2228 */

  /* Deep Slate surfaces */
  --secondary: oklch(0.23 0.015 220);         /* #2a3640 */
  --secondary-foreground: oklch(0.78 0.03 215); /* #a6bac8 */
  --muted: oklch(0.23 0.015 220);             /* #2a3640 */
  --muted-foreground: oklch(0.55 0.02 215);   /* #6b8292 */
  --accent: oklch(0.27 0.015 220);            /* #334049 */
  --accent-foreground: oklch(0.88 0.05 145);  /* #d1e6d2 */

  --destructive: oklch(0.63 0.2 25);          /* #e5484d */
  --border: oklch(0.55 0.03 215 / 12%);       /* rgba(166,186,200,0.12) */
  --input: oklch(0.55 0.03 215 / 15%);
  --ring: oklch(0.88 0.05 145);               /* #d1e6d2 - Mint Frost */

  /* Charts */
  --chart-1: oklch(0.88 0.05 145);            /* Mint Frost */
  --chart-2: oklch(0.78 0.03 215);            /* Serene Blue */
  --chart-3: oklch(0.75 0.15 85);             /* Warning yellow */
  --chart-4: oklch(0.63 0.2 25);              /* Destructive red */
  --chart-5: oklch(0.75 0.15 160);            /* Success green */

  /* Sidebar */
  --sidebar: oklch(0.14 0.015 220);           /* #151b20 */
  --sidebar-foreground: oklch(0.78 0.03 215); /* #a6bac8 */
  --sidebar-primary: oklch(0.88 0.05 145);    /* #d1e6d2 */
  --sidebar-primary-foreground: oklch(0.17 0.015 220);
  --sidebar-accent: oklch(0.23 0.015 220);
  --sidebar-accent-foreground: oklch(0.88 0.05 145);
  --sidebar-border: oklch(0.55 0.03 215 / 10%);
  --sidebar-ring: oklch(0.88 0.05 145);
}
```

**Step 2: Update the radius variable**

In the `:root` block, change:
```css
--radius: 0.25rem; /* Was 0.625rem — sharp corners */
```

**Step 3: Verify the dev server picks up changes**

Refresh `http://localhost:3000/login` — colors should have shifted across all shadcn/ui components (buttons, inputs, labels, dialogs).

**Step 4: Commit**

```bash
git add src/app/globals.css
git commit -m "feat: apply Magnetik Deep Slate + Mint Frost theme foundation"
```

---

### Task 2: Auth Pages (Login, Signup, Layout)

**Files:**
- Modify: `src/app/(auth)/layout.tsx`
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/login/login-form.tsx`
- Modify: `src/app/(auth)/signup/page.tsx`

**Changes needed:**

**layout.tsx** — Replace `bg-zinc-950` with `bg-background`:
```tsx
<div className="min-h-screen flex items-center justify-center bg-background p-4">
```

**login/page.tsx** + **login-form.tsx** — Replace all hardcoded colors:
- `bg-blue-600 rounded-2xl` → `bg-primary rounded` (logo icon)
- `text-white` on headings → `text-foreground`
- `text-zinc-400` → `text-muted-foreground`
- `bg-red-500/10 border-red-500/20 text-red-400 rounded-lg` → `bg-destructive/10 border-destructive/20 text-destructive rounded`
- `bg-zinc-900 border-zinc-800` on inputs → `bg-secondary border-border`
- `text-zinc-500` on icons → `text-muted-foreground`
- `bg-blue-600 hover:bg-blue-700` on submit → remove (use default Button primary)
- `border-zinc-800` divider → `border-border`
- `bg-zinc-950` in divider span → `bg-background`
- `bg-zinc-900 border-zinc-800 hover:bg-zinc-800` on OAuth → `bg-secondary border-border hover:bg-accent`
- `text-blue-400 hover:text-blue-300` link → `text-primary hover:text-primary/80`

**signup/page.tsx** — Same pattern as login-form. All `bg-blue-600` → default primary, all `bg-zinc-900 border-zinc-800` → `bg-secondary border-border`, all `text-blue-400` → `text-primary`, all `rounded-2xl` → `rounded`.

**Step: Commit**
```bash
git add src/app/\(auth\)/
git commit -m "feat: apply Magnetik theme to auth pages"
```

---

### Task 3: Sidebar + Mobile Sidebar + Header

**Files:**
- Modify: `src/components/longbox/sidebar.tsx`
- Modify: `src/components/longbox/mobile-sidebar.tsx`
- Modify: `src/components/longbox/global-header.tsx`
- Modify: `src/components/longbox/header-user-menu.tsx`
- Modify: `src/components/longbox/user-menu.tsx`
- Modify: `src/components/longbox/user-avatar.tsx`

**sidebar.tsx changes:**
- `bg-slate-900/80` → `bg-sidebar` (remove transparency)
- `border-blue-500/10` → `border-sidebar-border`
- Remove `backdrop-blur-md` entirely
- Active link: `bg-blue-900/40 border-blue-500/20 text-blue-400` → `bg-primary/15 text-primary`
- Inactive link: `text-slate-400 hover:text-slate-100 hover:bg-blue-900/20` → `text-muted-foreground hover:text-foreground hover:bg-accent/50`
- `rounded-lg` on nav items → `rounded`
- Bottom divider: `border-blue-500/10` → `border-sidebar-border`

**mobile-sidebar.tsx changes:**
- Overlay: `bg-black/50 backdrop-blur-sm` → `bg-black/50` (remove blur)
- Active link: `bg-primary/10 text-primary` → already good, keep
- `rounded-md` → `rounded`

**header-user-menu.tsx + user-menu.tsx changes:**
- `bg-slate-800` skeleton → `bg-muted`
- `bg-slate-900 border-slate-800` popovers → `bg-popover border-border`
- `text-slate-300 hover:bg-slate-800 hover:text-white` → `text-muted-foreground hover:bg-accent hover:text-foreground`
- `text-red-400 hover:bg-red-500/10` logout → `text-destructive hover:bg-destructive/10`
- `rounded-lg` → `rounded`
- `rounded-full` on avatar trigger → keep for circular avatar, but change `focus:ring-primary/50` → `focus:ring-ring/50`

**user-avatar.tsx changes:**
- `bg-zinc-800` → `bg-muted`
- `text-zinc-500` fallback → `text-muted-foreground`

**Step: Commit**
```bash
git add src/components/longbox/sidebar.tsx src/components/longbox/mobile-sidebar.tsx src/components/longbox/global-header.tsx src/components/longbox/header-user-menu.tsx src/components/longbox/user-menu.tsx src/components/longbox/user-avatar.tsx
git commit -m "feat: apply Magnetik theme to sidebar, header, user menus"
```

---

### Task 4: Card Components (Series, Issue, Grid, Character)

**Files:**
- Modify: `src/components/longbox/series-grid-card.tsx`
- Modify: `src/components/longbox/issue-grid-card.tsx`
- Modify: `src/components/longbox/grid-card.tsx`
- Modify: `src/components/longbox/character-card.tsx`
- Modify: `src/components/longbox/series-card.tsx`

**Pattern for ALL card files — replace glassmorphism with solid surfaces:**
- `bg-zinc-900/20 backdrop-blur-md rounded-xl border border-white/5` → `bg-card rounded border border-border`
- `group-hover:border-white/20 group-hover:brightness-110` → `group-hover:border-border/60`
- Badge: `rounded-full border border-white/10 bg-black/50 backdrop-blur-sm` → `rounded bg-background/85 border border-border`
- Title hover: `group-hover:text-blue-500` → `group-hover:text-primary`
- `text-zinc-100` → `text-foreground`
- `text-zinc-400` / `text-zinc-300` → `text-muted-foreground`

**grid-card.tsx specifics:**
- `bg-zinc-900 rounded-lg border border-zinc-800` → `bg-card rounded border border-border`
- `shadow-sm group-hover:shadow-blue-900/20 group-hover:border-blue-500/50` → `group-hover:border-primary/30`
- `bg-black/80 backdrop-blur text-white border border-white/10` badge → `bg-background/85 text-foreground border border-border rounded`
- `group-hover:text-blue-400` → `group-hover:text-primary`

**character-card.tsx specifics:**
- Same glassmorphism removal as above
- `bg-yellow-500/20 border-yellow-500/30 text-yellow-400` favorite badge → `bg-primary/15 border-primary/30 text-primary`
- Power badge: same removal of `backdrop-blur-sm`

**Step: Commit**
```bash
git add src/components/longbox/series-grid-card.tsx src/components/longbox/issue-grid-card.tsx src/components/longbox/grid-card.tsx src/components/longbox/character-card.tsx src/components/longbox/series-card.tsx
git commit -m "feat: apply Magnetik theme to card components — remove glassmorphism, sharpen corners"
```

---

### Task 5: Hero Header + Stats + Library Sections

**Files:**
- Modify: `src/components/longbox/hero-header.tsx`
- Modify: `src/components/longbox/stats-overview.tsx`
- Modify: `src/components/longbox/library-client.tsx`
- Modify: `src/components/longbox/library-nav.tsx`
- Modify: `src/components/longbox/continue-reading.tsx`
- Modify: `src/components/longbox/recently-added.tsx`
- Modify: `src/components/longbox/empty-state.tsx`

**hero-header.tsx changes:**
- `blur-2xl opacity-40` backdrop → keep but reduce to `blur-xl opacity-25` for subtlety
- `bg-gradient-to-t from-black via-black/50 to-transparent` → `bg-gradient-to-t from-background via-background/50 to-transparent`
- `rounded-lg shadow-2xl border border-white/10` cover → `rounded border border-border shadow-lg`
- Title: keep `font-black tracking-tight`

**stats-overview.tsx changes:**
- `border border-border rounded-xl p-4` → `border border-border rounded p-4`
- Icon colors `text-blue-500, text-green-500, text-yellow-500, text-emerald-500` → `text-primary, text-primary/70, text-primary/50, text-primary/90` (monochrome Mint Frost variations)

**library-client.tsx changes:**
- `bg-zinc-900 rounded` code blocks → `bg-secondary rounded`
- `border-zinc-800` dividers → `border-border`
- `text-zinc-600, text-zinc-400, text-zinc-500` → `text-muted-foreground`

**library-nav.tsx changes:**
- `bg-zinc-900 rounded-lg p-1` toggle → `bg-secondary rounded p-1`
- `bg-zinc-800 text-white` active toggle → `bg-accent text-foreground`
- `text-zinc-400 hover:text-white` inactive → `text-muted-foreground hover:text-foreground`
- `text-blue-400` / `text-green-400` icons → `text-primary` / `text-primary/70`
- `bg-blue-600 text-white` active filter → `bg-primary text-primary-foreground`
- `bg-zinc-900 text-zinc-400 hover:bg-zinc-800 hover:text-white` filter → `bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground`
- `rounded-lg` everywhere → `rounded`

**continue-reading.tsx + recently-added.tsx:**
- `hover:bg-accent/50` → keep (uses theme accent)
- `bg-muted` thumbnails → keep
- `rounded` → keep

**empty-state.tsx:**
- `text-zinc-600` → `text-muted-foreground/50`
- `text-zinc-400` → `text-muted-foreground`
- `text-zinc-500` → `text-muted-foreground/70`

**Step: Commit**
```bash
git add src/components/longbox/hero-header.tsx src/components/longbox/stats-overview.tsx src/components/longbox/library-client.tsx src/components/longbox/library-nav.tsx src/components/longbox/continue-reading.tsx src/components/longbox/recently-added.tsx src/components/longbox/empty-state.tsx
git commit -m "feat: apply Magnetik theme to hero, stats, library sections"
```

---

### Task 6: Search, Discovery, Scanner, Filters

**Files:**
- Modify: `src/components/longbox/smart-search.tsx`
- Modify: `src/components/longbox/discovery-search.tsx`
- Modify: `src/components/longbox/search-filters.tsx`
- Modify: `src/components/longbox/scanner-progress.tsx`
- Modify: `src/app/(dashboard)/search/page.tsx`
- Modify: `src/app/(dashboard)/search/search-client.tsx`
- Modify: `src/app/(dashboard)/discovery/page.tsx`

**smart-search.tsx changes:**
- `rounded-xl border border-blue-500/20 bg-slate-900/40 backdrop-blur-sm` → `rounded border border-border bg-secondary`
- `focus-within:bg-blue-900/30 focus-within:border-blue-500/30` → `focus-within:bg-accent focus-within:border-primary/30`
- `text-slate-500` icon → `text-muted-foreground`
- `rounded-md` dropdown → `rounded`

**search-client.tsx changes:**
- All glassmorphism cards: `bg-zinc-900/20 backdrop-blur-md rounded-xl border border-white/5` → `bg-card rounded border border-border`
- `group-hover:border-white/20` → `group-hover:border-border/60`
- `rounded-full border border-white/10 bg-zinc-900/60 backdrop-blur-md` badge → `rounded bg-background/85 border border-border`
- `text-zinc-100 group-hover:text-blue-500` → `text-foreground group-hover:text-primary`
- `border-white/10 border-dashed rounded-xl bg-zinc-900/20 backdrop-blur-md` empty → `border-border border-dashed rounded bg-card`

**discovery/page.tsx changes:**
- `text-blue-500` sparkle icon → `text-primary`
- `rounded-xl` on search/dropdown → `rounded`
- `bg-black/70 backdrop-blur-sm rounded-full` badge → `bg-background/85 rounded border border-border`
- `shadow-2xl` on dropdown → `shadow-lg`

**search-filters.tsx changes:**
- `bg-zinc-900/50 border border-zinc-800 rounded-xl` → `bg-card border border-border rounded`
- `bg-black/50 border border-zinc-700 rounded-lg` input → `bg-secondary border border-border rounded`
- `focus:border-blue-500` → `focus:border-primary`
- `border-zinc-800` → `border-border`

**scanner-progress.tsx changes:**
- `bg-zinc-900/50 border border-zinc-800 rounded-xl` → `bg-card border border-border rounded`
- `text-blue-500 animate-spin` → `text-primary animate-spin`
- `bg-green-500/10 border-green-500/20 rounded-lg` → keep semantic colors but `rounded-lg` → `rounded`
- Same for yellow and red stat boxes

**search/page.tsx:**
- `border-zinc-800` → `border-border`
- `text-blue-400` highlight → `text-primary`

**Step: Commit**
```bash
git add src/components/longbox/smart-search.tsx src/components/longbox/discovery-search.tsx src/components/longbox/search-filters.tsx src/components/longbox/scanner-progress.tsx src/app/\(dashboard\)/search/ src/app/\(dashboard\)/discovery/
git commit -m "feat: apply Magnetik theme to search, discovery, scanner"
```

---

### Task 7: Detail Pages + Dialogs + Review

**Files:**
- Modify: `src/app/(dashboard)/library/[seriesId]/page.tsx`
- Modify: `src/app/(dashboard)/library/[seriesId]/issue/[issueId]/page.tsx`
- Modify: `src/app/(dashboard)/series/[id]/page.tsx`
- Modify: `src/app/(dashboard)/review/buttons.tsx`
- Modify: `src/components/longbox/match-dialog.tsx`
- Modify: `src/components/longbox/import-matcher.tsx`
- Modify: `src/components/longbox/collection-picker.tsx`
- Modify: `src/components/longbox/review-queue-section.tsx`
- Modify: `src/components/longbox/unmatched-series-section.tsx`

**series detail page changes:**
- `rounded-lg` cover → `rounded`
- `text-amber-500` / `text-green-500` stat icons → keep semantic colors
- `bg-black/60 group-hover:opacity-100` overlay → `bg-background/60`
- `bg-black/70 backdrop-blur-sm rounded` badge → `bg-background/85 rounded`

**issue detail page changes:**
- `bg-gradient-to-b from-zinc-900 to-black` → `bg-gradient-to-b from-card to-background`
- `blur-3xl opacity-15` backdrop → keep
- `bg-gradient-to-b from-transparent via-zinc-900/70 to-zinc-900` → `from-transparent via-card/70 to-card`
- `rounded-lg shadow-2xl border border-white/10` cover → `rounded shadow-lg border border-border`
- `text-amber-500` → `text-primary` (series link)
- `text-zinc-400` → `text-muted-foreground`
- `bg-blue-500 rounded-full` progress → `bg-primary rounded-full`
- `bg-zinc-900/50 rounded-lg border border-zinc-800` info cards → `bg-card rounded border border-border`

**review/buttons.tsx:**
- `text-red-500 hover:bg-red-500/10` → keep (semantic)
- `bg-white text-black rounded` approve → `bg-primary text-primary-foreground rounded`

**match-dialog.tsx:**
- `text-yellow-500 hover:text-yellow-400` → `text-primary hover:text-primary/80`
- `hover:bg-accent/50` results → keep
- `rounded-sm` thumbnails → `rounded`

**collection-picker.tsx:**
- `bg-black/60` overlay → `bg-black/50`
- `bg-zinc-900 rounded-2xl border-zinc-800` dialog → `bg-popover rounded border-border`
- `bg-zinc-800 border-zinc-700` input → `bg-secondary border-border`
- `bg-blue-600 hover:bg-blue-700` create btn → `bg-primary hover:bg-primary/90 text-primary-foreground`
- `hover:bg-zinc-800` item hover → `hover:bg-accent`
- `rounded-2xl` → `rounded`

**review-queue-section.tsx + unmatched-series-section.tsx:**
- `bg-zinc-900/50 border-zinc-800 rounded-xl` → `bg-card border-border rounded`
- `text-green-500` icons → keep semantic
- `bg-blue-900/30 text-blue-400 border-blue-500/20 rounded` badge → `bg-primary/15 text-primary border-primary/20 rounded`
- `bg-red-900/20 text-red-400 border-red-500/20 rounded-lg` → keep semantic, `rounded-lg` → `rounded`
- `bg-green-600 text-white hover:bg-green-500` approve → `bg-primary text-primary-foreground hover:bg-primary/90`
- `bg-blue-900/10 border-blue-500/20 rounded-xl` info → `bg-primary/10 border-primary/20 rounded`

**Step: Commit**
```bash
git add src/app/\(dashboard\)/library/ src/app/\(dashboard\)/series/ src/app/\(dashboard\)/review/ src/components/longbox/match-dialog.tsx src/components/longbox/import-matcher.tsx src/components/longbox/collection-picker.tsx src/components/longbox/review-queue-section.tsx src/components/longbox/unmatched-series-section.tsx
git commit -m "feat: apply Magnetik theme to detail pages, dialogs, review"
```

---

### Task 8: Buttons, Badges, Settings, Remaining Components

**Files:**
- Modify: `src/components/longbox/request-button.tsx`
- Modify: `src/components/longbox/sync-issues-button.tsx`
- Modify: `src/components/longbox/import-button.tsx`
- Modify: `src/components/longbox/mark-as-read-button.tsx`
- Modify: `src/components/longbox/favorite-series-button.tsx`
- Modify: `src/components/longbox/favorite-characters.tsx`
- Modify: `src/components/longbox/reading-progress-badge.tsx`
- Modify: `src/components/longbox/series-options-menu.tsx`
- Modify: `src/components/longbox/issue-options-menu.tsx`
- Modify: `src/components/longbox/share-button.tsx`
- Modify: `src/components/longbox/needs-attention.tsx`
- Modify: `src/app/(dashboard)/settings/page.tsx`
- Modify: `src/app/(dashboard)/page.tsx`

**Semantic color buttons** — keep functional colors but align with theme:

**request-button.tsx:**
- `text-green-500` → keep
- `text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-500` → `bg-yellow-500/10 text-yellow-500` (dark-only simplification)

**mark-as-read-button.tsx:**
- `rounded-full` → keep (it's a circular icon button)
- `bg-green-500/20 text-green-500` → keep
- `bg-zinc-800 hover:bg-zinc-700 text-zinc-500` → `bg-muted hover:bg-accent text-muted-foreground`

**favorite-series-button.tsx:**
- `text-red-500 hover:text-red-400` → keep (semantic for favorites)
- `text-zinc-500 hover:text-red-500` → `text-muted-foreground hover:text-red-500`

**favorite-characters.tsx:**
- `text-yellow-400` star → keep (semantic)
- `border-yellow-500/30 group-hover:border-yellow-500` → `border-primary/30 group-hover:border-primary`
- `bg-yellow-500/20 border-yellow-500/30` badge → `bg-primary/15 border-primary/30`
- `text-zinc-300 group-hover:text-yellow-400` name → `text-foreground group-hover:text-primary`
- `border-dashed border-zinc-700` add button → `border-dashed border-border`
- `rounded-full` → keep (circular character avatars)

**reading-progress-badge.tsx:**
- `text-green-500` completed → keep
- `text-zinc-500` not started → `text-muted-foreground`
- `text-blue-500` in progress → `text-primary`
- `text-zinc-600` page count → `text-muted-foreground/70`

**Options menus (series-options-menu, issue-options-menu, share-button):**
- `rounded-full border-zinc-700 text-zinc-400 hover:text-white hover:border-zinc-500` trigger → `rounded border-border text-muted-foreground hover:text-foreground hover:border-border/60`
- `bg-zinc-900 border-zinc-800` popover → `bg-popover border-border`
- `text-zinc-300 hover:bg-zinc-800 hover:text-white rounded` item → `text-popover-foreground hover:bg-accent hover:text-foreground rounded`
- `text-green-500` success → keep

**needs-attention.tsx:**
- `bg-yellow-500/10 border-yellow-500/20` → keep semantic
- `bg-blue-500/10 border-blue-500/20` → `bg-primary/10 border-primary/20`
- `bg-muted/30` → keep
- `text-yellow-500` → keep
- `text-blue-500` → `text-primary`
- `rounded-lg` → `rounded`

**settings/page.tsx — major glassmorphism removal:**
- `border border-white/5 bg-zinc-900/20 backdrop-blur-md p-6` → `border border-border bg-card p-6`
- `rounded-full border border-white/10 bg-zinc-900/60 backdrop-blur-md` → `rounded bg-secondary border border-border`
- `bg-zinc-900/60 backdrop-blur-md border border-white/10 rounded-lg` code blocks → `bg-secondary border border-border rounded`
- `bg-zinc-900/60 border border-white/10 rounded-lg` inputs → `bg-secondary border border-border rounded`
- `focus:border-blue-500` → `focus:border-primary`
- `bg-blue-600 text-white` active button → `bg-primary text-primary-foreground`
- `bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700` inactive → `bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent`
- All `rounded-xl` → `rounded`

**dashboard page.tsx:**
- `bg-muted rounded-lg animate-pulse` skeletons → `bg-muted rounded animate-pulse`

**Step: Commit**
```bash
git add src/components/longbox/request-button.tsx src/components/longbox/sync-issues-button.tsx src/components/longbox/import-button.tsx src/components/longbox/mark-as-read-button.tsx src/components/longbox/favorite-series-button.tsx src/components/longbox/favorite-characters.tsx src/components/longbox/reading-progress-badge.tsx src/components/longbox/series-options-menu.tsx src/components/longbox/issue-options-menu.tsx src/components/longbox/share-button.tsx src/components/longbox/needs-attention.tsx src/app/\(dashboard\)/settings/page.tsx src/app/\(dashboard\)/page.tsx
git commit -m "feat: apply Magnetik theme to buttons, badges, settings, remaining components"
```

---

### Task 9: Visual QA Pass

**Step 1: Navigate every main route in the browser and check for:**
- Any remaining `blue-500/400/600` accent colors that should be `primary` (Mint Frost)
- Any remaining `rounded-xl` or `rounded-2xl` that should be `rounded`
- Any remaining `backdrop-blur` that should be removed
- Any remaining `bg-zinc-900/20` or `bg-slate-900/80` transparent backgrounds
- Any hardcoded `white/5`, `white/10`, `black/50` borders that should use `border-border`

**Routes to check:**
1. `/login`
2. `/signup`
3. `/` (dashboard)
4. `/library`
5. `/library/[any-series-id]`
6. `/library/[series]/issue/[issue]`
7. `/search`
8. `/discovery`
9. `/settings`

**Step 2: Fix any remaining inconsistencies found**

**Step 3: Commit**
```bash
git add -A
git commit -m "fix: visual QA — clean up remaining old theme references"
```

---

### Task 10: Cleanup

**Step 1:** Remove `/design-preview.html` from middleware allowlist in `src/middleware.ts` (remove `'/design-preview.html'` from `alwaysAccessible` array and revert the matcher regex).

**Step 2:** Optionally delete `public/design-preview.html` or keep as reference.

**Step 3: Final commit**
```bash
git add src/middleware.ts
git commit -m "chore: clean up design preview middleware bypass"
```
