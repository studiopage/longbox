import { db } from '@/db';
import { books, series } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { Card } from '@/components/ui/card';
import { ArrowRight, Clock, ImageOff } from 'lucide-react';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';

export async function RecentlyAdded() {
  noStore();

  try {
    // Fetch recently added books
    const recentBooks = await db
      .select({
        bookId: books.id,
        bookTitle: books.title,
        bookNumber: books.number,
        createdAt: books.created_at,
        seriesId: series.id,
        seriesName: series.name,
      })
      .from(books)
      .innerJoin(series, eq(books.series_id, series.id))
      .orderBy(desc(books.created_at))
      .limit(6);

    if (recentBooks.length === 0) {
      return null;
    }

    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            Recently Added
          </h2>
          <Link href="/library" className="text-xs text-primary hover:underline flex items-center">
            Library <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {recentBooks.map((book) => (
            <Link key={book.bookId} href={`/series/${book.seriesId}`}>
              <Card className="group hover:bg-accent/50 transition-colors overflow-hidden">
                <div className="flex gap-3 p-3">
                  {/* Book cover thumbnail from API */}
                  <div className="w-12 h-16 rounded overflow-hidden bg-muted shrink-0 relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/cover/${book.bookId}`}
                      alt={book.bookTitle || ''}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-muted opacity-0">
                      <ImageOff className="w-4 h-4 opacity-20" />
                    </div>
                  </div>
                  {/* Book info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-center">
                    <h4 className="font-medium text-sm truncate">{book.seriesName}</h4>
                    <p className="text-xs text-muted-foreground truncate">
                      {book.bookNumber ? `#${book.bookNumber}` : book.bookTitle}
                    </p>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </section>
    );
  } catch (error) {
    console.error('RecentlyAdded error:', error);
    return null;
  }
}
