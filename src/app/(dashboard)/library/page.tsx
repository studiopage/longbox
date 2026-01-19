import { db } from '@/db';
import { books, fileSeries } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';

export const dynamic = 'force-dynamic'; // Real-time

export default async function LibraryPage() {
  noStore(); // Force dynamic rendering
  
  // 1. Fetch Series with Book Counts and First Book ID for Thumbnail
  const allSeries = await db
    .select({
      id: fileSeries.id,
      name: fileSeries.name,
      path_source: fileSeries.path_source,
      count: sql<number>`count(${books.id})`.mapWith(Number),
      // NEW: Grab the ID of the first book in the series to use as the cover
      first_book_id: sql<string>`min(${books.id})`,
    })
    .from(fileSeries)
    .leftJoin(books, eq(fileSeries.id, books.series_id))
    .groupBy(fileSeries.id, fileSeries.name, fileSeries.path_source)
    .orderBy(fileSeries.name);

  return (
    <div className="p-8 space-y-8">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Longbox</h1>
        <div className="text-sm text-muted-foreground">
          {allSeries.length} Series detected
        </div>
      </header>

      {allSeries.length === 0 ? (
        <div className="text-center py-20 border-2 border-dashed rounded-lg">
          <h3 className="text-lg font-medium mb-2">No Series Found</h3>
          <p className="text-muted-foreground mb-4">
            The scanner hasn't detected any comic files yet.
          </p>
          <p className="text-xs text-muted-foreground">
            Make sure LIBRARY_ROOT is set correctly and files are in the watched directory.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {allSeries.map((s) => (
            <Link key={s.id} href={`/library/${s.id}`} className="group space-y-3">
              <div className="aspect-[2/3] bg-zinc-800 rounded-lg border border-zinc-700 shadow-sm group-hover:border-zinc-500 transition relative overflow-hidden">
                
                {/* THUMBNAIL LOGIC */}
                {s.first_book_id ? (
                  <img 
                    src={`/api/v1/books/${s.first_book_id}/thumbnail`}
                    alt={s.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover transition-transform group-hover:scale-105"
                  />
                ) : (
                  /* Fallback for empty series (like you see now) */
                  <div className="absolute inset-0 flex items-center justify-center text-zinc-600">
                    <span className="text-xs font-mono">NO BOOKS</span>
                  </div>
                )}
                
                {/* Subtle gradient so white text pops on white covers */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition" />
              </div>
              
              <div className="space-y-1">
                <h3 className="font-medium truncate text-zinc-100 group-hover:text-blue-400 transition">
                  {s.name}
                </h3>
                <p className="text-xs text-zinc-500">{s.count} issues</p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
