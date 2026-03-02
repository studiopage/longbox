import { db } from '@/db';
import { series, books } from '@/db/schema';
import { desc, sql, asc } from 'drizzle-orm';
import { LibraryClient } from '@/components/longbox/library-client';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  // Fetch Series with Book Counts and first book for cover
  let librarySeries: Array<{
    id: string;
    name: string | null;
    publisher: string | null;
    year: number | null;
    thumbnail: string | null;
    bookCount: number;
    firstBookId: string | null;
  }> = [];

  let libraryBooks: Array<{
    id: string;
    title: string;
    number: string | null;
    seriesId: string;
    seriesName: string | null;
  }> = [];

  try {
    // Query books table grouped by series to get file-based series with counts
    librarySeries = await db
      .select({
        id: series.id,
        name: series.name,
        publisher: series.publisher,
        year: series.year,
        thumbnail: series.thumbnail_url,
        bookCount: sql<number>`count(${books.id})`.mapWith(Number),
        firstBookId: sql<string>`(array_agg(${books.id} ORDER BY ${books.number} ASC))[1]`,
      })
      .from(books)
      .innerJoin(series, sql`${books.series_id} = ${series.id}`)
      .groupBy(series.id, series.name, series.publisher, series.year, series.thumbnail_url)
      .orderBy(asc(series.name));

    // Fetch all books with their series names
    libraryBooks = await db
      .select({
        id: books.id,
        title: books.title,
        number: books.number,
        seriesId: books.series_id,
        seriesName: series.name,
      })
      .from(books)
      .innerJoin(series, sql`${books.series_id} = ${series.id}`)
      .orderBy(asc(books.title));
  } catch (error) {
    console.error("Failed to fetch library data:", error);
    librarySeries = [];
    libraryBooks = [];
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight text-foreground">My Library</h1>
      </div>

      <LibraryClient series={librarySeries} books={libraryBooks} />
    </div>
  );
}
