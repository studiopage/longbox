import Link from 'next/link';
import { Book } from 'lucide-react';

interface SeriesGridCardProps {
  series: {
    id: string;
    name: string | null;
    publisher: string | null;
    year: number | null;
    thumbnail: string | null;
    bookCount: number;
    firstBookId?: string | null;
  };
}

export function SeriesGridCard({ series }: SeriesGridCardProps) {
  // Use ComicVine thumbnail if available, otherwise use first book's cover
  const coverUrl = series.thumbnail || (series.firstBookId ? `/api/cover/${series.firstBookId}` : null);

  return (
    <Link
      href={`/series/${series.id}`}
      className="group relative flex flex-col gap-3"
    >
      {/* Poster Card */}
      <div className="aspect-[2/3] bg-card rounded border border-border overflow-hidden group-hover:border-border/60 transition-all duration-200 ease-out relative">
        {coverUrl ? (
          <img
            src={coverUrl}
            alt={series.name || 'Series cover'}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground gap-2 bg-card">
            <Book className="w-8 h-8" />
          </div>
        )}
      </div>

      {/* Badge - Pill Style (positioned over image) */}
      <div className="absolute top-2 right-2 rounded bg-background/85 border border-border px-3 py-1 text-xs font-medium text-foreground">
        {series.bookCount}
      </div>

      {/* Text Info */}
      <div>
        <h3 className="text-foreground font-medium leading-tight truncate group-hover:text-primary transition duration-200 ease-out">
          {series.name || 'Unknown Series'}
        </h3>
        <p className="text-muted-foreground text-xs mt-1">
          {series.publisher || 'Unknown'} • {series.year || '----'}
        </p>
      </div>
    </Link>
  );
}
