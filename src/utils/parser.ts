/**
 * src/utils/parser.ts
 * Pure logic. No dependencies.
 */

export interface ParsedMeta {
  cleanTitle: string;
  year: string | null;
}

export const parseFilename = (filename: string): ParsedMeta => {
  // 1. Remove Extension
  let clean = filename.replace(/\.(cbz|cbr|pdf|epub)$/i, '');

  // 2. Extract Year (Standard: (2012) or 2012 surrounded by space)
  // Matches " (2012)" or " 2012 " or "2012" at end of string
  const yearMatch = clean.match(/\(?\b(19|20)\d{2}\b\)?/);
  const year = yearMatch ? yearMatch[0].replace(/[()]/g, '') : null;

  // 3. Remove Year from Title to avoid "Saga 2012" vs "Saga" mismatch
  if (year && yearMatch) {
    clean = clean.replace(yearMatch[0], '');
  }

  // 4. Aggressive Noise Stripping (The "Kapowarr" Regex Pattern)
  clean = clean
    .replace(/_/g, ' ')           // Underscores to spaces
    .replace(/\(Digital\)/gi, '') // Scene Tags
    .replace(/\(c2c\)/gi, '')
    .replace(/\[.*?\]/g, '')      // Remove [GroupNames]
    .replace(/\(.*?\)/g, '')      // Remove (Publishers/Other)
    .replace(/v\d+/gi, '')        // Remove v01
    .replace(/#\d+/g, '')         // Remove #001
    .replace(/T\d+/gi, '')        // Remove T01 (Tombe)
    .replace(/\s{2,}/g, ' ')      // Collapse double spaces
    .trim();

  return {
    cleanTitle: clean,
    year: year || null
  };
};


