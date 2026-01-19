'use client'

import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, MoreHorizontal } from 'lucide-react';

export function PaginationBar({ hasResults }: { hasResults: boolean }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const currentPage = Number(searchParams.get('page')) || 1;

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('page', newPage.toString());
    router.push(`/discovery?${params.toString()}`);
  };

  // Logic to generate page numbers
  // We want to show 5 pages at a time.
  // If Page 1: [1] 2 3 4 5 ...
  // If Page 6: ... 4 5 [6] 7 8 ...
  
  const getPageNumbers = () => {
    let start = Math.max(1, currentPage - 2);
    let end = start + 4;
    
    // Adjust start if end is too small (e.g. at page 1, start is 1, end is 5)
    // If we were near the start, ensure we always show at least 5
    if (currentPage < 3) {
      start = 1;
      end = 5;
    }
    
    return Array.from({ length: (end - start) + 1 }, (_, i) => start + i);
  };

  const pages = getPageNumbers();

  return (
    <div className="flex items-center justify-center gap-2 py-8 mt-6 border-t">
      {/* PREV BUTTON */}
      <Button
        variant="outline"
        size="icon"
        disabled={currentPage <= 1}
        onClick={() => handlePageChange(currentPage - 1)}
        className="mr-2"
      >
        <ChevronLeft className="w-4 h-4" />
      </Button>

      {/* START ELLIPSIS (If we are far past page 1) */}
      {pages[0] > 1 && (
        <>
            <Button variant="ghost" size="icon" onClick={() => handlePageChange(1)}>1</Button>
            <span className="text-muted-foreground"><MoreHorizontal className="w-4 h-4" /></span>
        </>
      )}

      {/* PAGE NUMBER BUTTONS */}
      {pages.map((p) => (
        <Button
          key={p}
          variant={p === currentPage ? "default" : "ghost"}
          size="icon"
          onClick={() => handlePageChange(p)}
          className={p === currentPage ? "pointer-events-none" : ""}
        >
          {p}
        </Button>
      ))}

      {/* END ELLIPSIS & NEXT (Always assume there are more pages for now) */}
      {hasResults && (
         <>
            <span className="text-muted-foreground"><MoreHorizontal className="w-4 h-4" /></span>
         </>
      )}

      {/* NEXT BUTTON */}
      <Button
        variant="outline"
        size="icon"
        disabled={!hasResults}
        onClick={() => handlePageChange(currentPage + 1)}
        className="ml-2"
      >
        <ChevronRight className="w-4 h-4" />
      </Button>
    </div>
  );
}
