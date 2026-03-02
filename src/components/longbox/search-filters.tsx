'use client';

import { useState } from 'react';
import { Filter, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

export interface SearchFilters {
  publisher: string;
  yearFrom: string;
  yearTo: string;
  status: string;
  source: string;
  sortBy: string;
  issueCountMin: string;
  issueCountMax: string;
}

interface SearchFiltersProps {
  filters: SearchFilters;
  onFiltersChange: (filters: SearchFilters) => void;
  publishers: string[];
}

export function SearchFiltersPanel({ filters, onFiltersChange, publishers }: SearchFiltersProps) {
  const [isOpen, setIsOpen] = useState(false);

  const updateFilter = (key: keyof SearchFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    onFiltersChange({
      publisher: '',
      yearFrom: '',
      yearTo: '',
      status: '',
      source: '',
      sortBy: 'relevance',
      issueCountMin: '',
      issueCountMax: '',
    });
  };

  const activeFilterCount = Object.entries(filters).filter(
    ([key, value]) => value && key !== 'sortBy'
  ).length;

  return (
    <div className="space-y-4">
      {/* Filter Toggle Button */}
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2"
        >
          <Filter className="w-4 h-4" />
          Filters
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>

        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={clearFilters}>
            Clear all
          </Button>
        )}
      </div>

      {/* Filters Panel */}
      {isOpen && (
        <div className="bg-card border border-border rounded p-6 space-y-4 animate-in slide-in-from-top-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Publisher Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Publisher</label>
              <Select value={filters.publisher} onValueChange={(v) => updateFilter('publisher', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All publishers" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All publishers</SelectItem>
                  {publishers.map((pub) => (
                    <SelectItem key={pub} value={pub}>
                      {pub}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Status</label>
              <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All statuses</SelectItem>
                  <SelectItem value="ongoing">Ongoing</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Source Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Source</label>
              <Select value={filters.source} onValueChange={(v) => updateFilter('source', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="All sources" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All sources</SelectItem>
                  <SelectItem value="local">My Library</SelectItem>
                  <SelectItem value="remote">ComicVine</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Sort By */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Sort By</label>
              <Select value={filters.sortBy} onValueChange={(v) => updateFilter('sortBy', v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Relevance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="relevance">Relevance</SelectItem>
                  <SelectItem value="title">Title (A-Z)</SelectItem>
                  <SelectItem value="year-desc">Year (Newest)</SelectItem>
                  <SelectItem value="year-asc">Year (Oldest)</SelectItem>
                  <SelectItem value="added">Recently Added</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Year Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Year From</label>
              <input
                type="number"
                placeholder="e.g. 2000"
                value={filters.yearFrom}
                onChange={(e) => updateFilter('yearFrom', e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Year To</label>
              <input
                type="number"
                placeholder="e.g. 2024"
                value={filters.yearTo}
                onChange={(e) => updateFilter('yearTo', e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition"
              />
            </div>

            {/* Issue Count Range */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Min Issues</label>
              <input
                type="number"
                placeholder="e.g. 1"
                value={filters.issueCountMin}
                onChange={(e) => updateFilter('issueCountMin', e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Max Issues</label>
              <input
                type="number"
                placeholder="e.g. 100"
                value={filters.issueCountMax}
                onChange={(e) => updateFilter('issueCountMax', e.target.value)}
                className="w-full bg-secondary border border-border rounded px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary transition"
              />
            </div>
          </div>

          {/* Active Filters Display */}
          {activeFilterCount > 0 && (
            <div className="pt-4 border-t border-border">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm text-muted-foreground">Active filters:</span>
                {filters.publisher && (
                  <Badge variant="secondary" className="gap-1">
                    Publisher: {filters.publisher}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => updateFilter('publisher', '')}
                    />
                  </Badge>
                )}
                {filters.status && (
                  <Badge variant="secondary" className="gap-1">
                    Status: {filters.status}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => updateFilter('status', '')}
                    />
                  </Badge>
                )}
                {filters.source && (
                  <Badge variant="secondary" className="gap-1">
                    Source: {filters.source === 'local' ? 'My Library' : 'ComicVine'}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => updateFilter('source', '')}
                    />
                  </Badge>
                )}
                {filters.yearFrom && (
                  <Badge variant="secondary" className="gap-1">
                    From: {filters.yearFrom}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => updateFilter('yearFrom', '')}
                    />
                  </Badge>
                )}
                {filters.yearTo && (
                  <Badge variant="secondary" className="gap-1">
                    To: {filters.yearTo}
                    <X
                      className="w-3 h-3 cursor-pointer"
                      onClick={() => updateFilter('yearTo', '')}
                    />
                  </Badge>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
