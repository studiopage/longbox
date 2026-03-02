# Longbox Visual Redesign — Magnetik-Inspired

## Summary

Full visual overhaul of the Longbox comic library app. Replacing the current blue-tinted glassmorphism dark theme with a minimal, sharp-cornered Deep Slate design system inspired by the Magnetik brand guidelines.

**Approach:** Theme-first cascade — remap CSS custom properties in `globals.css` first so all shadcn/ui components shift automatically, then rework the 20-30 most visible component files.

## Design System

### Color Tokens

| Token | Value | Role |
|-------|-------|------|
| `--background` | `#1a2228` | Page base |
| `--card` / surface | `#212b33` | Cards, panels |
| `--popover` | `#1e2830` | Dropdowns, popovers |
| `--sidebar` | `#151b20` | Sidebar bg (darkest) |
| `--elevated` | `#293540` | Inputs, elevated surfaces |
| `--hover` | `#2e3b46` | Hover states |
| `--primary` (accent) | `#d1e6d2` | Mint Frost — buttons, active states, focus rings |
| `--primary-foreground` | `#1a2228` | Text on primary buttons |
| `--foreground` | `#fafafa` | Primary text (Pro White) |
| `--secondary-text` | `#a6bac8` | Secondary text (Serene Blue) |
| `--tertiary-text` | `#6b8292` | Tertiary text |
| `--muted-text` | `#4a6070` | Muted/disabled text |
| `--border` | `rgba(166,186,200,0.12)` | Subtle borders |
| `--destructive` | `#e5484d` | Errors, delete |
| `--warning` | `#e5a84d` | Wanted status |
| `--success` | `#4de5a0` | Downloaded/complete |

### Border Radius

Sharp corners throughout:
- `--radius-sm`: 2px (tags, badges)
- `--radius-md`: 3px (buttons, inputs, sidebar links)
- `--radius-lg`: 4px (cards, panels, tables)

No rounded pills. No `rounded-full` on UI containers.

### Typography

Font: Inter (already in use). No font change needed.

| Level | Size | Weight | Tracking | Usage |
|-------|------|--------|----------|-------|
| Display | 36px | 900 | -0.04em | Hero titles |
| Heading 1 | 28px | 700 | -0.03em | Page titles |
| Heading 2 | 20px | 700 | -0.02em | Section titles |
| Section label | 13px | 600 | +0.06em, uppercase | Section headers |
| Body | 14px | 400 | normal | Descriptions |
| Caption | 11px | 400 | normal | Metadata |

### Component Patterns

**Sidebar:** Solid bg (`#151b20`), no glassmorphism, no backdrop-blur. Active items use Mint Frost text + subtle Mint Frost bg. Section labels uppercase.

**Cards:** Sharp corners, `bg-surface` background, `border-muted` border. No glassmorphism. Hover: slight lift + border brightens. Badge in top-right with sharp radius.

**Hero header:** Gradient overlay on Deep Slate tones. No blur on backdrop. Large display type. Poster thumbnail with sharp corners.

**Stats cards:** Simple boxes, sharp corners, large numbers with uppercase labels.

**Buttons:**
- Primary: Mint Frost bg, dark text
- Secondary: Elevated bg, border, light text
- Ghost: Transparent, tertiary text
- Destructive: Red-tinted transparent bg

**Tags:** Sharp corners (2px radius), semantic colors (accent, success, warning, destructive, muted, blue).

**Tables:** Sharp wrapper, subtle row borders, uppercase header labels, hover row highlight.

**Empty states:** Centered, muted icon, secondary heading, muted description, primary button CTA.

**Inputs:** Elevated bg, muted border, Mint Frost focus ring.

### Effects Removed

- No `backdrop-blur-md` / glassmorphism on any surface
- No `rounded-xl` / `rounded-full` on containers
- No `bg-slate-900/80` transparent backgrounds
- No `shadow-2xl` cinematic shadows

### Effects Kept

- Subtle card hover lift (`translateY(-2px)`)
- Smooth transitions (150-200ms ease)
- Card hover border brightening

## Scope

**Files to modify (estimated 25-30):**

1. `src/app/globals.css` — CSS custom properties (theme foundation)
2. `src/app/layout.tsx` — Font config if needed
3. `src/app/(dashboard)/layout.tsx` — Layout structure
4. `src/components/longbox/sidebar.tsx` — Navigation
5. `src/components/longbox/mobile-sidebar.tsx` — Mobile nav
6. `src/components/longbox/global-header.tsx` — Top header
7. `src/components/longbox/series-grid-card.tsx` — Series cards
8. `src/components/longbox/issue-grid-card.tsx` — Issue cards
9. `src/components/longbox/grid-card.tsx` — Base card
10. `src/components/longbox/hero-header.tsx` — Hero banners
11. `src/components/longbox/empty-state.tsx` — Empty states
12. `src/components/longbox/library-client.tsx` — Library grid
13. `src/components/longbox/stats-overview.tsx` — Stats display
14. `src/components/longbox/continue-reading.tsx` — Reading section
15. `src/components/longbox/recently-added.tsx` — Recent section
16. `src/components/longbox/needs-attention.tsx` — Attention panel
17. `src/components/longbox/smart-search.tsx` — Search UI
18. `src/components/longbox/discovery-search.tsx` — Discovery search
19. `src/components/longbox/match-dialog.tsx` — Match dialog
20. `src/components/longbox/import-button.tsx` — Import UI
21. `src/components/longbox/import-matcher.tsx` — Import matcher
22. `src/components/longbox/request-button.tsx` — Request button
23. `src/components/longbox/sync-issues-button.tsx` — Sync button
24. `src/components/longbox/series-card.tsx` — Legacy series card
25. `src/components/longbox/library-nav.tsx` — Library navigation
26. `src/components/longbox/scanner-progress.tsx` — Scanner UI
27. `src/components/longbox/search-filters.tsx` — Search filters
28. `src/app/(dashboard)/page.tsx` — Dashboard page
29. `src/app/(dashboard)/library/page.tsx` — Library page
30. `src/app/(dashboard)/settings/page.tsx` — Settings page
31. `src/app/(auth)/login/page.tsx` — Login page
32. `src/app/(auth)/signup/page.tsx` — Signup page

## Reference

Live design preview: `/design-preview.html`
