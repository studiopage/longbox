'use server';

import { db } from '@/db';
import { books, series, bookReviews, seriesPreferences, read_progress } from '@/db/schema';
import { eq, and, asc, sql } from 'drizzle-orm';
import { auth } from '@/lib/auth';
import { numberSort } from '@/lib/komga';

// =====================
// Next Unread Navigation
// =====================

export interface NextUnreadResult {
  nextBookId: string | null;
  nextBookTitle: string | null;
  nextBookNumber: string | null;
  seriesName: string;
  seriesId: string;
}

/**
 * Find the next unread book in the same series, ordered by issue number.
 */
export async function getNextUnreadInSeries(currentBookId: string): Promise<NextUnreadResult | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  // Get the current book's series
  const currentBook = await db.query.books.findFirst({
    where: eq(books.id, currentBookId),
    columns: { series_id: true, number: true },
  });
  if (!currentBook?.series_id) return null;

  const seriesRow = await db.query.series.findFirst({
    where: eq(series.id, currentBook.series_id),
    columns: { id: true, name: true },
  });
  if (!seriesRow) return null;

  // Get all books in the series
  const seriesBooks = await db
    .select({
      id: books.id,
      title: books.title,
      number: books.number,
    })
    .from(books)
    .where(eq(books.series_id, currentBook.series_id));

  // Sort by numberSort
  seriesBooks.sort((a, b) => numberSort(a.number) - numberSort(b.number));

  // Get all completed books for this user in this series
  const completedProgress = await db
    .select({ bookId: read_progress.book_id })
    .from(read_progress)
    .where(
      and(
        eq(read_progress.user_id, session.user.id),
        eq(read_progress.is_completed, true),
      )
    );

  const completedIds = new Set(completedProgress.map(p => p.bookId));

  // Find the current book's position, then get next unread after it
  const currentIdx = seriesBooks.findIndex(b => b.id === currentBookId);
  if (currentIdx === -1) return null;

  // Look for next unread after current position
  for (let i = currentIdx + 1; i < seriesBooks.length; i++) {
    if (!completedIds.has(seriesBooks[i].id)) {
      return {
        nextBookId: seriesBooks[i].id,
        nextBookTitle: seriesBooks[i].title,
        nextBookNumber: seriesBooks[i].number,
        seriesName: seriesRow.name,
        seriesId: seriesRow.id,
      };
    }
  }

  // No more unread — return null but with series info
  return {
    nextBookId: null,
    nextBookTitle: null,
    nextBookNumber: null,
    seriesName: seriesRow.name,
    seriesId: seriesRow.id,
  };
}

// =====================
// Per-Series Reading Preferences
// =====================

/**
 * Get the saved reading mode for a series (for the current user).
 */
export async function getSeriesReadMode(seriesId: string): Promise<string | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const pref = await db.query.seriesPreferences.findFirst({
    where: and(
      eq(seriesPreferences.user_id, session.user.id),
      eq(seriesPreferences.series_id, seriesId),
    ),
    columns: { read_mode: true },
  });

  return pref?.read_mode ?? null;
}

/**
 * Save a reading mode preference for a series.
 */
export async function saveSeriesReadMode(seriesId: string, readMode: string): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const existing = await db.query.seriesPreferences.findFirst({
    where: and(
      eq(seriesPreferences.user_id, session.user.id),
      eq(seriesPreferences.series_id, seriesId),
    ),
  });

  if (existing) {
    await db.update(seriesPreferences)
      .set({ read_mode: readMode, updated_at: new Date() })
      .where(eq(seriesPreferences.id, existing.id));
  } else {
    await db.insert(seriesPreferences).values({
      user_id: session.user.id,
      series_id: seriesId,
      read_mode: readMode,
    });
  }
}

// =====================
// Ratings & Notes
// =====================

export interface BookReview {
  rating: number | null;
  notes: string | null;
}

/**
 * Get the current user's review for a book.
 */
export async function getBookReview(bookId: string): Promise<BookReview | null> {
  const session = await auth();
  if (!session?.user?.id) return null;

  const review = await db.query.bookReviews.findFirst({
    where: and(
      eq(bookReviews.user_id, session.user.id),
      eq(bookReviews.book_id, bookId),
    ),
    columns: { rating: true, notes: true },
  });

  return review ?? null;
}

/**
 * Save or update a rating/note for a book.
 */
export async function saveBookReview(bookId: string, rating: number | null, notes: string | null): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) return;

  const existing = await db.query.bookReviews.findFirst({
    where: and(
      eq(bookReviews.user_id, session.user.id),
      eq(bookReviews.book_id, bookId),
    ),
  });

  if (existing) {
    await db.update(bookReviews)
      .set({ rating, notes, updated_at: new Date() })
      .where(eq(bookReviews.id, existing.id));
  } else {
    await db.insert(bookReviews).values({
      user_id: session.user.id,
      book_id: bookId,
      rating,
      notes,
    });
  }
}

// =====================
// Reading Streak + Pace (Dashboard Widget)
// =====================

export interface ReadingStreak {
  currentStreak: number;
  booksThisWeek: number;
  booksThisMonth: number;
  totalCompleted: number;
}

/**
 * Get the current user's reading streak and pace data.
 */
export async function getReadingStreak(): Promise<ReadingStreak> {
  const session = await auth();
  if (!session?.user?.id) {
    return { currentStreak: 0, booksThisWeek: 0, booksThisMonth: 0, totalCompleted: 0 };
  }

  const userId = session.user.id;

  // Get all completed books with dates, ordered by date
  const completed = await db
    .select({ updatedAt: read_progress.updated_at })
    .from(read_progress)
    .where(
      and(
        eq(read_progress.user_id, userId),
        eq(read_progress.is_completed, true),
      )
    )
    .orderBy(sql`${read_progress.updated_at} DESC`);

  const totalCompleted = completed.length;

  // Calculate streak (consecutive days with at least one completion)
  let currentStreak = 0;
  if (completed.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const uniqueDays = new Set<string>();
    for (const c of completed) {
      if (c.updatedAt) {
        const d = new Date(c.updatedAt);
        d.setHours(0, 0, 0, 0);
        uniqueDays.add(d.toISOString());
      }
    }

    const sortedDays = Array.from(uniqueDays).sort().reverse();

    // Check if today or yesterday has a completion (streak must be current)
    const todayStr = today.toISOString();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString();

    if (sortedDays[0] === todayStr || sortedDays[0] === yesterdayStr) {
      currentStreak = 1;
      for (let i = 1; i < sortedDays.length; i++) {
        const prev = new Date(sortedDays[i - 1]);
        const curr = new Date(sortedDays[i]);
        const diffMs = prev.getTime() - curr.getTime();
        const diffDays = diffMs / (1000 * 60 * 60 * 24);
        if (diffDays <= 1.5) {
          currentStreak++;
        } else {
          break;
        }
      }
    }
  }

  // Books this week
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const booksThisWeek = completed.filter(c =>
    c.updatedAt && new Date(c.updatedAt) >= weekAgo
  ).length;

  // Books this month
  const monthAgo = new Date();
  monthAgo.setDate(monthAgo.getDate() - 30);
  const booksThisMonth = completed.filter(c =>
    c.updatedAt && new Date(c.updatedAt) >= monthAgo
  ).length;

  return { currentStreak, booksThisWeek, booksThisMonth, totalCompleted };
}

// =====================
// Story Arc Browser
// =====================

export interface StoryArcGroup {
  name: string;
  books: {
    id: string;
    title: string;
    number: string | null;
    seriesId: string;
    seriesName: string;
  }[];
}

/**
 * Get all story arcs with their books, grouped by arc name.
 */
export async function getStoryArcs(): Promise<StoryArcGroup[]> {
  const booksWithArcs = await db
    .select({
      id: books.id,
      title: books.title,
      number: books.number,
      storyArcs: books.story_arcs,
      seriesId: books.series_id,
      seriesName: series.name,
    })
    .from(books)
    .innerJoin(series, eq(books.series_id, series.id))
    .where(sql`${books.story_arcs} IS NOT NULL AND ${books.story_arcs}::text != '[]' AND ${books.story_arcs}::text != 'null'`);

  const arcMap = new Map<string, StoryArcGroup['books']>();

  for (const book of booksWithArcs) {
    const arcs = book.storyArcs as { name: string }[] | null;
    if (!Array.isArray(arcs)) continue;

    for (const arc of arcs) {
      if (!arc.name) continue;
      const existing = arcMap.get(arc.name);
      const entry = {
        id: book.id,
        title: book.title,
        number: book.number,
        seriesId: book.seriesId,
        seriesName: book.seriesName,
      };
      if (existing) {
        existing.push(entry);
      } else {
        arcMap.set(arc.name, [entry]);
      }
    }
  }

  // Sort arcs by number of books (largest first), sort books within by numberSort
  const result: StoryArcGroup[] = [];
  for (const [name, arcBooks] of arcMap) {
    arcBooks.sort((a, b) => numberSort(a.number) - numberSort(b.number));
    result.push({ name, books: arcBooks });
  }
  result.sort((a, b) => b.books.length - a.books.length);

  return result;
}
