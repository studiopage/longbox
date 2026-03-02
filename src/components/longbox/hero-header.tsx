import { ReactNode } from 'react';

interface HeroHeaderProps {
  title: string;
  description?: string;
  thumbnail?: string | null;
  metadata?: ReactNode;
  children?: ReactNode;
}

export function HeroHeader({
  title,
  description,
  thumbnail,
  metadata,
  children
}: HeroHeaderProps) {
  return (
    <div className="relative w-full h-[40vh] min-h-[300px] overflow-hidden">
      {/* Solid Background */}
      <div className="absolute inset-0 bg-muted" />

      {/* Content Container */}
      <div className="relative z-10 h-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col justify-end pb-8 md:pb-12">
        <div className="flex gap-4 md:gap-8 items-end">
          {/* Poster Card - hidden on mobile */}
          {thumbnail && (
            <div className="hidden md:block w-32 md:w-48 aspect-[2/3] rounded shadow-lg overflow-hidden border border-border flex-shrink-0">
              <img
                src={thumbnail || '/placeholder.png'}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Text Info */}
          <div className="space-y-3 md:space-y-4 max-w-3xl flex-1">
            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-none">
              {title}
            </h1>

            {/* Metadata Row */}
            {metadata && (
              <div className="flex items-center gap-4 md:gap-6 text-xs md:text-sm font-bold text-muted-foreground flex-wrap">
                {metadata}
              </div>
            )}

            {/* Description */}
            {description && (
              <p className="text-sm md:text-lg text-muted-foreground line-clamp-2 md:line-clamp-3 max-w-2xl">
                {description}
              </p>
            )}

            {/* Additional Children */}
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
