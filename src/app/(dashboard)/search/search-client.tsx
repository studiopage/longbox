'use client';

import { useState, useMemo } from 'react';
import { SearchFiltersPanel, type SearchFilters } from '@/components/longbox/search-filters';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ImageOff, Library, Globe, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SeriesData {
  id: string;
  name: string;
  publisher: string | null;
  year: number | null;
  description: string | null;
  status: string | null;
  thumbnail_url: string | null;
  cv_id: number | null;
  issue_count?: number;
  source: 'local' | 'remote';
}

interface SearchClientProps {
  query: string;
  localResults: SeriesData[];
  remoteResults: SeriesData[];
  publishers: string[];
}

export function SearchClient({ query, localResults, remoteResults, publishers }: SearchClientProps) {
  const [filters, setFilters] = useState<SearchFilters>({
    publisher: '',
    yearFrom: '',
    yearTo: '',
    status: '',
    source: '',
    sortBy: 'relevance',
    issueCountMin: '',
    issueCountMax: '',
  });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  // Combine results (already normalized by unified search service)
  const allResults: SeriesData[] = useMemo(() => {
    return [...localResults, ...remoteResults];
  }, [localResults, remoteResults]);

  // Apply filters
  const filteredResults = useMemo(() => {
    let results = [...allResults];

    // Publisher filter
    if (filters.publisher) {
      results = results.filter(r => r.publisher === filters.publisher);
    }

    // Year range filter
    if (filters.yearFrom) {
      const yearFrom = parseInt(filters.yearFrom);
      results = results.filter(r => r.year && r.year >= yearFrom);
    }
    if (filters.yearTo) {
      const yearTo = parseInt(filters.yearTo);
      results = results.filter(r => r.year && r.year <= yearTo);
    }

    // Status filter
    if (filters.status) {
      results = results.filter(r => r.status === filters.status);
    }

    // Source filter
    if (filters.source) {
      results = results.filter(r => r.source === filters.source);
    }

    // Issue count filter
    if (filters.issueCountMin) {
      const min = parseInt(filters.issueCountMin);
      results = results.filter(r => r.issue_count && r.issue_count >= min);
    }
    if (filters.issueCountMax) {
      const max = parseInt(filters.issueCountMax);
      results = results.filter(r => r.issue_count && r.issue_count <= max);
    }

    // Sort
    switch (filters.sortBy) {
      case 'title':
        results.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'year-desc':
        results.sort((a, b) => (b.year || 0) - (a.year || 0));
        break;
      case 'year-asc':
        results.sort((a, b) => (a.year || 0) - (b.year || 0));
        break;
      case 'added':
        // Local items first (already in results)
        results.sort((a, b) => (a.source === 'local' ? -1 : 1));
        break;
      default:
        // relevance - keep original order
        break;
    }

    return results;
  }, [allResults, filters]);

  const localCount = filteredResults.filter(r => r.source === 'local').length;
  const remoteCount = filteredResults.filter(r => r.source === 'remote').length;

  return (
    <div className="space-y-6">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {filteredResults.length} of {allResults.length} results
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            <LayoutGrid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <SearchFiltersPanel
        filters={filters}
        onFiltersChange={setFilters}
        publishers={publishers}
      />

      {/* Results Display */}
      {filteredResults.length === 0 ? (
        <div className="p-12 border border-border border-dashed rounded text-center bg-card">
          <p className="text-lg font-semibold mb-2 text-foreground">No results found</p>
          <p className="text-sm text-muted-foreground">Try adjusting your filters or search query</p>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
          {filteredResults.map((item) => {
            const url = item.source === 'local'
              ? `/series/${item.id}`
              : `/series/${item.cv_id}`;

            return (
              <Link key={`${item.source}-${item.id}`} href={url} className="group">
                <div className="bg-card rounded border border-border overflow-hidden group-hover:border-border/60 hover:brightness-110 transition-all duration-200 ease-out h-full">
                  <div className="aspect-[2/3] relative">
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-muted flex items-center justify-center">
                        <ImageOff className="opacity-20 text-muted-foreground" />
                      </div>
                    )}
                    <div className="absolute top-2 right-2">
                      {item.source === 'local' ? (
                        <span className="rounded bg-background/85 border border-border px-3 py-1 text-xs font-medium text-green-500 flex items-center gap-1">
                          <Library className="w-3 h-3" />
                          OWNED
                        </span>
                      ) : (
                        <span className="rounded bg-background/85 border border-border px-3 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1">
                          <Globe className="w-3 h-3" />
                          CV
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="p-3">
                    <h3 className="font-bold text-sm truncate text-foreground group-hover:text-primary transition duration-200 ease-out">{item.name}</h3>
                    <p className="text-xs text-muted-foreground">
                      {item.year} • {item.publisher || 'Unknown'}
                    </p>
                    {item.issue_count && (
                      <p className="text-xs text-muted-foreground mt-1">{item.issue_count} issues</p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredResults.map((item) => {
            const url = item.source === 'local'
              ? `/series/${item.id}`
              : `/series/${item.cv_id}`;

            return (
              <Link key={`${item.source}-${item.id}`} href={url} className="group block">
                <div className="bg-card border border-border rounded p-4 group-hover:border-border/60 hover:bg-accent/50 transition-all duration-200 ease-out flex items-start gap-4">
                  <div className="w-16 h-24 shrink-0 rounded overflow-hidden bg-muted border border-border">
                    {item.thumbnail_url ? (
                      <img
                        src={item.thumbnail_url}
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ImageOff className="w-6 h-6 opacity-20 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-foreground group-hover:text-primary transition duration-200 ease-out">{item.name}</h3>
                      {item.source === 'local' ? (
                        <span className="rounded bg-background/85 border border-border px-3 py-1 text-xs font-medium text-green-500 flex items-center gap-1 shrink-0">
                          <Library className="w-3 h-3" />
                          OWNED
                        </span>
                      ) : (
                        <span className="rounded bg-background/85 border border-border px-3 py-1 text-xs font-medium text-muted-foreground flex items-center gap-1 shrink-0">
                          <Globe className="w-3 h-3" />
                          ComicVine
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{item.year || 'Unknown year'}</span>
                      <span>•</span>
                      <span>{item.publisher || 'Unknown publisher'}</span>
                      {item.issue_count && (
                        <>
                          <span>•</span>
                          <span>{item.issue_count} issues</span>
                        </>
                      )}
                      {item.status && (
                        <>
                          <span>•</span>
                          <span className="rounded border border-border bg-secondary px-3 py-1 text-xs font-medium text-muted-foreground">
                            {item.status}
                          </span>
                        </>
                      )}
                    </div>
                    {item.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                        {item.description}
                      </p>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
