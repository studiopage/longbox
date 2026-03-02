'use client';

import Link from 'next/link';
import { Star } from 'lucide-react';
import { type Character, calculatePowerLevel } from '@/lib/superhero-api';

interface CharacterCardProps {
  character: Character;
  isFavorited?: boolean;
}

export function CharacterCard({ character, isFavorited = false }: CharacterCardProps) {
  const powerLevel = calculatePowerLevel(character.powerstats);
  const alignmentColor = character.biography.alignment === 'good'
    ? 'text-green-500'
    : character.biography.alignment === 'bad'
      ? 'text-red-500'
      : 'text-muted-foreground';

  return (
    <Link
      href={`/discover/characters/${character.id}`}
      className="group relative flex flex-col gap-3"
    >
      {/* Character Image */}
      <div className="aspect-square bg-card rounded border border-border overflow-hidden group-hover:border-border/60 transition-all duration-200 ease-out relative">
        <img
          src={character.images.md}
          alt={character.name}
          className="w-full h-full object-cover object-top"
          loading="lazy"
        />
        {/* Favorite Badge */}
        {isFavorited && (
          <div className="absolute top-2 left-2 rounded-full bg-primary/15 border border-primary/30 p-1.5">
            <Star className="w-3 h-3 text-primary fill-current" />
          </div>
        )}
        {/* Power Level Badge */}
        <div className="absolute top-2 right-2 rounded border border-border bg-background/85 px-3 py-1 text-xs font-medium text-foreground">
          PWR {powerLevel}
        </div>
        {/* Alignment Badge */}
        <div className={`absolute bottom-2 left-2 rounded border border-border bg-background/85 px-3 py-1 text-xs font-medium capitalize ${alignmentColor}`}>
          {character.biography.alignment}
        </div>
      </div>

      {/* Character Info */}
      <div>
        <h3 className="text-foreground font-medium leading-tight truncate group-hover:text-primary transition duration-200 ease-out">
          {character.name}
        </h3>
        <p className="text-muted-foreground text-xs mt-1 truncate">
          {character.biography.publisher || 'Unknown'} • {character.biography.firstAppearance || 'Unknown'}
        </p>
      </div>
    </Link>
  );
}
