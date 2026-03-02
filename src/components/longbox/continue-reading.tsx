import { db } from '@/db';
import { books, read_progress, series } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowRight, BookOpen, ImageOff } from 'lucide-react';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';

export async function ContinueReading() {
  noStore();

  try {
    // Fetch books with in-progress reading
    const inProgressBooks = await db
      .select({
        bookId: books.id,
        bookTitle: books.title,
        bookNumber: books.number,
        pageCount: books.page_count,
        seriesId: series.id,
        seriesName: series.name,
        currentPage: read_progress.page,
        isCompleted: read_progress.is_completed,
        updatedAt: read_progress.updated_at,
      })
      .from(read_progress)
      .innerJoin(books, eq(read_progress.book_id, books.id))
      .innerJoin(series, eq(books.series_id, series.id))
      .where(eq(read_progress.is_completed, false))
      .orderBy(desc(read_progress.updated_at))
      .limit(4);

    if (inProgressBooks.length === 0) {
      return null;
    }

    return (
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            Continue Reading
          </h2>
          <Link href="/library" className="text-xs text-primary hover:underline flex items-center">
            Library <ArrowRight className="w-3 h-3 ml-1" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {inProgressBooks.map((book) => {
            const percentage = book.pageCount && book.pageCount > 0
              ? Math.round((book.currentPage / book.pageCount) * 100)
              : 0;

            return (
              <Link key={book.bookId} href={`/read/${book.bookId}`}>
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
                      <p className="text-xs text-muted-foreground truncate mb-2">
                        {book.bookNumber ? `#${book.bookNumber}` : book.bookTitle}
                      </p>
                      <div className="flex items-center gap-2">
                        <Progress value={percentage} className="h-1.5 flex-1" />
                        <span className="text-xs text-muted-foreground w-8">{percentage}%</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </section>
    );
  } catch (error) {
    console.error('ContinueReading error:', error);
    return null;
  }
}
