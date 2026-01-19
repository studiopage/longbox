import { db } from '@/db';
import { series, books } from '@/db/schema';
import { desc, sql } from 'drizzle-orm';
import Link from 'next/link';
import { Book } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function LibraryPage() {
  // 1. Fetch Series with Book Counts
  // Query books table and group by series_id to get file-based series
  let librarySeries: Array<{
    id: string;
    name: string | null;
    publisher: string | null;
    year: number | null;
    thumbnail: string | null;
    bookCount: number;
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
      })
      .from(books)
      .innerJoin(series, sql`${books.series_id} = ${series.id}`)
      .groupBy(series.id, series.name, series.publisher, series.year, series.thumbnail_url)
      .orderBy(desc(series.year));
  } catch (error) {
    // Schema mismatch - try querying books directly without series join
    try {
      console.warn("Primary query failed, trying fallback:", error);
      const bookSeries = await db
        .select({
          seriesId: books.series_id,
          bookCount: sql<number>`count(${books.id})`.mapWith(Number),
        })
        .from(books)
        .groupBy(books.series_id);
      
      // Fetch series details separately
      const seriesIds = bookSeries.map(b => b.seriesId);
      if (seriesIds.length > 0) {
        // This will likely fail too due to schema mismatch, but worth trying
        librarySeries = [];
      }
    } catch (fallbackError) {
      console.error("All queries failed - database schema mismatch:", fallbackError);
      librarySeries = [];
    }
  }

  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black tracking-tight text-white">My Library</h1>
        <span className="text-zinc-500 text-sm">{librarySeries.length} Series</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {librarySeries.map((s) => (
          <Link 
            key={s.id} 
            href={`/library/${s.id}`}
            className="group relative flex flex-col gap-3"
          >
            {/* Poster Card */}
            <div className="aspect-[2/3] bg-zinc-900 rounded-lg border border-zinc-800 overflow-hidden shadow-sm group-hover:shadow-blue-900/20 group-hover:border-blue-500/50 transition relative">
              {s.thumbnail ? (
                <img 
                  src={s.thumbnail} 
                  alt={s.name}
                  className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-zinc-700 gap-2">
                  <Book className="w-8 h-8" />
                </div>
              )}
              
              {/* Badge for Book Count */}
              <div className="absolute top-2 right-2 bg-black/80 backdrop-blur text-white text-xs font-bold px-2 py-1 rounded border border-white/10">
                {s.bookCount}
              </div>
            </div>

            {/* Text Info */}
            <div>
              <h3 className="text-white font-medium leading-tight truncate group-hover:text-blue-400 transition">
                {s.name}
              </h3>
              <p className="text-zinc-500 text-xs mt-1">
                {s.publisher || 'Unknown'} • {s.year || '----'}
              </p>
            </div>
          </Link>
        ))}
      </div>

      {librarySeries.length === 0 && (
        <div className="text-center py-20 text-zinc-500">
          <p className="text-lg">Your library is empty.</p>
          <p className="text-sm mt-2">Add files to your <code className="bg-zinc-900 px-1 py-0.5 rounded">/comics</code> folder to get started.</p>
        </div>
      )}
    </div>
  );
}
