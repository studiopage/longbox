import path from 'path';

// =====================
// Filename Parser
// =====================
// Extracts series name, issue number, and year from comic filenames.
// Handles common naming conventions used by comic downloaders and organizers.

export interface FilenameParseResult {
  seriesName: string | null;
  issueNumber: string | null;
  year: number | null;
}

/**
 * Tags commonly appended in parentheses or brackets that should be stripped.
 * These are release-group and format tags, NOT meaningful metadata.
 */
const NOISE_TAGS = new Set([
  'digital',
  'digital-empire',
  'zone-empire',
  'minutemen-midas',
  'minutemen-slayer',
  'minutemen-scans',
  'minutemen-lusiphur',
  'minutemen-phillydub',
  'c2c',
  'noads',
  'f',
  'filled',
  'repack',
  'hd',
  'sd',
  'webrip',
  'scan',
  'rescan',
  'fixed',
  'proper',
  'remastered',
  'hybrid',
  'get-comics.info',
  'getcomics.info',
  'getcomics',
  'ettv',
  'mag',
  'oshot',
  'os',
  'mu',
  'anon',
]);

/**
 * Normalize a series name for comparison purposes.
 * Lowercases, removes punctuation except hyphens, collapses whitespace.
 */
export function normalizeSeriesName(name: string): string {
  return name
    .toLowerCase()
    // Remove possessive 's
    .replace(/'s\b/g, 's')
    // Remove all punctuation except hyphens
    .replace(/[^\w\s-]/g, '')
    // Collapse multiple whitespace/hyphens into single space
    .replace(/[\s-]+/g, ' ')
    .trim();
}

/**
 * Parse a comic filename into its components: series name, issue number, year.
 *
 * Handles patterns like:
 * - "Batman (2016) 001 (2024).cbz" -> series="Batman (2016)", number="001"
 * - "Amazing Spider-Man #5.cbz" -> series="Amazing Spider-Man", number="5"
 * - "Saga 054 (2018) (Digital) (Zone-Empire).cbr" -> series="Saga", number="054"
 * - "Series Name v2 012.cbz" -> series="Series Name", number="012"
 * - "Series Name 03 (of 04).cbr" -> series="Series Name", number="03"
 * - "The Walking Dead 100 (2012).cbz" -> series="The Walking Dead", number="100"
 */
export function parseFilename(fileName: string): FilenameParseResult {
  // Step 1: Remove file extension
  const ext = path.extname(fileName);
  let base = ext ? fileName.slice(0, -ext.length) : fileName;

  // Step 2: Extract parenthetical/bracket groups and classify them
  let seriesYear: number | null = null;
  let standaloneYear: number | null = null;
  const yearParens: Array<{ match: string; year: number; index: number }> = [];

  // Extract all parenthetical groups: (content) and [content]
  const parenGroups: Array<{ match: string; content: string; index: number }> = [];
  const parenRegex = /(\(([^)]+)\)|\[([^\]]+)\])/g;
  let m: RegExpExecArray | null;
  while ((m = parenRegex.exec(base)) !== null) {
    const content = (m[2] || m[3]).trim();
    parenGroups.push({ match: m[0], content, index: m.index });
  }

  // Classify each group
  const groupsToRemove: string[] = [];
  for (const group of parenGroups) {
    const contentLower = group.content.toLowerCase().replace(/[\s-]+/g, '-');

    // Check if it's a noise tag
    if (NOISE_TAGS.has(contentLower)) {
      groupsToRemove.push(group.match);
      continue;
    }

    // Check if it's a year
    const yearMatch = group.content.match(/^(\d{4})$/);
    if (yearMatch) {
      const yr = parseInt(yearMatch[1], 10);
      if (yr >= 1900 && yr <= 2099) {
        yearParens.push({ match: group.match, year: yr, index: group.index });
        continue;
      }
    }

    // Check if it's an "of N" pattern — keep it for now (extracted later)
    if (/^of\s+\d+$/i.test(group.content)) {
      continue;
    }

    // Everything else is noise (release groups, scan info, etc.)
    groupsToRemove.push(group.match);
  }

  // Handle year parentheticals:
  // First year paren near the start is likely the series year (e.g., "Batman (2016)")
  // Last year paren is likely the issue/release year
  if (yearParens.length === 1) {
    // Single year — could be series year or release year
    // Check if this year is positioned right after what looks like a series name
    // (i.e., only text before it, no numbers that look like issue numbers)
    standaloneYear = yearParens[0].year;

    const textBefore = base.slice(0, yearParens[0].index).trim();
    const hasIssueNumBefore = /\d{1,3}\s*$/.test(textBefore);

    if (hasIssueNumBefore) {
      // Year comes after an issue number — it's a release year, strip it
      groupsToRemove.push(yearParens[0].match);
    } else {
      // Year is part of the series designation (e.g., "Batman (2016) 001")
      // Keep it in the string — we'll preserve it in the series name
      seriesYear = yearParens[0].year;
    }
  } else if (yearParens.length >= 2) {
    // First year is series year, last year is release year
    seriesYear = yearParens[0].year;
    // Remove all year parens except the first (series year)
    for (let i = 1; i < yearParens.length; i++) {
      groupsToRemove.push(yearParens[i].match);
      if (!standaloneYear) standaloneYear = yearParens[i].year;
    }
  }

  // Remove noise groups from the string
  for (const group of groupsToRemove) {
    base = base.replace(group, ' ');
  }

  // Clean up extra whitespace
  base = base.replace(/\s+/g, ' ').trim();

  // Step 3: Extract issue number using priority order
  let issueNumber: string | null = null;
  let issueEndIndex: number = -1;

  // Priority 1: N (of M) pattern — "03 (of 04)"
  const ofPattern = /\b(\d{1,4})\s*\(of\s+\d+\)/i;
  const ofMatch = base.match(ofPattern);
  if (ofMatch && ofMatch.index !== undefined) {
    issueNumber = ofMatch[1];
    issueEndIndex = ofMatch.index;
    // Remove the entire "N (of M)" from base for series extraction
    base = base.replace(ofPattern, ' ').trim();
  }

  // Priority 2: #N pattern — "#5", "# 05"
  if (!issueNumber) {
    const hashPattern = /#\s*(\d+(?:\.\d+)?)/;
    const hashMatch = base.match(hashPattern);
    if (hashMatch && hashMatch.index !== undefined) {
      issueNumber = hashMatch[1];
      issueEndIndex = hashMatch.index;
      // Remove from base
      base = base.replace(hashPattern, ' ').trim();
    }
  }

  // Priority 3: vN NNN pattern — "v2 012"
  if (!issueNumber) {
    const volIssuePattern = /\bv\d+\s+(\d{2,4})\b/i;
    const volMatch = base.match(volIssuePattern);
    if (volMatch && volMatch.index !== undefined) {
      issueNumber = volMatch[1];
      issueEndIndex = volMatch.index;
      // Remove the entire vN NNN from base
      base = base.replace(volIssuePattern, ' ').trim();
    }
  }

  // Priority 4: Last standalone number that isn't a year
  if (!issueNumber) {
    // Find all standalone numbers in the remaining string
    const numberPattern = /\b(\d{1,4})(?:\.\d+)?\b/g;
    const candidates: Array<{ value: string; index: number }> = [];
    let numMatch: RegExpExecArray | null;
    while ((numMatch = numberPattern.exec(base)) !== null) {
      const num = parseInt(numMatch[1], 10);
      // Skip year-like numbers (1900-2099) UNLESS they are a series year we kept
      const isYearInSeriesParen = seriesYear !== null && num === seriesYear;
      if (isYearInSeriesParen) continue;
      if (num >= 1900 && num <= 2099) continue;
      candidates.push({ value: numMatch[1], index: numMatch.index });
    }

    if (candidates.length > 0) {
      // Take the last non-year number
      const chosen = candidates[candidates.length - 1];
      issueNumber = chosen.value;
      issueEndIndex = chosen.index;
      // Remove this number from base for series extraction
      base = base.slice(0, chosen.index) + base.slice(chosen.index + chosen.value.length);
      base = base.trim();
    }
  }

  // Step 4: Extract series name — clean up what remains
  const seriesName = cleanSeriesName(base);

  // Determine the best year to return
  const resultYear = standaloneYear || seriesYear || null;

  return {
    seriesName: seriesName || null,
    issueNumber,
    year: resultYear,
  };
}

/**
 * Clean up a series name string: remove trailing volume indicators,
 * trailing hyphens/punctuation, and collapse whitespace.
 */
function cleanSeriesName(raw: string): string | null {
  const name = raw
    // Remove trailing "v" or "vol" that was part of a volume+issue pattern
    .replace(/\s+v(?:ol)?\.?\s*$/i, '')
    // Remove trailing hyphens and dots
    .replace(/[\s\-_.]+$/, '')
    // Remove leading hyphens and dots
    .replace(/^[\s\-_.]+/, '')
    // Collapse whitespace
    .replace(/\s+/g, ' ')
    .trim();

  // If nothing remains, return null
  return name.length > 0 ? name : null;
}
