'use client';

import { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { toggleBookReadStatus } from '@/actions/reading';
import { cn } from '@/lib/utils';

interface MarkAsReadButtonProps {
  bookId: string;
  initialCompleted: boolean;
  totalPages: number;
  className?: string;
}

export function MarkAsReadButton({
  bookId,
  initialCompleted,
  totalPages,
  className,
}: MarkAsReadButtonProps) {
  const [isCompleted, setIsCompleted] = useState(initialCompleted);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    try {
      const result = await toggleBookReadStatus(bookId, isCompleted, totalPages);
      if (result.success) {
        setIsCompleted(result.isCompleted);
      }
    } catch (error) {
      console.error('Failed to toggle read status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        'w-6 h-6 rounded-full flex items-center justify-center transition-colors',
        isCompleted
          ? 'bg-primary/20 text-primary/70'
          : 'bg-secondary hover:bg-accent text-muted-foreground hover:text-primary/70',
        isLoading && 'opacity-50 cursor-not-allowed',
        className
      )}
      title={isCompleted ? 'Mark as unread' : 'Mark as read'}
    >
      <CheckCircle2 className="w-3 h-3" />
    </button>
  );
}
