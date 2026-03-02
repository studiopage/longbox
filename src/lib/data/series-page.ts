import { db } from '@/db';
import { series, books, issues, read_progress } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { getComicVineVolume, getComicVineIssues } from '@/lib/comicvine';
import { isSeriesFavorited } from '@/actions/favorites';

// ── Types ──────────────────────────────────────────────────

export type SeriesContext = 'library' | 'managed' | 'discovery';

export interface SeriesBook {
  id: string;
  title: string;
  number: string | null;
  pageCount: number;
  isCompleted: boolean;
}

export interface SeriesIssue {
  id: string;
  issueNumber: string;
  title: string | null;
  coverDate: string | null;
  thumbnailUrl: string | null;
  status: string | null;
  isRead: boolean;
}

export interface SeriesPageData {
  // Core metadata
  id: string;
  name: string;
  publisher: string | null;
  year: number | null;
  description: string | null;
  status: string | null;
  thumbnailUrl: string | null;
  cvId: number | null;

  // Context
  context: SeriesContext;
  isInLibrary: boolean;
  localSeriesId: string | null;
  hasBooks: boolean;
  hasIssues: boolean;

  // Data
  books: SeriesBook[];
  issues: SeriesIssue[];

  // Stats
  totalIssueCount: number;
  ownedCount: number;
  readCount: number;

  // User state
  isFavorited: boolean;
}

// ── Helpers ────────────────────────────────────────────────

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isUUID(id: string): boolean {
  return UUID_REGEX.test(id);
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, '').trim();
}

// ── Local DB loader ────────────────────────────────────────

async function loadFromLocalDB(seriesId: string): Promise<SeriesPageData | null> {
  const [seriesRow] = await db
    .select({
      id: series.id,
      name: series.name,
      description: series.description,
      publisher: series.publisher,
      year: series.year,
      status: series.status,
      thumbnail_url: series.thumbnail_url,
      cv_id: series.cv_id,
    })
    .from(series)
    .where(eq(series.id, seriesId))
    .limit(1);

  if (!seriesRow) return null;

  // Parallel: books with read progress, issues catalog, favorite status
  const [seriesBooks, seriesIssues, isFavorited] = await Promise.all([
    db
      .select({
        id: books.id,
        title: books.title,
        number: books.number,
        page_count: books.page_count,
        is_completed: read_progress.is_completed,
      })
      .from(books)
      .leftJoin(read_progress, eq(books.id, read_progress.book_id))
      .where(eq(books.series_id, seriesId))
      .orderBy(asc(books.number)),
    db
      .select({
        id: issues.id,
        issue_number: issues.issue_number,
        title: issues.title,
        cover_date: issues.cover_date,
        thumbnail_url: issues.thumbnail_url,
        status: issues.status,
        read: issues.read,
      })
      .from(issues)
      .where(eq(issues.series_id, seriesId))
      .orderBy(asc(issues.cover_date)),
    isSeriesFavorited(seriesId),
  ]);

  const hasBooks = seriesBooks.length > 0;
  const hasIssues = seriesIssues.length > 0;
  const context: SeriesContext = hasBooks ? 'library' : 'managed';

  return {
    id: seriesRow.id,
    name: seriesRow.name,
    publisher: seriesRow.publisher,
    year: seriesRow.year,
    description: seriesRow.description ? stripHtml(seriesRow.description).slice(0, 500) : null,
    status: seriesRow.status,
    thumbnailUrl: seriesRow.thumbnail_url,
    cvId: seriesRow.cv_id,

    context,
    isInLibrary: true,
    localSeriesId: seriesRow.id,
    hasBooks,
    hasIssues,

    books: seriesBooks.map((b) => ({
      id: b.id,
      title: b.title,
      number: b.number,
      pageCount: b.page_count ?? 0,
      isCompleted: b.is_completed ?? false,
    })),
    issues: seriesIssues.map((i) => ({
      id: i.id,
      issueNumber: i.issue_number,
      title: i.title,
      coverDate: i.cover_date,
      thumbnailUrl: i.thumbnail_url,
      status: i.status,
      isRead: i.read ?? false,
    })),

    totalIssueCount: hasBooks ? seriesBooks.length : seriesIssues.length,
    ownedCount: seriesBooks.length,
    readCount: seriesBooks.filter((b) => b.is_completed).length,
    isFavorited,
  };
}

// ── ComicVine loader ───────────────────────────────────────

async function loadFromComicVine(cvId: string): Promise<SeriesPageData | null> {
  // Check if this CV ID exists in our local DB
  const parsed = parseInt(cvId, 10);
  if (!isNaN(parsed)) {
    const [existingRow] = await db
      .select({ id: series.id })
      .from(series)
      .where(eq(series.cv_id, parsed))
      .limit(1);

    if (existingRow) {
      // Series is in our DB — load the full local version
      return loadFromLocalDB(existingRow.id);
    }
  }

  // Not in DB — fetch from ComicVine API
  const [volume, cvIssues] = await Promise.all([
    getComicVineVolume(cvId),
    getComicVineIssues(cvId),
  ]);

  if (!volume) return null;

  return {
    id: cvId,
    name: volume.name,
    publisher: volume.publisher?.name || null,
    year: volume.start_year ? parseInt(volume.start_year, 10) : null,
    description: volume.description ? stripHtml(volume.description).slice(0, 500) : null,
    status: null,
    thumbnailUrl: volume.image?.medium_url || null,
    cvId: volume.id,

    context: 'discovery',
    isInLibrary: false,
    localSeriesId: null,
    hasBooks: false,
    hasIssues: cvIssues.length > 0,

    books: [],
    issues: cvIssues.map((i: any) => ({
      id: String(i.id),
      issueNumber: i.issue_number || '?',
      title: i.name || null,
      coverDate: i.cover_date || null,
      thumbnailUrl: i.image?.medium_url || null,
      status: null,
      isRead: false,
    })),

    totalIssueCount: volume.count_of_issues || cvIssues.length,
    ownedCount: 0,
    readCount: 0,
    isFavorited: false,
  };
}

// ── Public API ─────────────────────────────────────────────

export async function getSeriesPageData(id: string): Promise<SeriesPageData | null> {
  // 1. UUID → direct DB lookup
  if (isUUID(id)) {
    return loadFromLocalDB(id);
  }

  // 2. Integer → try CV ID in DB, then fall back to ComicVine API
  return loadFromComicVine(id);
}
