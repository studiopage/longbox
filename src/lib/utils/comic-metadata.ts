/**
 * Comic Metadata Utilities
 *
 * Utilities for cleaning and parsing comic book metadata from filenames and metadata
 */

/**
 * Cleans a comic title by removing common filename artifacts
 *
 * Removes:
 * - Issue count indicators: (of 4), (of 12)
 * - Year indicators: (2025), (2024)
 * - Digital markers: (Digital), (Digital-HD)
 * - Publisher names: (Boom! Studios), (Marvel), (DC)
 * - Series type: (Limited Series)
 * - Uploader tags: (LeDuch), (c2c)
 * - File extensions: .cbz, .cbr
 *
 * @param title - The title to clean
 * @param filename - Optional filename to compare against (if title equals filename, clean more aggressively)
 * @returns Cleaned title string
 */
export function cleanComicTitle(title: string, filename?: string): string {
  // Check if title looks like a filename (has multiple parentheses with metadata)
  const looksLikeFilename = /\(.*?\).*\(.*?\)/.test(title) || title.includes('.cbz') || title.includes('.cbr');

  // If title is identical to the filename (excluding path), do aggressive cleaning
  const matchesFilename = filename
    ? (title === filename.split('/').pop() || title === filename.split('/').pop()?.replace(/\.cb[zr]$/i, ''))
    : false;

  const shouldCleanAggressively = looksLikeFilename || matchesFilename;

  let cleaned = title;

  if (shouldCleanAggressively) {
    // First, extract just the series name and issue number
    // Pattern: "Series Name 001 (metadata)(metadata)..." -> "Series Name 001"
    const mainTitleMatch = title.match(/^(.+?)\s+(\d{3})\s*\(/);
    if (mainTitleMatch) {
      cleaned = `${mainTitleMatch[1]} #${parseInt(mainTitleMatch[2], 10)}`;
    } else {
      // Fallback to aggressive cleaning of all metadata
      cleaned = cleaned
        .replace(/\(of \d+\)/gi, '')                    // Remove (of 4)
        .replace(/\(\d{4}\)/g, '')                       // Remove (2025)
        .replace(/\(Digital.*?\)/gi, '')                 // Remove (Digital-HD)
        .replace(/\(Limited Series\)/gi, '')             // Remove (Limited Series)
        .replace(/\(Boom! Studios\)/gi, '')              // Remove (Boom! Studios)
        .replace(/\(Marvel\)/gi, '')                     // Remove (Marvel)
        .replace(/\(DC\)/gi, '')                         // Remove (DC)
        .replace(/\(Image\)/gi, '')                      // Remove (Image)
        .replace(/\(Dark Horse\)/gi, '')                 // Remove (Dark Horse)
        .replace(/\(LeDuch\)/gi, '')                     // Remove (LeDuch)
        .replace(/\(c2c\)/gi, '')                        // Remove (c2c)
        .replace(/\(Webrip\)/gi, '')                     // Remove (Webrip)
        .replace(/\.cb[zr]/gi, '')                       // Remove .cbz/.cbr extension
        .replace(/\.zip/gi, '')                          // Remove .zip extension
        .replace(/\s+/g, ' ')                            // Collapse multiple spaces
        .trim();
    }
  } else {
    // Light cleaning for actual metadata titles
    cleaned = cleaned
      .replace(/\.cb[zr]/gi, '')                       // Remove file extensions
      .trim();
  }

  return cleaned;
}

/**
 * Parses issue number from a filename
 *
 * Supports formats:
 * - #001, #01, #1
 * - 001, 01, 1
 * - v1 #001
 * - Issue 001
 *
 * @param filename - The filename to parse
 * @returns Issue number as string or null if not found
 */
export function parseIssueNumber(filename: string): string | null {
  // Remove file extension
  const nameWithoutExt = filename.replace(/\.cb[zr]$/i, '');

  // Try various patterns
  const patterns = [
    /#(\d+)/,                    // #001
    /\bissue[_\s]+(\d+)/i,       // Issue 001
    /v\d+[_\s]+#?(\d+)/i,        // v1 #001 or v1 001
    /[_\s](\d{3,4})[_\s]/,       // _001_ or _0001_
    /[_\s](\d+)$/,               // Ends with _01
  ];

  for (const pattern of patterns) {
    const match = nameWithoutExt.match(pattern);
    if (match && match[1]) {
      // Remove leading zeros but keep the number as string
      return parseInt(match[1], 10).toString();
    }
  }

  return null;
}

/**
 * Formats a display title for an issue
 *
 * If the title is empty or just a number, returns "Issue #X"
 * Otherwise returns the cleaned title
 *
 * @param title - The issue title
 * @param issueNumber - The issue number
 * @param filename - Optional filename for aggressive cleaning
 * @returns Formatted display title
 */
export function formatIssueDisplayTitle(
  title: string | null,
  issueNumber: string | number | null,
  filename?: string | null
): string {
  const safeIssueNumber = issueNumber || '1';

  if (!title || title.trim() === '') {
    return `Issue #${safeIssueNumber}`;
  }

  const cleaned = cleanComicTitle(title, filename || undefined);

  // If after cleaning the title is empty or too short, use issue number
  if (cleaned.length < 3 || /^[\d\s]+$/.test(cleaned)) {
    return `Issue #${safeIssueNumber}`;
  }

  return cleaned;
}

/**
 * Extracts publisher name from filename or metadata
 *
 * @param text - Text to extract publisher from
 * @returns Publisher name or null
 */
export function extractPublisher(text: string): string | null {
  const publishers = [
    'Marvel',
    'DC Comics',
    'DC',
    'Image Comics',
    'Image',
    'Dark Horse',
    'IDW',
    'Boom! Studios',
    'Dynamite',
    'Valiant',
    'Vertigo',
    'AfterShock',
  ];

  for (const publisher of publishers) {
    const regex = new RegExp(`\\b${publisher}\\b`, 'i');
    if (regex.test(text)) {
      return publisher;
    }
  }

  return null;
}

/**
 * Normalizes series name for matching
 *
 * Removes special characters, extra spaces, and converts to lowercase
 * Useful for fuzzy matching between local files and ComicVine data
 *
 * @param name - Series name to normalize
 * @returns Normalized series name
 */
export function normalizeSeriesName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s]/g, '')   // Remove special chars
    .replace(/\s+/g, ' ')      // Collapse spaces
    .trim();
}
