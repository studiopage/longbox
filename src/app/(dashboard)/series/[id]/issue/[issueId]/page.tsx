import { db } from '@/db';
import { books, series, read_progress } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Play, ArrowLeft, BookOpen, Calendar, User, FileText, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatIssueDisplayTitle } from '@/lib/utils/comic-metadata';
import { getReadingProgress } from '@/lib/data/reading-progress';

export const dynamic = 'force-dynamic';

export default async function IssueDetailPage({ params }: { params: Promise<{ id: string; issueId: string }> }) {
  const { id: seriesId, issueId } = await params;

  // Fetch Book + Parent Series
  const bookResult = await db
    .select({
      id: books.id,
      title: books.title,
      number: books.number,
      page_count: books.page_count,
      file_path: books.file_path,
      file_size: books.file_size,
      summary: books.summary,
      publisher: books.publisher,
      authors: books.authors,
      published_date: books.published_date,
      series_id: books.series_id,
    })
    .from(books)
    .where(eq(books.id, issueId))
    .limit(1);

  if (!bookResult || bookResult.length === 0) return notFound();

  const book = bookResult[0];

  // Verify the book belongs to the series
  if (book.series_id !== seriesId) return notFound();

  // Fetch series data
  const seriesResult = await db
    .select({
      id: series.id,
      name: series.name,
      publisher: series.publisher,
      year: series.year,
      thumbnail_url: series.thumbnail_url,
    })
    .from(series)
    .where(eq(series.id, seriesId))
    .limit(1);

  if (!seriesResult || seriesResult.length === 0) return notFound();

  const seriesData = seriesResult[0];

  // Format display title using utility
  const displayTitle = formatIssueDisplayTitle(book.title, book.number, book.file_path);

  // Fetch reading progress
  const progress = await getReadingProgress(book.id, book.page_count || 0);

  // Get cover URL
  const coverUrl = `/api/cover/${book.id}`;

  return (
    <div className="p-8 space-y-6">
      {/* Back Button */}
      <Link href={`/series/${seriesId}`}>
        <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-3">
          <ArrowLeft className="w-4 h-4 mr-1" /> {seriesData.name}
        </Button>
      </Link>

      {/* Header with Cover */}
      <div className="flex gap-8 items-start">
        {/* Cover Art */}
        <div className="hidden md:block w-56 flex-shrink-0">
          <div className="aspect-[2/3] rounded overflow-hidden border border-border relative">
            <img
              src={coverUrl}
              alt={displayTitle}
              className="w-full h-full object-cover"
            />
            {/* Read badge on cover */}
            {progress?.isCompleted && (
              <div className="absolute top-3 right-3 w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-primary-foreground" />
              </div>
            )}
          </div>
        </div>

        {/* Title & Meta */}
        <div className="flex-1 min-w-0">
          {/* Series Name */}
          <Link href={`/series/${seriesId}`} className="text-primary font-semibold uppercase tracking-wide text-sm hover:text-primary/80 transition">
            {seriesData.name}
          </Link>

          {/* Issue Title */}
          <h1 className="text-4xl md:text-5xl font-black text-foreground tracking-tight mt-2 mb-6">
            {displayTitle}
          </h1>

          {/* Meta Pills */}
          <div className="flex flex-wrap gap-4 mb-6">
            {book.published_date && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="w-4 h-4" />
                <span>{new Date(book.published_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</span>
              </div>
            )}
            {book.authors && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="w-4 h-4" />
                <span>{book.authors.split(',')[0]}</span>
              </div>
            )}
            {book.page_count && (
              <div className="flex items-center gap-2 text-muted-foreground">
                <FileText className="w-4 h-4" />
                <span>{book.page_count} Pages</span>
              </div>
            )}
          </div>

          {/* Reading Status */}
          {progress && (
            <div className="mb-6">
              {progress.isCompleted ? (
                <div className="flex items-center gap-2 text-primary/70">
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="font-semibold">Completed</span>
                </div>
              ) : progress.percentage > 0 ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 text-primary">
                    <Clock className="w-5 h-5" />
                    <span className="font-semibold">In Progress</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{ width: `${progress.percentage}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground">{progress.percentage}%</span>
                  </div>
                  <span className="text-sm text-muted-foreground">Page {progress.page} of {progress.totalPages}</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="w-5 h-5" />
                  <span>Not started</span>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-4">
            <Link href={`/read/${book.id}`}>
              <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold px-8">
                <Play className="w-5 h-5 mr-2 fill-current" />
                {progress && progress.percentage > 0 ? 'Continue Reading' : 'Start Reading'}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* SYNOPSIS */}
      <div className="md:ml-64">
        <h3 className="text-lg font-bold text-foreground mb-3">Synopsis</h3>
        <p className="text-muted-foreground text-base leading-relaxed max-w-3xl">
          {book.summary || "No synopsis available for this issue."}
        </p>

        {/* Additional Details */}
        <div className="mt-10 grid grid-cols-2 md:grid-cols-4 gap-6">
          <div className="p-4 bg-card rounded border border-border">
            <span className="block text-xs text-muted-foreground uppercase font-bold mb-1">Publisher</span>
            <span className="text-foreground font-medium">{book.publisher || seriesData.publisher || 'Unknown'}</span>
          </div>
          <div className="p-4 bg-card rounded border border-border">
            <span className="block text-xs text-muted-foreground uppercase font-bold mb-1">Issue Number</span>
            <span className="text-foreground font-medium">#{book.number || '?'}</span>
          </div>
          <div className="p-4 bg-card rounded border border-border">
            <span className="block text-xs text-muted-foreground uppercase font-bold mb-1">File Size</span>
            <span className="text-foreground font-medium">{book.file_size ? `${(book.file_size / 1024 / 1024).toFixed(1)} MB` : 'Unknown'}</span>
          </div>
          <div className="p-4 bg-card rounded border border-border">
            <span className="block text-xs text-muted-foreground uppercase font-bold mb-1">Format</span>
            <span className="text-foreground font-medium">{book.file_path?.split('.').pop()?.toUpperCase() || 'Unknown'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
