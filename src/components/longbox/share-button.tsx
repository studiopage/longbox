'use client';

import { useState, useEffect } from 'react';
import { Share2, Check, Link as LinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface ShareButtonProps {
  title: string;
  url?: string;
  className?: string;
}

export function ShareButton({ title, url, className }: ShareButtonProps) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);

  // Check for Web Share API support on client only
  useEffect(() => {
    setCanShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function');
  }, []);

  const getShareUrl = () => {
    return url || (typeof window !== 'undefined' ? window.location.href : '');
  };

  const handleShare = async () => {
    const shareUrl = getShareUrl();

    // Try native Web Share API first
    if (canShare && navigator.share) {
      try {
        await navigator.share({
          title,
          url: shareUrl,
        });
        return;
      } catch (error) {
        // User cancelled or API failed, fall through to copy
        if ((error as Error).name !== 'AbortError') {
          console.error('Share failed:', error);
        }
      }
    }

    // Fallback: copy to clipboard
    await copyToClipboard();
  };

  const copyToClipboard = async () => {
    try {
      const shareUrl = getShareUrl();
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => {
        setCopied(false);
        setOpen(false);
      }, 1500);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  // On mobile/devices with Web Share API, use direct share (no popover needed)
  if (canShare) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={handleShare}
        className={cn('text-muted-foreground hover:text-foreground', className)}
        title="Share"
      >
        <Share2 className="w-5 h-5" />
      </Button>
    );
  }

  // On desktop or before hydration, show popover with copy link option
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn('text-muted-foreground hover:text-foreground', className)}
          title="Share"
        >
          <Share2 className="w-5 h-5" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 p-1 bg-card border-border" align="end">
        <div className="flex flex-col">
          <button
            onClick={copyToClipboard}
            className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground rounded transition-colors w-full text-left"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-primary/70" />
                <span className="text-primary/70">Copied!</span>
              </>
            ) : (
              <>
                <LinkIcon className="w-4 h-4" />
                Copy Link
              </>
            )}
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
