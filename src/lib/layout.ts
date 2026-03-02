/**
 * Standardized layout constants for consistent UI across the application
 */

// Page-level layout classes
export const PAGE_LAYOUT = {
  // Main page padding - all pages use p-8
  padding: 'p-8',
  // Default vertical spacing between sections
  spacing: 'space-y-6',
  // Page max width constraint (used on settings/series detail pages)
  maxWidth: 'max-w-7xl mx-auto',
} as const;

// Grid layout presets for different card types
export const GRID_LAYOUTS = {
  // For series cards on browse/library pages (6 columns max)
  series: 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6',
  // For issue cards within a series (5 columns max - slightly smaller)
  issues: 'grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6',
  // For search results (6 columns max but starts denser)
  search: 'grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4',
} as const;

// Card styles
export const CARD_STYLES = {
  // Standard card container
  container: 'bg-card border border-border rounded',
  // Card hover effect
  hover: 'hover:border-border transition-colors',
  // Card padding
  padding: 'p-6',
} as const;

// Section styles
export const SECTION_STYLES = {
  // Section header
  header: 'flex items-center justify-between mb-4',
  // Section title
  title: 'text-xl font-bold tracking-tight',
  // Section subtitle
  subtitle: 'text-sm text-muted-foreground',
} as const;

// Combined utility for consistent page wrapper
export function getPageClasses(includeMaxWidth = false) {
  const base = `${PAGE_LAYOUT.padding} ${PAGE_LAYOUT.spacing}`;
  return includeMaxWidth ? `${base} ${PAGE_LAYOUT.maxWidth}` : base;
}
