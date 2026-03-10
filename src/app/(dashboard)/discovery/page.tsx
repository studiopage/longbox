'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  Search,
  Book,
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  ImageOff,
  Sparkles,
  Building2,
  Compass,
} from 'lucide-react';
import { browseComicVine, searchComicVine } from '@/lib/comicvine';
import { checkComicVineConfigured } from '@/actions/discovery';

const DECADES = [
  { value: 'all', label: 'Any Year' },
  { value: '2025', label: '2025' },
  { value: '2024', label: '2024' },
  { value: '2023', label: '2023' },
  { value: '2020-2029', label: '2020s' },
  { value: '2010-2019', label: '2010s' },
  { value: '2000-2009', label: '2000s' },
  { value: '1990-1999', label: '1990s' },
  { value: '1980-1989', label: '1980s' },
];

const PUBLISHERS = [
  { value: 'all', label: 'All Publishers' },
  { value: '31', label: 'Marvel' },
  { value: '10', label: 'DC Comics' },
  { value: '4091', label: 'Image' },
  { value: '34', label: 'Dark Horse' },
  { value: '1637', label: 'IDW' },
  { value: '1873', label: 'BOOM! Studios' },
];

const SORTS = [
  { value: 'newest', label: 'Recently Added' },
  { value: 'popular', label: 'Most Issues' },
  { value: 'year_desc', label: 'Year (Newest)' },
  { value: 'alpha', label: 'A-Z' },
];

interface SearchResult {
  id: string | number;
  name: string;
  image?: string;
  subtitle?: string;
}

export default function DiscoveryPage() {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showSearchResults, setShowSearchResults] = useState(false);

  // Series state
  const [seriesResults, setSeriesResults] = useState<any[]>([]);
  const [seriesLoading, setSeriesLoading] = useState(true);
  const [seriesPage, setSeriesPage] = useState(1);
  const [year, setYear] = useState('all');
  const [publisher, setPublisher] = useState('all');
  const [sort, setSort] = useState('newest');
  const [apiConfigured, setApiConfigured] = useState<boolean | null>(null);

  // Autocomplete search
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setShowSearchResults(false);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const seriesRes = await searchComicVine(searchQuery, 10);

        const results: SearchResult[] = seriesRes.map(s => ({
          id: s.id,
          name: s.name,
          image: s.image?.medium_url,
          subtitle: `${s.start_year || 'Unknown'} • ${s.publisher?.name || 'Unknown'}`,
        }));

        setSearchResults(results);
        setShowSearchResults(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setSearchLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Load series
  const loadSeries = useCallback(async () => {
    setSeriesLoading(true);
    try {
      const results = await browseComicVine({
        year: year !== 'all' ? year : undefined,
        publisherId: publisher !== 'all' ? publisher : undefined,
        sort: sort,
        page: seriesPage,
      });
      setSeriesResults(results);
    } catch (error) {
      console.error('Failed to load series:', error);
    } finally {
      setSeriesLoading(false);
    }
  }, [year, publisher, sort, seriesPage]);

  // Load series on mount and filter changes
  useEffect(() => {
    loadSeries();
  }, [loadSeries]);

  // Handle search result click
  const handleSearchResultClick = (result: SearchResult) => {
    setShowSearchResults(false);
    setSearchQuery('');
    router.push(`/series/${result.id}`);
  };

  // Close search results on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          searchInputRef.current && !searchInputRef.current.contains(e.target as Node)) {
        setShowSearchResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Check ComicVine API configuration
  useEffect(() => {
    checkComicVineConfigured().then(setApiConfigured);
  }, []);

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Sparkles className="w-7 h-7 text-primary" />
            Discovery
          </h1>
          <p className="text-muted-foreground mt-1">
            Browse and discover comic series from ComicVine
          </p>
        </div>
      </div>

      {/* Search Bar with Autocomplete */}
      <div className="relative max-w-2xl">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
            placeholder="Search for series..."
            className="w-full bg-secondary border border-border rounded px-12 py-3 text-base text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary/50 focus:ring-2 focus:ring-primary/20 transition-all"
          />
          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setShowSearchResults(false);
              }}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Autocomplete Dropdown */}
        {showSearchResults && searchResults.length > 0 && (
          <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded shadow-lg overflow-hidden z-50">
            {searchResults.map((result) => (
              <button
                key={result.id}
                onClick={() => handleSearchResultClick(result)}
                className="w-full flex items-center gap-4 p-3 hover:bg-accent transition-colors text-left"
              >
                <div className="w-10 h-14 rounded overflow-hidden bg-muted shrink-0">
                  {result.image ? (
                    <img src={result.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Book className="w-4 h-4 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-foreground truncate text-sm block">{result.name}</span>
                  <p className="text-xs text-muted-foreground truncate">{result.subtitle}</p>
                </div>
              </button>
            ))}
          </div>
        )}

        {showSearchResults && searchLoading && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-popover border border-border rounded p-6 text-center z-50">
            <div className="animate-pulse text-muted-foreground text-sm">Searching...</div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div>
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          {/* Publisher Filter */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-muted-foreground" />
            <select
              value={publisher}
              onChange={(e) => {
                setPublisher(e.target.value);
                setSeriesPage(1);
              }}
              className="bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              {PUBLISHERS.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Year Filter */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <select
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                setSeriesPage(1);
              }}
              className="bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              {DECADES.map(d => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </div>

          {/* Sort Filter */}
          <div className="flex items-center gap-2 ml-auto">
            <span className="text-xs text-muted-foreground uppercase tracking-wide">Sort</span>
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setSeriesPage(1);
              }}
              className="bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary"
            >
              {SORTS.map(s => (
                <option key={s.value} value={s.value}>{s.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Series Grid */}
        {seriesLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {Array.from({ length: 12 }).map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[2/3] bg-muted rounded" />
                <div className="mt-3 h-4 bg-muted rounded w-3/4" />
                <div className="mt-2 h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : seriesResults.length === 0 ? (
          apiConfigured === false ? (
            <div className="text-center py-16">
              <Compass className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium text-foreground">ComicVine Not Configured</h3>
              <p className="text-muted-foreground mt-2 text-sm max-w-md mx-auto">
                Add your ComicVine API key in Settings to browse and discover series.
              </p>
              <div className="flex flex-col items-center gap-3 mt-6">
                <Link
                  href="/settings"
                  className="px-4 py-2 bg-primary/10 border border-primary/20 text-primary rounded hover:bg-primary/20 transition-colors text-sm"
                >
                  Go to Settings
                </Link>
                <Link
                  href="/discover/characters"
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Browse Characters instead
                </Link>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <Book className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <h3 className="text-lg font-medium text-muted-foreground">No series found</h3>
              <p className="text-muted-foreground mt-1 text-sm">
                Try adjusting your filters or check your API key in Settings
              </p>
            </div>
          )
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
            {seriesResults.map((item) => (
              <Link key={item.id} href={`/series/${item.id}`}>
                <div className="group cursor-pointer">
                  <div className="aspect-[2/3] bg-card rounded overflow-hidden border border-border group-hover:border-primary/50 transition-all relative">
                    {item.image?.medium_url ? (
                      <img
                        src={item.image.medium_url}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageOff className="w-8 h-8 text-muted-foreground" />
                      </div>
                    )}
                    {item.count_of_issues !== undefined && (
                      <div className="absolute bottom-2 right-2 bg-background/85 text-foreground text-[10px] px-2 py-1 rounded border border-border">
                        {item.count_of_issues} Issues
                      </div>
                    )}
                  </div>
                  <div className="mt-3">
                    <h3 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                      {item.name}
                    </h3>
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.start_year || 'Unknown'} • {item.publisher?.name || 'Unknown'}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {seriesResults.length > 0 && (
          <div className="flex items-center justify-center gap-4 mt-8 pt-8 border-t border-border">
            <button
              onClick={() => setSeriesPage(p => Math.max(1, p - 1))}
              disabled={seriesPage === 1}
              className="flex items-center gap-2 px-4 py-2 bg-secondary border border-border rounded text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-muted-foreground">Page {seriesPage}</span>
            <button
              onClick={() => setSeriesPage(p => p + 1)}
              disabled={seriesResults.length < 24}
              className="flex items-center gap-2 px-4 py-2 bg-secondary border border-border rounded text-foreground hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
