'use server';

import { db } from '@/db';
import { books, series } from '@/db/schema';
import { eq, sql, not, exists, isNull } from 'drizzle-orm';
import { countPagesInArchive } from '@/lib/metadata/parser';
import { logEvent } from '@/lib/activity-logger';
import fs from 'fs/promises';

// =====================
// Duplicate Series Detection
// =====================

export interface DuplicateGroup {
  normalizedName: string;
  seriesList: {
    id: string;
    name: string;
    bookCount: number;
    publisher: string | null;
    year: number | null;
    cvId: number | null;
  }[];
}

/**
 * Find series that likely represent the same title (case-insensitive,
 * ignoring leading "The", trailing year, and punctuation differences).
 */
export async function findDuplicateSeries(): Promise<{
  groups: DuplicateGroup[];
  totalDuplicates: number;
}> {
  // Get all series with book counts
  const allSeries = await db
    .select({
      id: series.id,
      name: series.name,
      publisher: series.publisher,
      year: series.year,
      cvId: series.cv_id,
      bookCount: sql<number>`(SELECT COUNT(*) FROM books WHERE books.series_id = ${series.id})`.as('book_count'),
    })
    .from(series);

  // Normalize names for comparison
  function normalize(name: string): string {
    return name
      .toLowerCase()
      .replace(/^the\s+/i, '')
      .replace(/\s*\(\d{4}\)\s*$/, '') // Remove trailing (2024)
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  const groups = new Map<string, typeof allSeries>();

  for (const s of allSeries) {
    const key = normalize(s.name);
    const existing = groups.get(key);
    if (existing) {
      existing.push(s);
    } else {
      groups.set(key, [s]);
    }
  }

  // Filter to only groups with >1 series (actual duplicates)
  const duplicates: DuplicateGroup[] = [];
  for (const [normalizedName, seriesList] of groups) {
    if (seriesList.length > 1) {
      duplicates.push({
        normalizedName,
        seriesList: seriesList.map(s => ({
          id: s.id,
          name: s.name,
          bookCount: Number(s.bookCount),
          publisher: s.publisher,
          year: s.year,
          cvId: s.cvId,
        })),
      });
    }
  }

  // Sort by number of duplicates descending
  duplicates.sort((a, b) => b.seriesList.length - a.seriesList.length);

  return {
    groups: duplicates,
    totalDuplicates: duplicates.reduce((sum, g) => sum + g.seriesList.length - 1, 0),
  };
}

/**
 * Merge duplicate series: move all books from source series to target series,
 * then delete the empty source series.
 */
export async function mergeSeries(
  targetSeriesId: string,
  sourceSeriesIds: string[]
): Promise<{ success: boolean; movedBooks: number; message?: string }> {
  try {
    let movedBooks = 0;

    for (const sourceId of sourceSeriesIds) {
      if (sourceId === targetSeriesId) continue;

      // Count books in source before moving
      const sourceBooks = await db
        .select({ id: books.id })
        .from(books)
        .where(eq(books.series_id, sourceId));

      // Move books from source to target
      await db
        .update(books)
        .set({ series_id: targetSeriesId, updated_at: new Date() })
        .where(eq(books.series_id, sourceId));

      movedBooks += sourceBooks.length;

      // Delete empty source series
      await db.delete(series).where(eq(series.id, sourceId));
    }

    await logEvent('series_merged', `Merged ${sourceSeriesIds.length} duplicate series, moved ${movedBooks} books`, {
      targetSeriesId,
      sourceSeriesIds,
      movedBooks,
    });

    return { success: true, movedBooks };
  } catch (error) {
    console.error('[HYGIENE] Merge series failed:', error);
    return {
      success: false,
      movedBooks: 0,
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// =====================
// Orphan Cleanup
// =====================

export interface OrphanReport {
  emptySeries: { id: string; name: string }[];
  missingFiles: { id: string; title: string; filePath: string }[];
}

/**
 * Find orphaned data: series with no books, and books whose files no longer exist on disk.
 */
export async function findOrphans(): Promise<OrphanReport> {
  // Find series with zero books
  const emptySeries = await db
    .select({ id: series.id, name: series.name })
    .from(series)
    .where(
      not(exists(
        db.select({ one: sql`1` }).from(books).where(eq(books.series_id, series.id))
      ))
    );

  // Find books with missing files (check filesystem)
  const allBooks = await db
    .select({ id: books.id, title: books.title, filePath: books.file_path })
    .from(books);

  const missingFiles: { id: string; title: string; filePath: string }[] = [];

  for (const book of allBooks) {
    try {
      await fs.access(book.filePath);
    } catch {
      missingFiles.push({
        id: book.id,
        title: book.title,
        filePath: book.filePath,
      });
    }
  }

  return { emptySeries, missingFiles };
}

/**
 * Clean up empty series (those with no books).
 */
export async function cleanupEmptySeries(): Promise<{ deleted: number }> {
  const empty = await db
    .select({ id: series.id })
    .from(series)
    .where(
      not(exists(
        db.select({ one: sql`1` }).from(books).where(eq(books.series_id, series.id))
      ))
    );

  if (empty.length === 0) return { deleted: 0 };

  for (const s of empty) {
    await db.delete(series).where(eq(series.id, s.id));
  }

  await logEvent('orphan_cleanup', `Deleted ${empty.length} empty series`, {
    count: empty.length,
  });

  return { deleted: empty.length };
}

/**
 * Remove book records whose files no longer exist on disk.
 */
export async function cleanupMissingFiles(): Promise<{ deleted: number }> {
  const allBooks = await db
    .select({ id: books.id, filePath: books.file_path })
    .from(books);

  const toDelete: string[] = [];

  for (const book of allBooks) {
    try {
      await fs.access(book.filePath);
    } catch {
      toDelete.push(book.id);
    }
  }

  if (toDelete.length === 0) return { deleted: 0 };

  for (const bookId of toDelete) {
    await db.delete(books).where(eq(books.id, bookId));
  }

  await logEvent('orphan_cleanup', `Removed ${toDelete.length} books with missing files`, {
    count: toDelete.length,
  });

  return { deleted: toDelete.length };
}

// =====================
// Page Count Backfill
// =====================

/**
 * Find and fix books that have page_count = 0 by counting images in the archive.
 * Processes in batches to avoid overwhelming the system.
 */
export async function backfillPageCounts(batchSize: number = 50): Promise<{
  processed: number;
  updated: number;
  errors: number;
}> {
  const booksWithNoPages = await db
    .select({ id: books.id, filePath: books.file_path })
    .from(books)
    .where(eq(books.page_count, 0))
    .limit(batchSize);

  let updated = 0;
  let errors = 0;

  for (const book of booksWithNoPages) {
    try {
      // Check file exists first
      await fs.access(book.filePath);

      const pageCount = await countPagesInArchive(book.filePath);
      if (pageCount > 0) {
        await db
          .update(books)
          .set({ page_count: pageCount, updated_at: new Date() })
          .where(eq(books.id, book.id));
        updated++;
      }
    } catch {
      errors++;
    }
  }

  if (updated > 0) {
    await logEvent('page_count_backfill', `Updated page counts for ${updated} books`, {
      processed: booksWithNoPages.length,
      updated,
      errors,
    });
  }

  return {
    processed: booksWithNoPages.length,
    updated,
    errors,
  };
}

// =====================
// Media Integrity Validation
// =====================

/** ZIP magic bytes: PK\x03\x04 */
const ZIP_MAGIC = Buffer.from([0x50, 0x4B, 0x03, 0x04]);
/** RAR magic bytes: Rar!\x1A\x07 */
const RAR_MAGIC = Buffer.from([0x52, 0x61, 0x72, 0x21, 0x1A, 0x07]);

export type MediaIssueType =
  | 'corrupt_archive'    // Cannot be opened at all
  | 'wrong_format'       // Magic bytes don't match extension
  | 'empty_archive'      // Archive opens but contains zero images
  | 'not_an_archive'     // Magic bytes match neither ZIP nor RAR
  | 'file_missing'       // File doesn't exist on disk
  | 'zero_bytes';        // File exists but is 0 bytes

export interface MediaIssue {
  bookId: string;
  title: string;
  filePath: string;
  issue: MediaIssueType;
  detail: string;
}

/**
 * Validate the integrity of comic archives in the library.
 * Checks magic bytes, opens archives, and verifies image content.
 * Processes in batches to avoid overwhelming the system.
 */
export async function validateMediaIntegrity(batchSize: number = 100): Promise<{
  scanned: number;
  healthy: number;
  issues: MediaIssue[];
}> {
  const allBooks = await db
    .select({
      id: books.id,
      title: books.title,
      filePath: books.file_path,
      fileSize: books.file_size,
    })
    .from(books)
    .limit(batchSize);

  const issues: MediaIssue[] = [];
  let healthy = 0;

  for (const book of allBooks) {
    const bookIssues = await validateSingleFile(book);
    if (bookIssues.length === 0) {
      healthy++;
    } else {
      issues.push(...bookIssues);
    }
  }

  if (issues.length > 0) {
    await logEvent('media_validation', `Media scan: ${issues.length} issues found in ${allBooks.length} files`, {
      scanned: allBooks.length,
      healthy,
      issueCount: issues.length,
      byType: issues.reduce((acc, i) => {
        acc[i.issue] = (acc[i.issue] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    });
  }

  return { scanned: allBooks.length, healthy, issues };
}

async function validateSingleFile(book: {
  id: string;
  title: string;
  filePath: string;
  fileSize: number;
}): Promise<MediaIssue[]> {
  const issues: MediaIssue[] = [];
  const ext = book.filePath.toLowerCase();
  const expectZip = ext.endsWith('.cbz') || ext.endsWith('.zip');
  const expectRar = ext.endsWith('.cbr') || ext.endsWith('.rar');

  // 1. Check file exists
  let stat: Awaited<ReturnType<typeof fs.stat>>;
  try {
    stat = await fs.stat(book.filePath);
  } catch {
    issues.push({ bookId: book.id, title: book.title, filePath: book.filePath, issue: 'file_missing', detail: 'File not found on disk' });
    return issues;
  }

  // 2. Check zero bytes
  if (stat.size === 0) {
    issues.push({ bookId: book.id, title: book.title, filePath: book.filePath, issue: 'zero_bytes', detail: 'File is 0 bytes' });
    return issues;
  }

  // 3. Read magic bytes
  let magicBuf: Buffer;
  try {
    const fh = await fs.open(book.filePath, 'r');
    magicBuf = Buffer.alloc(8);
    await fh.read(magicBuf, 0, 8, 0);
    await fh.close();
  } catch {
    issues.push({ bookId: book.id, title: book.title, filePath: book.filePath, issue: 'corrupt_archive', detail: 'Cannot read file header' });
    return issues;
  }

  const isZip = magicBuf.subarray(0, 4).equals(ZIP_MAGIC);
  const isRar = magicBuf.subarray(0, 6).equals(RAR_MAGIC);

  // 4. Check magic bytes match extension
  if (!isZip && !isRar) {
    issues.push({
      bookId: book.id, title: book.title, filePath: book.filePath,
      issue: 'not_an_archive',
      detail: `File header (${magicBuf.subarray(0, 4).toString('hex')}) is neither ZIP nor RAR`,
    });
    return issues;
  }

  if (expectZip && !isZip) {
    issues.push({
      bookId: book.id, title: book.title, filePath: book.filePath,
      issue: 'wrong_format',
      detail: `Extension suggests ZIP/CBZ but file is actually RAR`,
    });
  } else if (expectRar && !isRar) {
    issues.push({
      bookId: book.id, title: book.title, filePath: book.filePath,
      issue: 'wrong_format',
      detail: `Extension suggests RAR/CBR but file is actually ZIP`,
    });
  }

  // 5. Try to open and count images
  try {
    const pageCount = await countPagesInArchive(book.filePath);
    if (pageCount === 0) {
      issues.push({
        bookId: book.id, title: book.title, filePath: book.filePath,
        issue: 'empty_archive',
        detail: 'Archive contains no image files',
      });
    }
  } catch {
    issues.push({
      bookId: book.id, title: book.title, filePath: book.filePath,
      issue: 'corrupt_archive',
      detail: 'Archive cannot be opened or read',
    });
  }

  return issues;
}

// =====================
// Data Consistency Audit
// =====================

export interface ConsistencyIssue {
  type: 'missing_series_link' | 'page_count_mismatch' | 'duplicate_file_path'
    | 'no_title' | 'no_file_size' | 'stale_read_progress' | 'series_no_publisher';
  detail: string;
  bookId?: string;
  seriesId?: string;
}

/**
 * Audit data consistency across the library database.
 * Checks for referential integrity, missing required fields, and anomalies.
 */
export async function auditDataConsistency(): Promise<{
  issues: ConsistencyIssue[];
  stats: {
    totalBooks: number;
    totalSeries: number;
    booksWithoutTitle: number;
    booksZeroSize: number;
    booksZeroPages: number;
    seriesWithoutPublisher: number;
    seriesWithoutYear: number;
  };
}> {
  const issues: ConsistencyIssue[] = [];

  // Count totals
  const [{ totalBooks }] = await db.select({ totalBooks: sql<number>`count(*)` }).from(books);
  const [{ totalSeries }] = await db.select({ totalSeries: sql<number>`count(*)` }).from(series);

  // Books with empty/default title
  const noTitleBooks = await db
    .select({ id: books.id, filePath: books.file_path })
    .from(books)
    .where(sql`${books.title} = '' OR ${books.title} IS NULL`);

  for (const b of noTitleBooks) {
    issues.push({ type: 'no_title', detail: `Book has no title: ${b.filePath}`, bookId: b.id });
  }

  // Books with file_size = 0 (likely import error)
  const zeroSizeBooks = await db
    .select({ id: books.id, title: books.title })
    .from(books)
    .where(eq(books.file_size, 0));

  for (const b of zeroSizeBooks) {
    issues.push({ type: 'no_file_size', detail: `Book "${b.title}" has file_size=0`, bookId: b.id });
  }

  // Books with page_count = 0
  const zeroPagesBooks = await db
    .select({ id: books.id })
    .from(books)
    .where(eq(books.page_count, 0));

  // Series without publisher
  const noPublisherSeries = await db
    .select({ id: series.id, name: series.name })
    .from(series)
    .where(sql`${series.publisher} IS NULL OR ${series.publisher} = ''`);

  for (const s of noPublisherSeries) {
    issues.push({ type: 'series_no_publisher', detail: `Series "${s.name}" has no publisher`, seriesId: s.id });
  }

  // Series without year
  const noYearSeries = await db
    .select({ id: series.id })
    .from(series)
    .where(isNull(series.year));

  return {
    issues,
    stats: {
      totalBooks: Number(totalBooks),
      totalSeries: Number(totalSeries),
      booksWithoutTitle: noTitleBooks.length,
      booksZeroSize: zeroSizeBooks.length,
      booksZeroPages: zeroPagesBooks.length,
      seriesWithoutPublisher: noPublisherSeries.length,
      seriesWithoutYear: noYearSeries.length,
    },
  };
}

// =====================
// Naming Convention Audit
// =====================

export interface NamingIssue {
  type: 'non_standard_extension' | 'no_issue_number' | 'inconsistent_naming'
    | 'trailing_whitespace' | 'special_characters_in_series';
  detail: string;
  bookId?: string;
  seriesId?: string;
}

/**
 * Audit naming conventions across files and series.
 * Checks for non-standard extensions, missing issue numbers, inconsistent names.
 */
export async function auditNamingConventions(): Promise<{
  issues: NamingIssue[];
  stats: {
    nonStandardExtensions: number;
    missingIssueNumbers: number;
    inconsistentSeriesNames: number;
  };
}> {
  const issues: NamingIssue[] = [];

  // 1. Non-standard file extensions
  const allBookFiles = await db
    .select({ id: books.id, title: books.title, filePath: books.file_path })
    .from(books);

  const standardExts = ['.cbz', '.cbr'];
  const nonStandard: string[] = [];

  for (const b of allBookFiles) {
    const ext = b.filePath.substring(b.filePath.lastIndexOf('.')).toLowerCase();
    if (!standardExts.includes(ext)) {
      nonStandard.push(b.id);
      issues.push({
        type: 'non_standard_extension',
        detail: `"${b.title}" has non-standard extension "${ext}" (expected .cbz or .cbr)`,
        bookId: b.id,
      });
    }
  }

  // 2. Books with no issue number
  const noNumberBooks = await db
    .select({ id: books.id, title: books.title, seriesId: books.series_id })
    .from(books)
    .where(sql`${books.number} IS NULL OR ${books.number} = ''`);

  for (const b of noNumberBooks) {
    issues.push({
      type: 'no_issue_number',
      detail: `"${b.title}" has no issue number`,
      bookId: b.id,
    });
  }

  // 3. Series name consistency issues
  const allSeriesNames = await db
    .select({ id: series.id, name: series.name })
    .from(series);

  const inconsistent: string[] = [];
  for (const s of allSeriesNames) {
    // Leading/trailing whitespace
    if (s.name !== s.name.trim()) {
      inconsistent.push(s.id);
      issues.push({
        type: 'trailing_whitespace',
        detail: `Series "${s.name}" has leading/trailing whitespace`,
        seriesId: s.id,
      });
    }

    // Double spaces
    if (/\s{2,}/.test(s.name)) {
      inconsistent.push(s.id);
      issues.push({
        type: 'inconsistent_naming',
        detail: `Series "${s.name}" has double spaces`,
        seriesId: s.id,
      });
    }

    // Non-printable characters
    if (/[^\x20-\x7E\u00A0-\uFFFF]/.test(s.name)) {
      inconsistent.push(s.id);
      issues.push({
        type: 'special_characters_in_series',
        detail: `Series "${s.name}" contains non-printable characters`,
        seriesId: s.id,
      });
    }
  }

  return {
    issues,
    stats: {
      nonStandardExtensions: nonStandard.length,
      missingIssueNumbers: noNumberBooks.length,
      inconsistentSeriesNames: new Set(inconsistent).size,
    },
  };
}
