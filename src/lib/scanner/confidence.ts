import { normalizeSeriesName } from './filename-parser';
import type { ExtractedSignals } from './signals';
import { calculateMultiSourceBoost, applyMultiSourceBoost } from './multi-source-confidence';

// =====================
// Confidence Scorer
// =====================
// Scores how confident we are that a file belongs to a given candidate series.
// Each signal source contributes points; agreement between sources boosts score.

export type ConfidenceTier = 'high' | 'medium' | 'low';

export interface ConfidenceResult {
  score: number; // 0-100
  tier: ConfidenceTier;
  reasons: string[];
}

/**
 * Score the confidence that extracted signals match a candidate series name.
 *
 * Scoring breakdown:
 * - ComicInfo series matches candidate: +40
 * - Folder name matches candidate: +25
 * - Filename series matches candidate: +15
 * - Has publisher metadata: +5
 * - Has issue number metadata: +5
 * - Multiple signals agree on name: +5
 * - Year signals agree: +5
 *
 * Without a candidate, the score is capped at 55 (signals can agree with
 * each other but we have no DB series to match against).
 *
 * Tiers: high >= 90, medium >= 60, low < 60
 */
export function scoreConfidence(
  signals: ExtractedSignals,
  candidateSeriesName: string | null
): ConfidenceResult {
  let score = 0;
  const reasons: string[] = [];
  const hasCandidate = candidateSeriesName !== null && candidateSeriesName.length > 0;

  const normalizedCandidate = hasCandidate
    ? normalizeSeriesName(candidateSeriesName)
    : null;

  // --- Signal-vs-candidate matching ---

  // ComicInfo series matches candidate: +40
  const comicInfoNormalized = signals.comicInfo?.seriesName
    ? normalizeSeriesName(signals.comicInfo.seriesName)
    : null;

  if (normalizedCandidate && comicInfoNormalized && comicInfoNormalized === normalizedCandidate) {
    score += 40;
    reasons.push('ComicInfo series matches candidate');
  }

  // Folder name matches candidate: +25
  const folderNormalized = signals.folder.normalizedName;

  if (normalizedCandidate && folderNormalized && folderNormalized === normalizedCandidate) {
    score += 25;
    reasons.push('Folder name matches candidate');
  }

  // Filename series matches candidate: +15
  const filenameNormalized = signals.filename.normalizedName;

  if (normalizedCandidate && filenameNormalized && filenameNormalized === normalizedCandidate) {
    score += 15;
    reasons.push('Filename series matches candidate');
  }

  // --- Metadata quality bonuses ---

  // Has publisher metadata: +5
  if (signals.comicInfo?.publisher) {
    score += 5;
    reasons.push('Has publisher metadata');
  }

  // Has issue number from any source: +5
  if (signals.comicInfo?.issueNumber || signals.filename.issueNumber) {
    score += 5;
    reasons.push('Has issue number');
  }

  // --- Cross-signal agreement bonuses ---

  // Multiple signals agree on series name: +5
  const signalNames = [comicInfoNormalized, folderNormalized, filenameNormalized].filter(
    (n): n is string => n !== null && n.length > 0
  );
  const uniqueNames = new Set(signalNames);
  if (signalNames.length >= 2 && uniqueNames.size === 1) {
    score += 5;
    reasons.push('Multiple signals agree on series name');
  }

  // Year signals agree: +5
  const years = [
    signals.comicInfo?.year,
    signals.filename.year,
  ].filter((y): y is number => y !== null && y !== undefined);

  if (years.length >= 2 && new Set(years).size === 1) {
    score += 5;
    reasons.push('Year signals agree');
  }

  // --- Cap without candidate ---
  if (!hasCandidate) {
    score = Math.min(score, 55);
    if (reasons.length === 0) {
      reasons.push('No candidate series to match against');
    } else {
      reasons.push('Score capped (no candidate series)');
    }
  }

  // Clamp to 0-100
  score = Math.max(0, Math.min(100, score));

  // Determine tier
  let tier: ConfidenceTier;
  if (score >= 90) {
    tier = 'high';
  } else if (score >= 60) {
    tier = 'medium';
  } else {
    tier = 'low';
  }

  return { score, tier, reasons };
}

/**
 * Enhanced confidence scoring with multi-source boosting
 * Phase 3: Applies confidence boost when multiple metadata sources (CV + Metron) agree
 *
 * @param baseResult Base confidence result from scoreConfidence()
 * @param comicVineMatch Whether ComicVine volume was found
 * @param metronMatch Whether Metron issue was found
 * @returns Enhanced confidence result with multi-source boost applied
 */
export function enhanceConfidenceWithMultiSource(
  baseResult: ConfidenceResult,
  comicVineMatch: boolean = false,
  metronMatch: boolean = false
): ConfidenceResult {
  // Extract signal sources from reasons
  const signalSources: string[] = [];
  if (baseResult.reasons.some(r => r.includes('ComicInfo'))) signalSources.push('comicinfo');
  if (baseResult.reasons.some(r => r.includes('Folder'))) signalSources.push('folder');
  if (baseResult.reasons.some(r => r.includes('Filename'))) signalSources.push('filename');

  // Calculate multi-source boost
  const boost = calculateMultiSourceBoost(signalSources, comicVineMatch, metronMatch);

  if (!boost) {
    return baseResult; // No boost applies
  }

  // Apply boost to score
  const enhancedScore = applyMultiSourceBoost(baseResult.score, boost);

  // Recalculate tier based on enhanced score
  let enhancedTier: ConfidenceTier;
  if (enhancedScore >= 90) {
    enhancedTier = 'high';
  } else if (enhancedScore >= 60) {
    enhancedTier = 'medium';
  } else {
    enhancedTier = 'low';
  }

  return {
    score: enhancedScore,
    tier: enhancedTier,
    reasons: [...baseResult.reasons, boost.reason],
  };
}
