'use client';

import { useState, useEffect } from 'react';
import { MoreHorizontal, BookOpen, CheckCircle2, RotateCcw, Info, FolderPlus, ListPlus, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { toggleBookReadStatus } from '@/actions/reading';
import { addToReadingList, removeFromReadingList, isInReadingList } from '@/actions/reading-list';
import { getBookCollections } from '@/actions/collections';
import { CollectionPicker } from './collection-picker';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface IssueOptionsMenuProps {
  bookId: string;
  seriesId: string;
  isCompleted: boolean;
  totalPages: number;
  className?: string;
}

export function IssueOptionsMenu({
  bookId,
  seriesId,
  isCompleted,
  totalPages,
  className,
}: IssueOptionsMenuProps) {
  const [open, setOpen] = useState(false);
  const [completed, setCompleted] = useState(isCompleted);
  const [isLoading, setIsLoading] = useState(false);
  const [inReadingList, setInReadingList] = useState(false);
  const [readingListLoading, setReadingListLoading] = useState(false);
  const [collectionPickerOpen, setCollectionPickerOpen] = useState(false);
  const [bookCollectionIds, setBookCollectionIds] = useState<string[]>([]);

  // Check reading list status when menu opens
  useEffect(() => {
    if (open) {
      isInReadingList(bookId).then(setInReadingList);
      getBookCollections(bookId).then(setBookCollectionIds);
    }
  }, [open, bookId]);

  const handleToggleRead = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsLoading(true);
    try {
      const result = await toggleBookReadStatus(bookId, completed, totalPages);
      if (result.success) {
        setCompleted(result.isCompleted);
      }
    } catch (error) {
      console.error('Failed to toggle read status:', error);
    } finally {
      setIsLoading(false);
      setOpen(false);
    }
  };

  const handleToggleReadingList = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setReadingListLoading(true);
    try {
      if (inReadingList) {
        const result = await removeFromReadingList(bookId);
        if (result.success) {
          setInReadingList(false);
        }
      } else {
        const result = await addToReadingList(bookId);
        if (result.success) {
          setInReadingList(true);
        }
      }
    } catch (error) {
      console.error('Failed to toggle reading list:', error);
    } finally {
      setReadingListLoading(false);
      setOpen(false);
    }
  };

  const handleOpenCollectionPicker = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
    setTimeout(() => setCollectionPickerOpen(true), 100);
  };

  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            className={cn(
              'w-6 h-6 rounded-full bg-secondary hover:bg-accent flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors',
              className
            )}
          >
            <MoreHorizontal className="w-3 h-3" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          className="w-52 p-1 bg-card border-border"
          align="start"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex flex-col">
            <Link
              href={`/read/${bookId}`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground rounded transition-colors"
              onClick={() => setOpen(false)}
            >
              <BookOpen className="w-4 h-4" />
              Read Now
            </Link>

            <Link
              href={`/series/${seriesId}/issue/${bookId}`}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground rounded transition-colors"
              onClick={() => setOpen(false)}
            >
              <Info className="w-4 h-4" />
              View Details
            </Link>

            <div className="h-px bg-border my-1" />

            <button
              onClick={handleToggleRead}
              disabled={isLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground rounded transition-colors w-full text-left disabled:opacity-50"
            >
              {completed ? (
                <>
                  <RotateCcw className="w-4 h-4" />
                  Mark as Unread
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  Mark as Read
                </>
              )}
            </button>

            <div className="h-px bg-border my-1" />

            <button
              onClick={handleToggleReadingList}
              disabled={readingListLoading}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground rounded transition-colors w-full text-left disabled:opacity-50"
            >
              {inReadingList ? (
                <>
                  <Check className="w-4 h-4 text-primary/70" />
                  <span>In Reading List</span>
                </>
              ) : (
                <>
                  <ListPlus className="w-4 h-4" />
                  Add to Reading List
                </>
              )}
            </button>

            <button
              onClick={handleOpenCollectionPicker}
              className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground rounded transition-colors w-full text-left"
            >
              <FolderPlus className="w-4 h-4" />
              Add to Collection
            </button>
          </div>
        </PopoverContent>
      </Popover>

      <CollectionPicker
        open={collectionPickerOpen}
        onClose={() => setCollectionPickerOpen(false)}
        bookId={bookId}
        bookCollectionIds={bookCollectionIds}
        onSuccess={() => {
          getBookCollections(bookId).then(setBookCollectionIds);
        }}
      />
    </>
  );
}
