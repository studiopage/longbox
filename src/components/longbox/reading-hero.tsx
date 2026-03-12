import { db } from '@/db';
import { books, read_progress, series } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { Play } from 'lucide-react';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';

export async function ReadingHero() {
  noStore();

  try {
    const [book] = await db
      .select({
        bookId: books.id,
        bookTitle: books.title,
        bookNumber: books.number,
        pageCount: books.page_count,
        seriesId: series.id,
        seriesName: series.name,
        currentPage: read_progress.page,
      })
      .from(read_progress)
      .innerJoin(books, eq(read_progress.book_id, books.id))
      .innerJoin(series, eq(books.series_id, series.id))
      .where(eq(read_progress.is_completed, false))
      .orderBy(desc(read_progress.updated_at))
      .limit(1);

    if (!book) return null;

    const percentage = book.pageCount && book.pageCount > 0
      ? Math.round((book.currentPage / book.pageCount) * 100)
      : 0;

    const coverUrl = `/api/cover/${book.bookId}`;

    return (
      <Link href={`/read/${book.bookId}`} className="block group">
        <div className="relative rounded-lg overflow-hidden border border-border bg-card">
          {/* Blurred cover as background wash */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={coverUrl}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover opacity-[0.06] blur-2xl scale-110 pointer-events-none select-none"
          />
          <div className="relative flex gap-5 p-5">
            {/* Cover */}
            <div className="shrink-0 w-24 h-36 sm:w-32 sm:h-48 rounded overflow-hidden shadow-lg border border-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={coverUrl}
                alt={book.seriesName}
                className="w-full h-full object-cover"
              />
            </div>
            {/* Info */}
            <div className="flex flex-col justify-between py-1 flex-1 min-w-0">
              <div className="space-y-1">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  Continue Reading
                </p>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight truncate group-hover:text-primary transition-colors">
                  {book.seriesName}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {book.bookNumber ? `Issue #${book.bookNumber}` : book.bookTitle}
                </p>
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Page {book.currentPage} of {book.pageCount ?? '?'}</span>
                    <span>{percentage}%</span>
                  </div>
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary/60 rounded-full"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded bg-primary/15 border border-primary/25 text-primary text-sm font-medium group-hover:bg-primary/25 transition-colors">
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Resume Reading
                </div>
              </div>
            </div>
          </div>
        </div>
      </Link>
    );
  } catch (error) {
    console.error('ReadingHero error:', error);
    return null;
  }
}
