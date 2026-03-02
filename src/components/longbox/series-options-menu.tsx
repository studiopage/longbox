'use client';

import { useState } from 'react';
import { MoreHorizontal, CheckCircle2, RotateCcw, RefreshCw, Trash2 } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SeriesOptionsMenuProps {
  seriesId: string;
  className?: string;
}

export function SeriesOptionsMenu({ seriesId, className }: SeriesOptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleMarkAllRead = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement mark all as read action
      console.log('Mark all as read:', seriesId);
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  const handleMarkAllUnread = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement mark all as unread action
      console.log('Mark all as unread:', seriesId);
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  const handleRefreshMetadata = async () => {
    setIsLoading(true);
    try {
      // TODO: Implement refresh metadata action
      console.log('Refresh metadata:', seriesId);
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="icon"
          className={cn(
            'rounded-full border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground',
            className
          )}
        >
          <MoreHorizontal className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-52 p-1 bg-card border-border" align="start">
        <div className="flex flex-col">
          <button
            onClick={handleMarkAllRead}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground rounded transition-colors w-full text-left disabled:opacity-50"
          >
            <CheckCircle2 className="w-4 h-4" />
            Mark All as Read
          </button>

          <button
            onClick={handleMarkAllUnread}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground rounded transition-colors w-full text-left disabled:opacity-50"
          >
            <RotateCcw className="w-4 h-4" />
            Mark All as Unread
          </button>

          <div className="h-px bg-border my-1" />

          <button
            onClick={handleRefreshMetadata}
            disabled={isLoading}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground rounded transition-colors w-full text-left disabled:opacity-50"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh Metadata
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
