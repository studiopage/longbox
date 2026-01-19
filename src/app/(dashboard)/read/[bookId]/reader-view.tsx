'use client';

import { useEffect, useRef } from 'react';
import { updateProgress } from './actions'; // Ensure this points to the file created in Step 1

interface ReaderViewProps {
  bookId: string;
  pageCount: number;
  initialPage: number;
}

export default function ReaderView({ bookId, pageCount, initialPage }: ReaderViewProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Restore Position on Load
  useEffect(() => {
    if (initialPage > 1) {
      // Small timeout ensures the DOM is ready
      setTimeout(() => {
        const element = document.getElementById(`page-${initialPage}`);
        if (element) {
          element.scrollIntoView({ behavior: 'instant', block: 'start' });
        }
      }, 100);
    }
  }, [initialPage]);

  // 2. Track Scrolling
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    
    // Calculate current page based on scroll position
    const scrollPosition = container.scrollTop;
    const totalHeight = container.scrollHeight;
    const avgPageHeight = totalHeight / pageCount;
    
    // Math: Which page is in the middle of the screen?
    const currentPage = Math.floor((scrollPosition + (window.innerHeight / 3)) / avgPageHeight) + 1;
    const safePage = Math.max(1, Math.min(currentPage, pageCount));

    // 3. Debounce (Don't spam the server)
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    
    // Wait 1 second after you stop scrolling to save
    timeoutRef.current = setTimeout(() => {
      console.log(`[READER] Saving progress: Page ${safePage}`);
      updateProgress(bookId, safePage, pageCount);
    }, 1000);
  };

  return (
    <div 
      className="h-screen bg-black overflow-y-auto flex flex-col items-center"
      onScroll={handleScroll}
    >
      {Array.from({ length: pageCount }).map((_, i) => (
        <img
          id={`page-${i + 1}`}
          key={i}
          src={`/api/v1/books/${bookId}/pages/${i + 1}`}
          alt={`Page ${i + 1}`}
          loading="lazy"
          className="max-w-3xl w-full shadow-2xl mb-2 min-h-[500px] bg-zinc-900"
        />
      ))}
      
      <div className="text-zinc-500 py-20 text-sm">End of Book</div>
    </div>
  );
}

