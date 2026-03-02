'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Star, Users, ChevronRight } from 'lucide-react';
import { getFavoriteCharacters, type FavoriteCharacter } from '@/actions/favorites';

export function FavoriteCharacters() {
  const [favorites, setFavorites] = useState<FavoriteCharacter[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getFavoriteCharacters().then(data => {
      setFavorites(data);
      setLoading(false);
    });
  }, []);

  // Don't render section if no favorites
  if (!loading && favorites.length === 0) {
    return null;
  }

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
          <Star className="w-5 h-5 text-primary" />
          Favorite Characters
        </h2>
        <Link
          href="/discover/characters"
          className="text-sm text-muted-foreground hover:text-foreground flex items-center gap-1 transition-colors"
        >
          View All
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      {loading ? (
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="shrink-0 w-24 animate-pulse">
              <div className="w-24 h-24 bg-muted rounded-full" />
              <div className="mt-2 h-4 bg-muted rounded w-16 mx-auto" />
            </div>
          ))}
        </div>
      ) : (
        <div className="flex gap-4 overflow-x-auto pb-2 -mx-2 px-2 scrollbar-thin scrollbar-thumb-muted">
          {favorites.map((fav) => (
            <Link
              key={fav.id}
              href={`/discover/characters/${fav.characterId}`}
              className="group shrink-0 flex flex-col items-center"
            >
              <div className="relative">
                <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-primary/30 group-hover:border-primary transition-colors bg-card">
                  {fav.characterImage ? (
                    <img
                      src={fav.characterImage}
                      alt={fav.characterName}
                      className="w-full h-full object-cover object-top"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Users className="w-8 h-8 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 bg-primary/20 border border-primary/30 rounded-full p-1">
                  <Star className="w-3 h-3 text-primary fill-current" />
                </div>
              </div>
              <span className="mt-2 text-xs text-foreground font-medium text-center truncate w-20 group-hover:text-primary transition-colors">
                {fav.characterName}
              </span>
              {fav.characterPublisher && (
                <span className="text-[10px] text-muted-foreground truncate w-20 text-center">
                  {fav.characterPublisher}
                </span>
              )}
            </Link>
          ))}

          {/* Add More Button */}
          <Link
            href="/discover/characters"
            className="shrink-0 flex flex-col items-center justify-center"
          >
            <div className="w-20 h-20 rounded-full border-2 border-dashed border-border flex items-center justify-center group-hover:border-muted-foreground transition-colors bg-card/50">
              <Users className="w-6 h-6 text-muted-foreground" />
            </div>
            <span className="mt-2 text-xs text-muted-foreground text-center">
              Discover More
            </span>
          </Link>
        </div>
      )}
    </section>
  );
}
