import Link from 'next/link';
import { Book, ImageOff } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ReactNode } from 'react';

interface GridCardProps {
  href: string;
  imageUrl: string | null;
  title: string;
  subtitle?: string;
  badge?: {
    text: string | number;
    variant?: 'default' | 'secondary' | 'outline' | 'destructive';
    className?: string;
  };
  overlay?: ReactNode;
  meta?: string;
  className?: string;
}

/**
 * Unified grid card component for series and issues
 * Provides consistent styling across the application
 */
export function GridCard({
  href,
  imageUrl,
  title,
  subtitle,
  badge,
  overlay,
  meta,
  className,
}: GridCardProps) {
  return (
    <Link
      href={href}
      className={cn('group relative flex flex-col gap-3', className)}
    >
      {/* Poster/Cover */}
      <div className="aspect-[2/3] bg-card rounded border border-border overflow-hidden group-hover:border-primary/30 transition-all duration-200 group-hover:scale-[1.02]">
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={title}
            className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-200"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2">
            <Book className="w-8 h-8" />
          </div>
        )}

        {/* Badge (top-right) */}
        {badge && (
          <div className="absolute top-2 right-2">
            <Badge
              variant={badge.variant || 'default'}
              className={cn(
                'bg-background/85 text-foreground text-xs font-bold border border-border rounded',
                badge.className
              )}
            >
              {badge.text}
            </Badge>
          </div>
        )}

        {/* Optional Overlay (for custom badges, progress indicators, etc.) */}
        {overlay}
      </div>

      {/* Text Info */}
      <div>
        <h3 className="text-foreground font-medium leading-tight truncate group-hover:text-primary transition">
          {title}
        </h3>
        {(subtitle || meta) && (
          <div className="flex justify-between items-center text-xs text-muted-foreground mt-1">
            {subtitle && <span className="truncate">{subtitle}</span>}
            {meta && <span className="shrink-0 ml-2">{meta}</span>}
          </div>
        )}
      </div>
    </Link>
  );
}

// Specialized wrapper for series cards
interface SeriesCardData {
  id: string;
  name: string | null;
  publisher: string | null;
  year: number | null;
  thumbnail: string | null;
  bookCount: number;
  firstBookId?: string | null;
}

export function SeriesGridCardNew({ series }: { series: SeriesCardData }) {
  const coverUrl = series.thumbnail || (series.firstBookId ? `/api/cover/${series.firstBookId}` : null);

  return (
    <GridCard
      href={`/series/${series.id}`}
      imageUrl={coverUrl}
      title={series.name || 'Unknown Series'}
      subtitle={`${series.publisher || 'Unknown'} • ${series.year || '----'}`}
      badge={{ text: series.bookCount }}
    />
  );
}

// Specialized wrapper for issue cards
interface IssueCardData {
  id: string;
  title: string | null;
  number: string | null;
  page_count: number | null;
}

export function IssueGridCardNew({ book, seriesId }: { book: IssueCardData; seriesId: string }) {
  return (
    <GridCard
      href={`/series/${seriesId}/issue/${book.id}`}
      imageUrl={`/api/cover/${book.id}`}
      title={book.title || `Issue #${book.number}`}
      subtitle={`#${book.number}`}
      meta={book.page_count ? `${book.page_count} Pages` : undefined}
    />
  );
}
