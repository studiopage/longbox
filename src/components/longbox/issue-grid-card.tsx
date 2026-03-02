import Link from 'next/link';

interface IssueGridCardProps {
  book: {
    id: string;
    title: string | null;
    number: string | null;
    page_count: number | null;
  };
  seriesId: string;
}

export function IssueGridCard({ book, seriesId }: IssueGridCardProps) {
  return (
    <Link
      href={`/discover/issue/${book.id}`}
      className="group space-y-3 cursor-pointer"
    >
      {/* Thumbnail */}
      <div className="relative aspect-[2/3] bg-card rounded border border-border overflow-hidden group-hover:border-border/60 transition-all duration-200 ease-out">
        <img
          src={`/api/cover/${book.id}`}
          alt={book.title || `Issue #${book.number}`}
          className="w-full h-full object-cover"
          loading="lazy"
        />
      </div>

      {/* Info */}
      <div>
        <h3 className="font-bold text-foreground truncate group-hover:text-primary transition duration-200 ease-out">
          {book.title || `Issue #${book.number}`}
        </h3>
        <div className="flex justify-between text-xs text-muted-foreground mt-1">
          <span>#{book.number}</span>
          <span>{book.page_count} Pages</span>
        </div>
      </div>
    </Link>
  );
}
