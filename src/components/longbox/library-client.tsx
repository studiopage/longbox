'use client';

import { useState, useMemo } from 'react';
import { LibraryNav } from './library-nav';
import { SeriesGridCard } from './series-grid-card';
import { GridCard } from './grid-card';
import { EmptyState } from './empty-state';
import { Library, Book, SearchX } from 'lucide-react';

interface SeriesItem {
  id: string;
  name: string | null;
  publisher: string | null;
  year: number | null;
  thumbnail: string | null;
  bookCount: number;
  firstBookId?: string | null;
}

interface BookItem {
  id: string;
  title: string;
  number: string | null;
  seriesId: string;
  seriesName: string | null;
}

interface LibraryClientProps {
  series: SeriesItem[];
  books: BookItem[];
}

const ITEMS_PER_PAGE = 24;

export function LibraryClient({ series, books }: LibraryClientProps) {
  const [viewMode, setViewMode] = useState<'series' | 'books'>('series');
  const [letterFilter, setLetterFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);

  // Filter items based on letter
  const filteredItems = useMemo(() => {
    const items = viewMode === 'series' ? series : books;

    if (letterFilter === 'ALL') {
      return items;
    }

    return items.filter((item) => {
      const name = viewMode === 'series'
        ? (item as SeriesItem).name
        : (item as BookItem).title;

      if (!name) return letterFilter === '#';

      const firstChar = name.charAt(0).toUpperCase();

      if (letterFilter === '#') {
        // Match numbers and special characters
        return !/[A-Z]/i.test(firstChar);
      }

      return firstChar === letterFilter;
    });
  }, [viewMode, series, books, letterFilter]);

  // Calculate pagination
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  // Reset page when filter changes
  const handleLetterFilterChange = (letter: string) => {
    setLetterFilter(letter);
    setCurrentPage(1);
  };

  const handleViewModeChange = (mode: 'series' | 'books') => {
    setViewMode(mode);
    setLetterFilter('ALL');
    setCurrentPage(1);
  };

  const isEmpty = series.length === 0 && books.length === 0;
  const noFilterResults = !isEmpty && filteredItems.length === 0;

  return (
    <div className="space-y-6">
      <LibraryNav
        totalSeries={series.length}
        totalBooks={books.length}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
        letterFilter={letterFilter}
        onLetterFilterChange={handleLetterFilterChange}
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={setCurrentPage}
        itemsPerPage={ITEMS_PER_PAGE}
      />

      {isEmpty ? (
        <EmptyState
          icon={Library}
          title="Your library is empty"
          description={
            <>
              Add files to your <code className="bg-secondary px-2 py-1 rounded text-xs">comics</code> folder to get started.
            </>
          }
        />
      ) : noFilterResults ? (
        <EmptyState
          icon={SearchX}
          title={`No ${viewMode} starting with "${letterFilter}"`}
          description="Try selecting a different letter filter above."
        />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {viewMode === 'series' ? (
            (paginatedItems as SeriesItem[]).map((s) => (
              <SeriesGridCard key={s.id} series={s} />
            ))
          ) : (
            (paginatedItems as BookItem[]).map((book) => (
              <GridCard
                key={book.id}
                href={`/series/${book.seriesId}/issue/${book.id}`}
                imageUrl={`/api/cover/${book.id}`}
                title={book.title}
                subtitle={book.seriesName || 'Unknown Series'}
                badge={book.number ? { text: `#${book.number}` } : undefined}
              />
            ))
          )}
        </div>
      )}

      {/* Bottom pagination for convenience */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-border">
          <span className="text-sm text-muted-foreground">
            Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length}
          </span>
          <span className="text-sm text-muted-foreground">
            Page {currentPage} of {totalPages}
          </span>
        </div>
      )}
    </div>
  );
}
