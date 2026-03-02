'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Zap,
  Brain,
  Dumbbell,
  Wind,
  Heart,
  Swords,
  Users,
  MapPin,
  Briefcase,
  Calendar,
  Book,
  ChevronDown,
  ExternalLink,
  Star,
  Ruler,
  Scale,
  Eye as EyeIcon,
  Sparkles,
} from 'lucide-react';
import {
  getCharacterById,
  searchCharacters,
  type Character,
  type Powerstats,
  calculatePowerLevel,
} from '@/lib/superhero-api';
import { getCharacterAppearances, type CharacterAppearance } from './actions';
import { isCharacterFavorited, toggleFavoriteCharacter } from '@/actions/favorites';

type SortOrder = 'newest' | 'oldest' | 'series';

const POWER_STAT_CONFIG: { key: keyof Powerstats; label: string; icon: React.ReactNode }[] = [
  { key: 'intelligence', label: 'Intelligence', icon: <Brain className="w-4 h-4" /> },
  { key: 'strength', label: 'Strength', icon: <Dumbbell className="w-4 h-4" /> },
  { key: 'speed', label: 'Speed', icon: <Wind className="w-4 h-4" /> },
  { key: 'durability', label: 'Durability', icon: <Heart className="w-4 h-4" /> },
  { key: 'power', label: 'Power', icon: <Zap className="w-4 h-4" /> },
  { key: 'combat', label: 'Combat', icon: <Swords className="w-4 h-4" /> },
];

export default function CharacterDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const [character, setCharacter] = useState<Character | null>(null);
  const [loading, setLoading] = useState(true);
  const [appearances, setAppearances] = useState<CharacterAppearance[]>([]);
  const [appearancesLoading, setAppearancesLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<SortOrder>('newest');
  const [relatedCharacters, setRelatedCharacters] = useState<Character[]>([]);
  const [isFavorited, setIsFavorited] = useState(false);
  const [togglingFavorite, setTogglingFavorite] = useState(false);

  useEffect(() => {
    async function loadCharacter() {
      setLoading(true);
      const id = parseInt(resolvedParams.id, 10);
      if (isNaN(id)) {
        setLoading(false);
        return;
      }

      const char = await getCharacterById(id);
      setCharacter(char);
      setLoading(false);

      // Check if character is favorited
      const favorited = await isCharacterFavorited(id);
      setIsFavorited(favorited);

      // Load related characters from same publisher
      if (char?.biography.publisher) {
        const related = await searchCharacters(char.biography.publisher, 50);
        // Filter out current character and get random 6
        const filtered = related
          .filter(c => c.id !== char.id)
          .sort(() => Math.random() - 0.5)
          .slice(0, 6);
        setRelatedCharacters(filtered);
      }
    }

    loadCharacter();
  }, [resolvedParams.id]);

  const handleToggleFavorite = async () => {
    if (!character || togglingFavorite) return;

    setTogglingFavorite(true);
    const result = await toggleFavoriteCharacter(
      character.id,
      character.name,
      character.images.md,
      character.biography.publisher || undefined
    );

    if (result.success) {
      setIsFavorited(result.isFavorited);
    }
    setTogglingFavorite(false);
  };

  useEffect(() => {
    async function loadAppearances() {
      if (!character) return;

      setAppearancesLoading(true);
      const result = await getCharacterAppearances(character.name, sortOrder);
      setAppearances(result);
      setAppearancesLoading(false);
    }

    loadAppearances();
  }, [character, sortOrder]);

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-foreground">
        <div className="animate-pulse space-y-8">
          <div className="h-8 w-32 bg-muted rounded" />
          <div className="flex gap-8">
            <div className="w-80 h-96 bg-muted rounded" />
            <div className="flex-1 space-y-4">
              <div className="h-12 w-64 bg-muted rounded" />
              <div className="h-6 w-48 bg-muted rounded" />
              <div className="h-32 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!character) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-foreground">
        <Link href="/discover/characters" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8">
          <ArrowLeft className="w-4 h-4" />
          Back to Characters
        </Link>
        <div className="text-center py-20">
          <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium text-muted-foreground">Character not found</h3>
        </div>
      </div>
    );
  }

  const powerLevel = calculatePowerLevel(character.powerstats);
  const alignmentColor = character.biography.alignment === 'good'
    ? 'text-primary/70 bg-primary/10 border-primary/20'
    : character.biography.alignment === 'bad'
      ? 'text-destructive bg-destructive/10 border-destructive/20'
      : 'text-muted-foreground bg-secondary border-border';

  return (
    <div className="p-8 max-w-7xl mx-auto text-foreground">
      {/* Back Button */}
      <Link href="/discover/characters" className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors">
        <ArrowLeft className="w-4 h-4" />
        Back to Characters
      </Link>

      {/* Hero Section */}
      <div className="flex flex-col lg:flex-row gap-8 mb-12">
        {/* Character Image */}
        <div className="lg:w-80 shrink-0">
          <div className="aspect-square rounded overflow-hidden border border-border bg-card">
            <img
              src={character.images.lg}
              alt={character.name}
              className="w-full h-full object-cover object-top"
            />
          </div>
        </div>

        {/* Character Info */}
        <div className="flex-1 space-y-6">
          {/* Name & Basic Info */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-4xl font-bold text-foreground">{character.name}</h1>
              <span className={`px-3 py-1 rounded-full border text-sm font-medium capitalize ${alignmentColor}`}>
                {character.biography.alignment}
              </span>
              <button
                onClick={handleToggleFavorite}
                disabled={togglingFavorite}
                className={`p-2 rounded-full border transition-all duration-200 ${
                  isFavorited
                    ? 'bg-primary/10 border-primary/20 text-primary/50 hover:bg-primary/20'
                    : 'bg-card/60 border-border text-muted-foreground hover:text-primary/50 hover:border-primary/20'
                } disabled:opacity-50`}
                title={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              >
                <Star className={`w-5 h-5 ${isFavorited ? 'fill-current' : ''}`} />
              </button>
            </div>
            {character.biography.fullName && character.biography.fullName !== character.name && (
              <p className="text-xl text-muted-foreground">{character.biography.fullName}</p>
            )}
            <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
              {character.biography.publisher && (
                <span className="flex items-center gap-1">
                  <Book className="w-4 h-4" />
                  {character.biography.publisher}
                </span>
              )}
              {character.biography.firstAppearance && character.biography.firstAppearance !== '-' && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {character.biography.firstAppearance}
                </span>
              )}
            </div>
          </div>

          {/* Power Level Badge */}
          <div className="inline-flex items-center gap-3 px-4 py-3 rounded bg-gradient-to-r from-primary/20 to-primary/10 border border-primary/30">
            <Zap className="w-6 h-6 text-primary" />
            <div>
              <p className="text-xs text-muted-foreground uppercase tracking-wide">Overall Power Level</p>
              <p className="text-2xl font-bold text-primary">{powerLevel}</p>
            </div>
          </div>

          {/* Quick Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {character.work.occupation && character.work.occupation !== '-' && (
              <div className="p-4 rounded bg-card/50 border border-border">
                <Briefcase className="w-4 h-4 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Occupation</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{character.work.occupation}</p>
              </div>
            )}
            {character.work.base && character.work.base !== '-' && (
              <div className="p-4 rounded bg-card/50 border border-border">
                <MapPin className="w-4 h-4 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Base of Operations</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{character.work.base}</p>
              </div>
            )}
            {character.biography.placeOfBirth && character.biography.placeOfBirth !== '-' && (
              <div className="p-4 rounded bg-card/50 border border-border">
                <MapPin className="w-4 h-4 text-muted-foreground mb-2" />
                <p className="text-xs text-muted-foreground mb-1">Place of Birth</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{character.biography.placeOfBirth}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Power Stats Section */}
      <section className="mb-12">
        <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Zap className="w-5 h-5 text-primary" />
          Power Statistics
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {POWER_STAT_CONFIG.map(({ key, label, icon }) => (
            <div key={key} className="p-4 rounded bg-card/50 border border-border">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-primary">{icon}</span>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</span>
              </div>
              <div className="relative h-2 bg-muted rounded-full overflow-hidden mb-2">
                <div
                  className="absolute inset-y-0 left-0 bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${character.powerstats[key]}%` }}
                />
              </div>
              <p className="text-2xl font-bold text-foreground">{character.powerstats[key]}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Abilities (derived from high powerstats) */}
      {(() => {
        const abilities: { name: string; stat: string; color: string }[] = [];
        const ps = character.powerstats;

        const badgeStyle = 'bg-primary/10 text-primary border-primary/20';

        // Derive abilities from exceptional stats (>= 80)
        if (ps.intelligence >= 80) abilities.push({ name: 'Genius-Level Intellect', stat: 'intelligence', color: badgeStyle });
        if (ps.intelligence >= 95) abilities.push({ name: 'Omniscient', stat: 'intelligence', color: badgeStyle });
        if (ps.strength >= 80) abilities.push({ name: 'Superhuman Strength', stat: 'strength', color: badgeStyle });
        if (ps.strength >= 95) abilities.push({ name: 'Incalculable Strength', stat: 'strength', color: badgeStyle });
        if (ps.speed >= 80) abilities.push({ name: 'Superhuman Speed', stat: 'speed', color: badgeStyle });
        if (ps.speed >= 95) abilities.push({ name: 'Super Speed', stat: 'speed', color: badgeStyle });
        if (ps.durability >= 80) abilities.push({ name: 'Enhanced Durability', stat: 'durability', color: badgeStyle });
        if (ps.durability >= 95) abilities.push({ name: 'Invulnerability', stat: 'durability', color: badgeStyle });
        if (ps.power >= 80) abilities.push({ name: 'Energy Projection', stat: 'power', color: badgeStyle });
        if (ps.power >= 95) abilities.push({ name: 'Cosmic Powers', stat: 'power', color: badgeStyle });
        if (ps.combat >= 80) abilities.push({ name: 'Master Combatant', stat: 'combat', color: badgeStyle });
        if (ps.combat >= 95) abilities.push({ name: 'Weapons Master', stat: 'combat', color: badgeStyle });

        // Add based on combinations
        if (ps.speed >= 70 && ps.combat >= 70) abilities.push({ name: 'Enhanced Reflexes', stat: 'speed', color: badgeStyle });
        if (ps.strength >= 70 && ps.durability >= 70) abilities.push({ name: 'Physical Resilience', stat: 'durability', color: badgeStyle });
        if (ps.intelligence >= 70 && ps.combat >= 70) abilities.push({ name: 'Tactical Genius', stat: 'intelligence', color: badgeStyle });

        if (abilities.length === 0) return null;

        return (
          <section className="mb-12">
            <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              Abilities & Powers
            </h2>
            <div className="flex flex-wrap gap-3">
              {abilities.map((ability, i) => (
                <div
                  key={i}
                  className={`px-4 py-2 rounded border text-sm font-medium ${ability.color}`}
                >
                  {ability.name}
                </div>
              ))}
            </div>
          </section>
        );
      })()}

      {/* Physical Attributes */}
      {(character.appearance.height[1] !== '0 cm' ||
        character.appearance.weight[1] !== '0 kg' ||
        character.appearance.eyeColor !== '-' ||
        character.appearance.hairColor !== '-' ||
        character.appearance.race) && (
        <section className="mb-12">
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Ruler className="w-5 h-5 text-primary" />
            Physical Attributes
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4">
            {character.appearance.height[1] && character.appearance.height[1] !== '0 cm' && (
              <div className="p-4 rounded bg-card/50 border border-border">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <Ruler className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Height</span>
                </div>
                <p className="text-lg font-bold text-foreground">{character.appearance.height[1]}</p>
                <p className="text-xs text-muted-foreground">{character.appearance.height[0]}</p>
              </div>
            )}
            {character.appearance.weight[1] && character.appearance.weight[1] !== '0 kg' && (
              <div className="p-4 rounded bg-card/50 border border-border">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <Scale className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Weight</span>
                </div>
                <p className="text-lg font-bold text-foreground">{character.appearance.weight[1]}</p>
                <p className="text-xs text-muted-foreground">{character.appearance.weight[0]}</p>
              </div>
            )}
            {character.appearance.eyeColor && character.appearance.eyeColor !== '-' && (
              <div className="p-4 rounded bg-card/50 border border-border">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <EyeIcon className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Eyes</span>
                </div>
                <p className="text-lg font-bold text-foreground">{character.appearance.eyeColor}</p>
              </div>
            )}
            {character.appearance.hairColor && character.appearance.hairColor !== '-' && (
              <div className="p-4 rounded bg-card/50 border border-border">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <span className="text-xs">💇</span>
                  <span className="text-xs font-medium uppercase tracking-wide">Hair</span>
                </div>
                <p className="text-lg font-bold text-foreground">{character.appearance.hairColor}</p>
              </div>
            )}
            {character.appearance.race && character.appearance.race !== '-' && character.appearance.race !== 'null' && (
              <div className="p-4 rounded bg-card/50 border border-border">
                <div className="flex items-center gap-2 mb-2 text-muted-foreground">
                  <Users className="w-4 h-4" />
                  <span className="text-xs font-medium uppercase tracking-wide">Race</span>
                </div>
                <p className="text-lg font-bold text-foreground">{character.appearance.race}</p>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Aliases & Teams */}
      <div className="grid md:grid-cols-2 gap-8 mb-12">
        {/* Aliases */}
        {character.biography.aliases.length > 0 && character.biography.aliases[0] !== '-' && (
          <section className="p-6 rounded bg-card/50 border border-border">
            <h3 className="text-lg font-bold text-foreground mb-4">Known Aliases</h3>
            <div className="flex flex-wrap gap-2">
              {character.biography.aliases.map((alias, i) => (
                <span key={i} className="px-3 py-1.5 bg-muted rounded text-sm text-muted-foreground">
                  {alias}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Team Affiliations */}
        {character.connections.groupAffiliation && character.connections.groupAffiliation !== '-' && (
          <section className="p-6 rounded bg-card/50 border border-border">
            <h3 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Team Affiliations
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{character.connections.groupAffiliation}</p>
          </section>
        )}
      </div>

      {/* Appearances in Library */}
      <section className="mb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Book className="w-5 h-5 text-primary/70" />
            Appearances in Your Library
          </h2>

          {/* Sort Dropdown */}
          <div className="relative">
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value as SortOrder)}
              className="appearance-none bg-card/60 border border-border rounded px-4 py-2 pr-10 text-sm text-muted-foreground focus:outline-none focus:border-primary cursor-pointer"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="series">By Series</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          </div>
        </div>

        {appearancesLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] bg-muted rounded" />
                <div className="mt-2 h-4 bg-muted rounded w-3/4" />
                <div className="mt-1 h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : appearances.length === 0 ? (
          <div className="text-center py-12 bg-card/30 rounded border border-border">
            <Book className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground">No appearances found in your library</p>
            <p className="text-sm text-muted-foreground mt-1">
              Comics featuring {character.name} will appear here once added to your library
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {appearances.map((appearance) => (
              <Link
                key={appearance.bookId}
                href={`/discover/issue/${appearance.bookId}`}
                className="group"
              >
                <div className="aspect-[2/3] bg-card/50 rounded border border-border overflow-hidden group-hover:border-border transition-all">
                  {appearance.coverUrl ? (
                    <img
                      src={appearance.coverUrl}
                      alt={appearance.title}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <Book className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <h4 className="mt-2 text-sm font-medium text-muted-foreground truncate group-hover:text-primary transition-colors">
                  {appearance.seriesName}
                </h4>
                <p className="text-xs text-muted-foreground">
                  #{appearance.issueNumber} • {appearance.publishedDate || 'Unknown date'}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Related Characters */}
      {relatedCharacters.length > 0 && (
        <section>
          <h2 className="text-xl font-bold text-foreground mb-6 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            More from {character.biography.publisher}
          </h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {relatedCharacters.map((related) => (
              <Link
                key={related.id}
                href={`/discover/characters/${related.id}`}
                className="group"
              >
                <div className="aspect-square bg-card/50 rounded border border-border overflow-hidden group-hover:border-border transition-all">
                  <img
                    src={related.images.md}
                    alt={related.name}
                    className="w-full h-full object-cover object-top"
                    loading="lazy"
                  />
                </div>
                <h4 className="mt-2 text-sm font-medium text-muted-foreground truncate group-hover:text-primary transition-colors">
                  {related.name}
                </h4>
                <p className="text-xs text-muted-foreground capitalize">{related.biography.alignment}</p>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* External Links */}
      <section className="mt-12 pt-8 border-t border-border">
        <h3 className="text-sm font-medium text-muted-foreground mb-4">Learn More</h3>
        <div className="flex flex-wrap gap-3">
          <a
            href={`https://www.google.com/search?q=${encodeURIComponent(character.name + ' ' + (character.biography.publisher || 'comics'))}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-card/60 border border-border rounded text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            Search on Google
            <ExternalLink className="w-3 h-3" />
          </a>
          {character.biography.publisher === 'Marvel Comics' && (
            <a
              href={`https://www.marvel.com/search?query=${encodeURIComponent(character.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive hover:bg-destructive/20 transition-colors"
            >
              Marvel.com
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
          {character.biography.publisher === 'DC Comics' && (
            <a
              href={`https://www.dc.com/search?q=${encodeURIComponent(character.name)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-primary/10 border border-primary/20 rounded text-sm text-primary hover:bg-primary/20 transition-colors"
            >
              DC.com
              <ExternalLink className="w-3 h-3" />
            </a>
          )}
        </div>
      </section>
    </div>
  );
}
