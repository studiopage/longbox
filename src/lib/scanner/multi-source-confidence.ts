/**
 * Multi-Source Confidence Scoring
 * Phase 1: Boost confidence when multiple data sources agree on a match
 * 
 * Pattern: If both ComicVine and Metron suggest the same series,
 * boost confidence score by 10-15 points
 */

export interface ConfidenceBoost {
  sources: string[];
  boost: number; // percentage points to add
  reason: string;
}

/**
 * Calculate confidence boost based on multiple sources agreeing
 */
export function calculateMultiSourceBoost(
  baseSources: string[], // e.g., ['comicinfo', 'folder']
  cvMatch: boolean = false, // ComicVine volume found
  metronMatch: boolean = false // Metron issue found
): ConfidenceBoost | null {
  const agreingSources: string[] = [];
  let boost = 0;
  let reason = '';

  // Check for multi-API agreement
  if (cvMatch && metronMatch) {
    boost = 15;
    agreingSources.push('ComicVine', 'Metron');
    reason = 'Both ComicVine and Metron series match confirmed';
  } else if (cvMatch && baseSources.includes('filename')) {
    // CV matches AND filename parsing was reliable
    boost = 10;
    agreingSources.push('ComicVine', 'filename');
    reason = 'ComicVine match + filename parsing aligned';
  } else if (metronMatch && baseSources.includes('folder')) {
    // Metron matches AND folder name was reliable
    boost = 8;
    agreingSources.push('Metron', 'folder');
    reason = 'Metron match + folder name aligned';
  } else if (cvMatch || metronMatch) {
    // Single API match with ComicInfo metadata
    if (baseSources.includes('comicinfo')) {
      boost = 5;
      agreingSources.push(cvMatch ? 'ComicVine' : 'Metron', 'ComicInfo');
      reason = 'API match + ComicInfo metadata present';
    }
  }

  return boost > 0
    ? { sources: agreingSources, boost, reason }
    : null;
}

/**
 * Apply multi-source boost to confidence score
 * Clamps final score to 0-100 range
 */
export function applyMultiSourceBoost(
  baseScore: number,
  boost: ConfidenceBoost | null
): number {
  if (!boost) return baseScore;
  return Math.min(100, Math.max(0, baseScore + boost.boost));
}
