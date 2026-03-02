'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, Users, Zap, Shield, Skull, Shuffle, ChevronLeft, ChevronRight, Brain, Dumbbell, Wind, Heart, Swords, Star } from 'lucide-react';
import { CharacterCard } from '@/components/longbox/character-card';
import {
  getHeroesPaginated,
  getVillainsPaginated,
  getCharactersByPublisherPaginated,
  getTopByPowerstatPaginated,
  getAllCharactersPaginated,
  searchCharactersPaginated,
  getCharactersByIdsPaginated,
  type Powerstats,
  type PaginatedCharacters,
} from '@/lib/superhero-api';
import { getFavoriteCharacterIds } from '@/actions/favorites';

type FilterMode = 'all' | 'favorites' | 'heroes' | 'villains' | 'marvel' | 'dc' | 'powerful';
type PowerSortStat = keyof Powerstats;

const POWER_STATS: { stat: PowerSortStat; label: string; icon: React.ReactNode }[] = [
  { stat: 'power', label: 'Power', icon: <Zap className="w-3 h-3" /> },
  { stat: 'strength', label: 'Strength', icon: <Dumbbell className="w-3 h-3" /> },
  { stat: 'intelligence', label: 'Intelligence', icon: <Brain className="w-3 h-3" /> },
  { stat: 'speed', label: 'Speed', icon: <Wind className="w-3 h-3" /> },
  { stat: 'durability', label: 'Durability', icon: <Heart className="w-3 h-3" /> },
  { stat: 'combat', label: 'Combat', icon: <Swords className="w-3 h-3" /> },
];

const PAGE_SIZE = 24;

export default function CharacterDiscoveryPage() {
  const [paginatedData, setPaginatedData] = useState<PaginatedCharacters | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [powerSortStat, setPowerSortStat] = useState<PowerSortStat>('power');
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());

  // Load favorite IDs on mount
  useEffect(() => {
    getFavoriteCharacterIds().then(ids => setFavoriteIds(new Set(ids)));
  }, []);

  const loadCharacters = useCallback(async (
    mode: FilterMode,
    page: number,
    query?: string,
    sortStat?: PowerSortStat,
    favIds?: number[]
  ) => {
    setLoading(true);
    try {
      let results: PaginatedCharacters;

      if (query && query.length > 0) {
        results = await searchCharactersPaginated(query, page, PAGE_SIZE);
      } else {
        switch (mode) {
          case 'favorites':
            results = await getCharactersByIdsPaginated(favIds || [], page, PAGE_SIZE);
            break;
          case 'heroes':
            results = await getHeroesPaginated(page, PAGE_SIZE);
            break;
          case 'villains':
            results = await getVillainsPaginated(page, PAGE_SIZE);
            break;
          case 'marvel':
            results = await getCharactersByPublisherPaginated('Marvel', page, PAGE_SIZE);
            break;
          case 'dc':
            results = await getCharactersByPublisherPaginated('DC', page, PAGE_SIZE);
            break;
          case 'powerful':
            results = await getTopByPowerstatPaginated(sortStat || 'power', page, PAGE_SIZE);
            break;
          default:
            results = await getAllCharactersPaginated(page, PAGE_SIZE);
        }
      }

      setPaginatedData(results);
    } catch (error) {
      console.error('Failed to load characters:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadCharacters('all', 1);
  }, [loadCharacters]);

  // Handle filter changes
  useEffect(() => {
    if (!searchQuery) {
      setCurrentPage(1);
      const favIdsArray = Array.from(favoriteIds);
      loadCharacters(filterMode, 1, undefined, powerSortStat, favIdsArray);
    }
  }, [filterMode, powerSortStat, searchQuery, loadCharacters, favoriteIds]);

  // Handle page changes
  useEffect(() => {
    const favIdsArray = Array.from(favoriteIds);
    loadCharacters(filterMode, currentPage, searchQuery || undefined, powerSortStat, favIdsArray);
  }, [currentPage, loadCharacters, filterMode, searchQuery, powerSortStat, favoriteIds]);

  // Handle search with debounce
  useEffect(() => {
    const favIdsArray = Array.from(favoriteIds);
    const timer = setTimeout(() => {
      if (searchQuery.length >= 2) {
        setCurrentPage(1);
        loadCharacters(filterMode, 1, searchQuery, powerSortStat, favIdsArray);
      } else if (searchQuery.length === 0) {
        setCurrentPage(1);
        loadCharacters(filterMode, 1, undefined, powerSortStat, favIdsArray);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, filterMode, powerSortStat, loadCharacters]);

  const filters: { mode: FilterMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'all', label: 'All', icon: <Shuffle className="w-4 h-4" /> },
    { mode: 'favorites', label: 'Favorites', icon: <Star className="w-4 h-4" /> },
    { mode: 'heroes', label: 'Heroes', icon: <Shield className="w-4 h-4" /> },
    { mode: 'villains', label: 'Villains', icon: <Skull className="w-4 h-4" /> },
    { mode: 'marvel', label: 'Marvel', icon: <Users className="w-4 h-4" /> },
    { mode: 'dc', label: 'DC', icon: <Users className="w-4 h-4" /> },
    { mode: 'powerful', label: 'Most Powerful', icon: <Zap className="w-4 h-4" /> },
  ];

  const goToPage = (page: number) => {
    if (page >= 1 && page <= (paginatedData?.totalPages || 1)) {
      setCurrentPage(page);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const renderPagination = () => {
    if (!paginatedData || paginatedData.totalPages <= 1) return null;

    const { page, totalPages, total } = paginatedData;
    const pages: (number | string)[] = [];

    // Always show first page
    pages.push(1);

    // Show ellipsis if needed
    if (page > 3) pages.push('...');

    // Show pages around current
    for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) {
      if (!pages.includes(i)) pages.push(i);
    }

    // Show ellipsis if needed
    if (page < totalPages - 2) pages.push('...');

    // Always show last page
    if (totalPages > 1 && !pages.includes(totalPages)) pages.push(totalPages);

    return (
      <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
        <p className="text-sm text-muted-foreground">
          Showing {((page - 1) * PAGE_SIZE) + 1}-{Math.min(page * PAGE_SIZE, total)} of {total} characters
        </p>

        <div className="flex items-center gap-2">
          <button
            onClick={() => goToPage(page - 1)}
            disabled={page === 1}
            className="flex items-center gap-1 px-3 py-2 rounded bg-secondary border border-border text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </button>

          <div className="flex items-center gap-1">
            {pages.map((p, i) =>
              typeof p === 'number' ? (
                <button
                  key={i}
                  onClick={() => goToPage(p)}
                  className={`w-10 h-10 rounded text-sm font-medium transition-all ${
                    p === page
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary border border-border text-foreground hover:bg-accent'
                  }`}
                >
                  {p}
                </button>
              ) : (
                <span key={i} className="px-2 text-muted-foreground">...</span>
              )
            )}
          </div>

          <button
            onClick={() => goToPage(page + 1)}
            disabled={page === totalPages}
            className="flex items-center gap-1 px-3 py-2 rounded bg-secondary border border-border text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Users className="w-7 h-7 text-primary" />
            Character Discovery
          </h1>
          <p className="text-muted-foreground mt-1">Explore 700+ heroes and villains from the comic universe</p>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="space-y-4">
        {/* Search Bar */}
        <div className="relative max-w-2xl">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search characters by name..."
            className="w-full bg-secondary border border-border rounded px-12 py-3 text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2">
          {filters.map(({ mode, label, icon }) => (
            <button
              key={mode}
              onClick={() => {
                setFilterMode(mode);
                setCurrentPage(1);
              }}
              className={`flex items-center gap-2 px-4 py-2 rounded text-sm font-medium transition-all duration-200 ${
                filterMode === mode && !searchQuery
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-secondary border border-border text-foreground hover:bg-accent'
              }`}
            >
              {icon}
              {label}
            </button>
          ))}
        </div>

        {/* Power Stat Sort (only visible when "Most Powerful" is selected) */}
        {filterMode === 'powerful' && !searchQuery && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <div className="flex flex-wrap gap-2">
              {POWER_STATS.map(({ stat, label, icon }) => (
                <button
                  key={stat}
                  onClick={() => {
                    setPowerSortStat(stat);
                    setCurrentPage(1);
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium transition-all duration-200 ${
                    powerSortStat === stat
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary border border-border text-foreground hover:bg-accent'
                  }`}
                >
                  {icon}
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Results Count */}
      <div className="text-sm text-muted-foreground">
        {loading ? 'Loading...' : `${paginatedData?.total || 0} characters found`}
        {searchQuery && ` matching "${searchQuery}"`}
        {filterMode === 'powerful' && !searchQuery && ` sorted by ${powerSortStat}`}
      </div>

      {/* Character Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="aspect-square bg-muted rounded" />
              <div className="mt-3 h-4 bg-muted rounded w-3/4" />
              <div className="mt-2 h-3 bg-muted rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : !paginatedData || paginatedData.characters.length === 0 ? (
        <div className="text-center py-20">
          <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-medium text-muted-foreground">No characters found</h3>
          <p className="text-muted-foreground mt-2">Try a different search term or filter</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {paginatedData.characters.map((character) => (
              <CharacterCard
                key={character.id}
                character={character}
                isFavorited={favoriteIds.has(character.id)}
              />
            ))}
          </div>

          {/* Pagination */}
          {renderPagination()}
        </>
      )}
    </div>
  );
}
