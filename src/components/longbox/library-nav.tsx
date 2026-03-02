'use client';

import { useState, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Library, Book } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LibraryNavProps {
  totalSeries: number;
  totalBooks: number;
  viewMode: 'series' | 'books';
  onViewModeChange: (mode: 'series' | 'books') => void;
  letterFilter: string;
  onLetterFilterChange: (letter: string) => void;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
}

const ALPHABET = ['ALL', '#', ...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')];

export function LibraryNav({
  totalSeries,
  totalBooks,
  viewMode,
  onViewModeChange,
  letterFilter,
  onLetterFilterChange,
  currentPage,
  totalPages,
  onPageChange,
  itemsPerPage,
}: LibraryNavProps) {
  // Generate visible page numbers
  const getVisiblePages = useCallback(() => {
    const pages: (number | 'ellipsis')[] = [];
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    // Always show first page
    pages.push(1);

    if (currentPage > 3) {
      pages.push('ellipsis');
    }

    // Show pages around current
    const start = Math.max(2, currentPage - 1);
    const end = Math.min(totalPages - 1, currentPage + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (currentPage < totalPages - 2) {
      pages.push('ellipsis');
    }

    // Always show last page
    if (totalPages > 1) {
      pages.push(totalPages);
    }

    return pages;
  }, [currentPage, totalPages]);

  const visiblePages = getVisiblePages();

  return (
    <div className="space-y-4">
      {/* Top row: View toggle + Stats */}
      <div className="flex items-center justify-between">
        {/* View Mode Toggle */}
        <div className="flex items-center bg-secondary rounded p-1">
          <button
            onClick={() => onViewModeChange('series')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors',
              viewMode === 'series'
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Library className="w-4 h-4" />
            Series
          </button>
          <button
            onClick={() => onViewModeChange('books')}
            className={cn(
              'flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-colors',
              viewMode === 'books'
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Book className="w-4 h-4" />
            Books
          </button>
        </div>

        {/* Stats Badges */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded">
            <Library className="w-4 h-4 text-primary" />
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{totalSeries}</span> Series
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-secondary rounded">
            <Book className="w-4 h-4 text-primary/70" />
            <span className="text-sm text-muted-foreground">
              <span className="font-semibold text-foreground">{totalBooks}</span> Books
            </span>
          </div>
        </div>
      </div>

      {/* Alphabet Filter */}
      <div className="flex items-center gap-1 overflow-x-auto pb-2 scrollbar-hide">
        {ALPHABET.map((letter) => (
          <button
            key={letter}
            onClick={() => onLetterFilterChange(letter)}
            className={cn(
              'min-w-[32px] h-8 px-2 rounded text-sm font-medium transition-colors',
              letterFilter === letter
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            {letter}
          </button>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded transition-colors',
              currentPage === 1
                ? 'text-muted-foreground/50 cursor-not-allowed'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {visiblePages.map((page, index) =>
            page === 'ellipsis' ? (
              <span key={`ellipsis-${index}`} className="w-8 h-8 flex items-center justify-center text-muted-foreground/70">
                ...
              </span>
            ) : (
              <button
                key={page}
                onClick={() => onPageChange(page)}
                className={cn(
                  'w-8 h-8 flex items-center justify-center rounded text-sm font-medium transition-colors',
                  currentPage === page
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                )}
              >
                {page}
              </button>
            )
          )}

          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={cn(
              'w-8 h-8 flex items-center justify-center rounded transition-colors',
              currentPage === totalPages
                ? 'text-muted-foreground/50 cursor-not-allowed'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground'
            )}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
