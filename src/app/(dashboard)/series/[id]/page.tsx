export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Calendar,
  Library,
  BookOpen,
  Play,
  CheckCircle2,
  ImageOff,
} from 'lucide-react';
import { getSeriesPageData, type SeriesPageData } from '@/lib/data/series-page';
import { FavoriteSeriesButton } from '@/components/longbox/favorite-series-button';
import { SeriesOptionsMenu } from '@/components/longbox/series-options-menu';
import { ShareButton } from '@/components/longbox/share-button';
import { MarkAsReadButton } from '@/components/longbox/mark-as-read-button';
import { IssueOptionsMenu } from '@/components/longbox/issue-options-menu';
import { SyncIssuesButton } from '@/components/longbox/sync-issues-button';
import { ImportButton } from '@/components/longbox/import-button';
import { RequestAllMissingButton, RequestIssueButton } from '@/components/longbox/request-missing-button';

export default async function SeriesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getSeriesPageData(id);

  if (!data) return notFound();

  const coverUrl = data.thumbnailUrl || (data.hasBooks ? `/api/cover/${data.books[0]?.id}` : null);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Link href={data.context === 'discovery' ? '/discovery' : '/library'}>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground -ml-3">
            <ArrowLeft className="w-4 h-4 mr-1" />
            {data.context === 'discovery' ? 'Back to Discovery' : 'Library'}
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <ActionButtons data={data} />
        </div>
      </div>

      {/* Series Info Header */}
      <div className="flex gap-6 items-start">
        {/* Cover */}
        {coverUrl && (
          <div className="hidden md:block w-40 flex-shrink-0">
            <div className="aspect-[2/3] rounded overflow-hidden border border-border">
              <img
                src={coverUrl}
                alt={data.name || 'Series cover'}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Title & Meta */}
        <div className="flex-1 min-w-0 space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-primary font-semibold uppercase tracking-wide">
              {data.publisher || 'Unknown Publisher'}
            </span>
            {data.year && (
              <>
                <span className="text-muted-foreground">•</span>
                <span className="text-muted-foreground flex items-center">
                  <Calendar className="w-4 h-4 mr-1" /> {data.year}
                </span>
              </>
            )}
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground">{data.totalIssueCount} Issues</span>
          </div>

          <h1 className="text-3xl font-black text-foreground tracking-tight">
            {data.name}
          </h1>

          {/* Stats / Status */}
          <div className="flex items-center gap-6">
            {data.isInLibrary ? (
              <>
                <div className="flex items-center gap-2">
                  <Library className="w-4 h-4 text-primary" />
                  <span className="text-primary font-bold">{data.ownedCount}</span>
                  <span className="text-muted-foreground text-sm">Collected</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-primary/70" />
                  <span className="text-primary/70 font-bold">{data.readCount}</span>
                  <span className="text-muted-foreground text-sm">Read</span>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <Library className="w-4 h-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  This series is <strong className="text-foreground">not in your library</strong>
                </span>
              </div>
            )}
          </div>

          {/* Synopsis */}
          {data.description && (
            <p className="text-muted-foreground text-sm leading-relaxed max-w-2xl line-clamp-3">
              {data.description}
            </p>
          )}

          {/* Primary CTA */}
          {data.hasBooks && data.books.length > 0 && (
            <Link href={`/read/${data.books[0].id}`}>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground font-semibold">
                <Play className="w-4 h-4 mr-2 fill-current" />
                Start Reading
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* CONTENT */}
      {data.hasBooks ? (
        <OwnedBooksGrid data={data} />
      ) : (
        <IssueGrid data={data} />
      )}
    </div>
  );
}

// ── Action Buttons (context-dependent) ─────────────────────

function ActionButtons({ data }: { data: SeriesPageData }) {
  if (data.context === 'library') {
    return (
      <>
        <FavoriteSeriesButton seriesId={data.localSeriesId!} initialFavorited={data.isFavorited} />
        <ShareButton title={data.name} />
        <SeriesOptionsMenu seriesId={data.localSeriesId!} />
      </>
    );
  }

  if (data.context === 'managed') {
    const missingCount = data.issues.filter(i => i.status === 'missing').length;
    return (
      <>
        <RequestAllMissingButton seriesId={data.localSeriesId!} missingCount={missingCount} />
        <SyncIssuesButton seriesId={data.localSeriesId!} cvId={data.cvId?.toString() || null} />
        <FavoriteSeriesButton seriesId={data.localSeriesId!} initialFavorited={data.isFavorited} />
        <SeriesOptionsMenu seriesId={data.localSeriesId!} />
      </>
    );
  }

  // discovery
  if (data.cvId) {
    return <ImportButton cvId={data.cvId.toString()} />;
  }

  return null;
}

// ── Owned Books Grid (library context) ─────────────────────

function OwnedBooksGrid({ data }: { data: SeriesPageData }) {
  if (data.books.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-lg font-medium text-muted-foreground">No issues in your library</h3>
        <p className="text-muted-foreground mt-1">Scan or import comics to see them here.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
      {data.books.map((book) => (
        <div key={book.id} className="group">
          <Link href={`/series/${data.id}/issue/${book.id}`}>
            <div className="relative aspect-[2/3] rounded overflow-hidden bg-muted mb-3 border border-border group-hover:border-primary/50 transition-all">
              <img
                src={`/api/cover/${book.id}`}
                alt={book.title || `Issue #${book.number}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />

              {/* Hover Overlay */}
              <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-foreground/20 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-foreground" />
                </div>
              </div>

              {/* Issue Number Badge */}
              <div className="absolute top-2 left-2 bg-background/85 rounded px-2 py-0.5 text-xs font-bold text-foreground">
                #{book.number}
              </div>

              {/* Read Badge */}
              {book.isCompleted && (
                <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
                </div>
              )}
            </div>
          </Link>

          {/* Quick Action Icons */}
          <div className="flex items-center gap-1 mb-2">
            <MarkAsReadButton
              bookId={book.id}
              initialCompleted={book.isCompleted}
              totalPages={book.pageCount || 1}
            />
            <IssueOptionsMenu
              bookId={book.id}
              seriesId={data.id}
              isCompleted={book.isCompleted}
              totalPages={book.pageCount || 1}
            />
          </div>

          {/* Issue Info */}
          <div>
            <p className="text-xs text-primary font-medium uppercase tracking-wide">
              {data.publisher || 'Unknown'}
            </p>
            <h3 className="text-sm font-semibold text-foreground truncate">
              {data.name} #{book.number}
            </h3>
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Issue Grid (managed / discovery context) ────────────────

function IssueGrid({ data }: { data: SeriesPageData }) {
  if (data.issues.length === 0) {
    return (
      <div className="text-center py-16">
        <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
        <h3 className="text-lg font-medium text-muted-foreground">No issues found</h3>
        <p className="text-muted-foreground mt-1">
          {data.context === 'managed'
            ? 'Click "Sync Metadata" to fetch issues from ComicVine.'
            : 'No issues available for this series.'}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-5">
      {data.issues.map((issue) => (
        <div key={issue.id} className="group">
          <div className="relative aspect-[2/3] rounded overflow-hidden bg-muted mb-3 border border-border group-hover:border-primary/50 transition-all">
            {issue.thumbnailUrl ? (
              <img
                src={issue.thumbnailUrl}
                alt={issue.title || `Issue #${issue.issueNumber}`}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <ImageOff className="w-8 h-8 text-muted-foreground" />
              </div>
            )}

            {/* Issue Number Badge */}
            <div className="absolute top-2 left-2 bg-background/85 rounded px-2 py-0.5 text-xs font-bold text-foreground border border-border">
              #{issue.issueNumber}
            </div>

            {/* Status Badge */}
            {issue.isRead ? (
              <div className="absolute top-2 right-2 w-6 h-6 rounded-full bg-primary flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-primary-foreground" />
              </div>
            ) : issue.status === 'wanted' ? (
              <div className="absolute top-2 right-2 bg-amber-500/80 rounded px-1.5 py-0.5 text-[10px] font-bold text-black">
                WANTED
              </div>
            ) : null}

            {/* Request Button (hover, missing issues only) */}
            {data.context === 'managed' && (
              <RequestIssueButton issueId={issue.id} status={issue.status} />
            )}
          </div>

          {/* Issue Info */}
          <div>
            <p className="text-xs text-primary font-medium uppercase tracking-wide">
              {data.publisher || 'Unknown'}
            </p>
            <h3 className="text-sm font-semibold text-foreground truncate">
              {data.name} #{issue.issueNumber}
            </h3>
            {issue.coverDate && (
              <p className="text-xs text-muted-foreground mt-0.5">{issue.coverDate}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
