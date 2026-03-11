import path from 'path';
import { db } from '@/db';
import { books, series, triageQueue, requests, issues } from '@/db/schema';
import { eq, and, ilike } from 'drizzle-orm';
import { extractAllSignals, deriveSeriesName, deriveIssueNumber, type ExtractedSignals } from './signals';
import { scoreConfidence, type ConfidenceResult } from './confidence';
import { buildCredits } from '@/lib/metadata/parser';
import { logEvent } from '@/lib/activity-logger';
import { fireWebhook } from '@/lib/webhooks';

// =====================
// Matching Pipeline
// =====================
// Orchestrates the full file-processing flow: extract signals, resolve
// candidate series, score confidence, and route to books or triage queue.

export interface ProcessResult {
  action: 'linked' | 'linked_flagged' | 'triaged' | 'skipped' | 'error';
  seriesId?: string;
  seriesName?: string;
  confidence?: number;
  error?: string;
}

interface SeriesCandidate {
  id: string;
  name: string;
  cvId: number | null;
}

/**
 * Look up a candidate series in the database.
 * Tries exact match first, then case-insensitive match.
 */
async function resolveSeriesCandidate(
  name: string,
  normalized: string
): Promise<SeriesCandidate | null> {
  // Try exact name match first
  const exactMatch = await db
    .select({
      id: series.id,
      name: series.name,
      cvId: series.cv_id,
    })
    .from(series)
    .where(eq(series.name, name))
    .limit(1);

  if (exactMatch.length > 0) {
    return exactMatch[0];
  }

  // Fall back to case-insensitive match
  const ilikeMatch = await db
    .select({
      id: series.id,
      name: series.name,
      cvId: series.cv_id,
    })
    .from(series)
    .where(ilike(series.name, name))
    .limit(1);

  if (ilikeMatch.length > 0) {
    return ilikeMatch[0];
  }

  return null;
}

/**
 * Insert or update a book record in the books table.
 * Uses onConflictDoUpdate on file_path to handle re-scans.
 * Also propagates metadata (publisher, description, year) up to the series table
 * if those fields are currently empty.
 */
async function insertBook(
  signals: ExtractedSignals,
  seriesId: string,
  issueNumber: string,
  matchFlags: string[]
): Promise<void> {
  const ci = signals.comicInfo;
  const fileName = path.basename(signals.filePath);
  const titleFallback = fileName.replace(/\.[^/.]+$/, '');

  const authors = [ci?.writer, ci?.penciller, ci?.inker, ci?.colorist, ci?.letterer]
    .filter(Boolean).join(', ');
  const publishedDate = ci?.year ? new Date(ci.year, 0, 1) : null;

  // Build structured credits from ComicInfo role fields
  const credits = ci ? buildCredits({
    writer: ci.writer ?? undefined,
    penciller: ci.penciller ?? undefined,
    inker: ci.inker ?? undefined,
    colorist: ci.colorist ?? undefined,
    letterer: ci.letterer ?? undefined,
    coverArtist: ci.coverArtist ?? undefined,
    editor: ci.editor ?? undefined,
  }) : [];

  // Build story arcs array from ComicInfo StoryArc field
  const storyArcs = ci?.storyArc
    ? ci.storyArc.split(',').map(arc => arc.trim()).filter(Boolean).map(name => ({ name }))
    : [];

  const bookValues = {
    series_id: seriesId,
    file_path: signals.filePath,
    file_size: signals.fileSize,
    title: ci?.title || titleFallback,
    number: issueNumber,
    page_count: ci?.pageCount || 0,
    summary: ci?.summary || null,
    publisher: ci?.publisher || null,
    authors: authors || null,
    published_date: publishedDate,
    match_flags: matchFlags.length > 0 ? matchFlags : null,
    credits: credits.length > 0 ? credits : null,
    story_arcs: storyArcs.length > 0 ? storyArcs : null,
  };

  await db.insert(books).values(bookValues).onConflictDoUpdate({
    target: books.file_path,
    set: {
      ...bookValues,
      updated_at: new Date(),
    },
  });

  // Propagate metadata up to series if fields are empty
  if (ci?.publisher || ci?.summary || ci?.year) {
    await enrichSeriesFromBook(seriesId, ci);
  }
}

/**
 * Fill in empty series-level fields from book/ComicInfo metadata.
 * Only updates fields that are currently null/empty — never overwrites existing data.
 */
async function enrichSeriesFromBook(
  seriesId: string,
  ci: { publisher?: string | null; summary?: string | null; year?: number | null; month?: number | null } | undefined
): Promise<void> {
  if (!ci) return;

  try {
    const s = await db.select({
      publisher: series.publisher,
      description: series.description,
      year: series.year,
    }).from(series).where(eq(series.id, seriesId)).limit(1);

    if (s.length === 0) return;
    const current = s[0];

    const updates: Record<string, unknown> = {};
    if (!current.publisher && ci.publisher) updates.publisher = ci.publisher;
    if (!current.description && ci.summary) updates.description = ci.summary;
    if (!current.year && ci.year) updates.year = ci.year;

    if (Object.keys(updates).length > 0) {
      updates.updated_at = new Date();
      await db.update(series).set(updates).where(eq(series.id, seriesId));
    }
  } catch (err) {
    console.error('[PIPELINE] Series enrichment failed:', err);
  }
}

/**
 * Insert or update a triage queue record for manual review.
 * Uses onConflictDoUpdate on file_path to handle re-scans.
 */
async function insertTriage(
  signals: ExtractedSignals,
  derived: { name: string; normalized: string; source: string },
  issueNumber: string,
  confidence: ConfidenceResult,
  candidate: SeriesCandidate | null,
  scanJobId: string | undefined
): Promise<void> {
  const ci = signals.comicInfo;
  const fileName = path.basename(signals.filePath);

  const signalsJson = {
    comicinfo: signals.comicInfo,
    folder: signals.folder,
    filename: signals.filename,
  };

  await db.insert(triageQueue).values({
    file_path: signals.filePath,
    file_size: signals.fileSize,
    suggested_series: derived.name,
    suggested_title: ci?.title || fileName.replace(/\.[^/.]+$/, ''),
    suggested_number: issueNumber,
    match_confidence: confidence.score,
    matched_series_id: candidate?.id || null,
    signals: signalsJson,
    status: 'pending',
    scan_job_id: scanJobId || null,
    metadata_xml: ci ? JSON.stringify(ci) : null,
  }).onConflictDoUpdate({
    target: triageQueue.file_path,
    set: {
      file_size: signals.fileSize,
      suggested_series: derived.name,
      suggested_title: ci?.title || fileName.replace(/\.[^/.]+$/, ''),
      suggested_number: issueNumber,
      match_confidence: confidence.score,
      matched_series_id: candidate?.id || null,
      signals: signalsJson,
      status: 'pending',
      scan_job_id: scanJobId || null,
      metadata_xml: ci ? JSON.stringify(ci) : null,
    },
  });
}

/**
 * Check if this newly-linked book fulfills any open requests.
 * Matches on series_id + issue_number. Updates request status and issue status.
 */
async function checkFulfillment(seriesId: string, issueNumber: string, seriesName: string): Promise<void> {
  try {
    // Find matching open requests for this series + issue number
    const openRequests = await db
      .select({ id: requests.id, issue_id: requests.issue_id })
      .from(requests)
      .where(
        and(
          eq(requests.series_id, seriesId),
          eq(requests.issue_number, issueNumber),
          eq(requests.status, 'requested')
        )
      );

    if (openRequests.length === 0) return;

    for (const req of openRequests) {
      await db.update(requests).set({
        status: 'fulfilled',
        fulfilled_at: new Date(),
      }).where(eq(requests.id, req.id));

      // Update issue status from 'wanted' to 'downloaded'
      if (req.issue_id) {
        await db.update(issues).set({ status: 'downloaded' }).where(eq(issues.id, req.issue_id));
      }
    }

    logEvent('request_fulfilled', `Fulfilled ${openRequests.length} request(s) for ${seriesName} #${issueNumber}`, {
      seriesName,
      issueNumber,
      count: openRequests.length,
    });

    fireWebhook('request_fulfilled', {
      series: seriesName,
      issueNumber,
      count: openRequests.length,
    });
  } catch (err) {
    console.error('[PIPELINE] Fulfillment check failed:', err);
  }
}

/**
 * Process a single comic file through the matching pipeline.
 *
 * Pipeline steps:
 * 1. Skip if file already exists in books or triage queue
 * 2. Extract signals (ComicInfo.xml, folder, filename)
 * 3. Derive best series name from signals
 * 4. Resolve candidate series in database
 * 5. Score confidence
 * 6. Route based on confidence tier:
 *    - High + candidate → insert into books (auto-linked)
 *    - Medium + candidate → insert into books with low_confidence flag
 *    - Low or no candidate → insert into triage queue
 */
export async function processFile(
  filePath: string,
  fileSize: number,
  libraryRoot: string,
  scanJobId?: string
): Promise<ProcessResult> {
  try {
    // Step 1: Check if file already exists in books or triage queue
    const existingBook = await db
      .select({ id: books.id })
      .from(books)
      .where(eq(books.file_path, filePath))
      .limit(1);

    if (existingBook.length > 0) {
      return { action: 'skipped' };
    }

    const existingTriage = await db
      .select({ id: triageQueue.id })
      .from(triageQueue)
      .where(eq(triageQueue.file_path, filePath))
      .limit(1);

    if (existingTriage.length > 0) {
      return { action: 'skipped' };
    }

    // Step 2: Extract all signals
    const signals = await extractAllSignals(filePath, fileSize, libraryRoot);

    // Step 3: Derive the best series name
    const derived = deriveSeriesName(signals);

    // Step 4: Resolve candidate series in the database
    const candidate = await resolveSeriesCandidate(derived.name, derived.normalized);

    // Step 5: Score confidence
    const confidence = scoreConfidence(signals, candidate?.name ?? null);

    // Step 6: Derive issue number
    const issueNumber = deriveIssueNumber(signals);

    // Step 7: Route based on confidence tier and candidate availability
    if (confidence.tier === 'high' && candidate) {
      // High confidence + known series → auto-link
      await insertBook(signals, candidate.id, issueNumber, []);
      await checkFulfillment(candidate.id, issueNumber, candidate.name);
      return {
        action: 'linked',
        seriesId: candidate.id,
        seriesName: candidate.name,
        confidence: confidence.score,
      };
    }

    if (confidence.tier === 'medium' && candidate) {
      // Medium confidence + known series → auto-link with flag
      await insertBook(signals, candidate.id, issueNumber, ['low_confidence']);
      await checkFulfillment(candidate.id, issueNumber, candidate.name);
      return {
        action: 'linked_flagged',
        seriesId: candidate.id,
        seriesName: candidate.name,
        confidence: confidence.score,
      };
    }

    // Low confidence or no candidate → triage queue
    await insertTriage(signals, derived, issueNumber, confidence, candidate, scanJobId);
    return {
      action: 'triaged',
      seriesName: derived.name,
      confidence: confidence.score,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[PIPELINE] Error processing ${filePath}:`, message);
    return {
      action: 'error',
      error: message,
    };
  }
}
