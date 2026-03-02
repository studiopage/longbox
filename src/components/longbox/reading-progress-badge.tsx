'use client';

import { Clock, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ReadingProgressBadgeProps {
  percentage: number;
  isCompleted: boolean;
  page?: number;
  totalPages?: number;
  className?: string;
}

export function ReadingProgressBadge({
  percentage,
  isCompleted,
  page,
  totalPages,
  className
}: ReadingProgressBadgeProps) {
  if (isCompleted) {
    return (
      <div className={cn("text-sm text-primary/70 flex items-center gap-2 font-medium", className)}>
        <CheckCircle2 className="w-4 h-4" />
        <span>Completed</span>
      </div>
    );
  }

  if (percentage === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground flex items-center gap-2", className)}>
        <Clock className="w-4 h-4" />
        <span>Not started</span>
      </div>
    );
  }

  return (
    <div className={cn("text-sm text-primary flex items-center gap-2", className)}>
      <Clock className="w-4 h-4" />
      <span>{percentage}% Complete</span>
      {page && totalPages && (
        <span className="text-muted-foreground">
          (Page {page}/{totalPages})
        </span>
      )}
    </div>
  );
}
