'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toggleFavoriteSeries } from '@/actions/favorites';
import { cn } from '@/lib/utils';

interface FavoriteSeriesButtonProps {
  seriesId: string;
  initialFavorited: boolean;
  variant?: 'ghost' | 'outline' | 'default';
  size?: 'sm' | 'default' | 'lg' | 'icon';
  className?: string;
}

export function FavoriteSeriesButton({
  seriesId,
  initialFavorited,
  variant = 'ghost',
  size = 'icon',
  className,
}: FavoriteSeriesButtonProps) {
  const [isFavorited, setIsFavorited] = useState(initialFavorited);
  const [isLoading, setIsLoading] = useState(false);

  const handleToggle = async () => {
    setIsLoading(true);
    try {
      const result = await toggleFavoriteSeries(seriesId);
      if (result.success) {
        setIsFavorited(result.isFavorited);
      }
    } catch (error) {
      console.error('Failed to toggle favorite:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      disabled={isLoading}
      className={cn(
        'transition-colors',
        isFavorited ? 'text-destructive hover:text-destructive/80' : 'text-muted-foreground hover:text-destructive',
        className
      )}
    >
      <Heart className={cn('w-5 h-5', isFavorited && 'fill-current')} />
    </Button>
  );
}
