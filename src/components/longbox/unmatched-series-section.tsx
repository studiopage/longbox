'use client';

import { useEffect, useState } from 'react';
import { Link as LinkIcon, Loader2, Search } from 'lucide-react';
import { ImportMatcher } from '@/components/longbox/import-matcher';
import { Badge } from '@/components/ui/badge';

interface UnmatchedSeries {
  id: string;
  name: string;
  booksCount: number;
  metadata: {
    title: string;
    publisher: string;
    status: string;
  };
}

export function UnmatchedSeriesSection() {
  const [unmatched, setUnmatched] = useState<UnmatchedSeries[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchUnmatched() {
      try {
        const response = await fetch('/api/import/unmatched');
        if (response.ok) {
          const data = await response.json();
          setUnmatched(data);
        }
      } catch (error) {
        console.error('Failed to fetch unmatched series:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchUnmatched();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <section className="space-y-4 w-full">
      <div className="flex items-center gap-2 mb-4">
        <LinkIcon className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Unmatched Series</h2>
        <span className="text-sm text-muted-foreground">({unmatched.length} need matching)</span>
      </div>

      <div className="bg-primary/10 border border-primary/20 rounded p-4 mb-6 w-full">
        <div className="flex items-start gap-3">
          <Search className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">About Series Matching</p>
            <p className="text-xs text-muted-foreground">
              These series were detected in your library but couldn't be automatically matched to ComicVine.
              Click "Match" to search ComicVine and link them to the correct series metadata.
            </p>
          </div>
        </div>
      </div>

      {unmatched.length === 0 ? (
        <div className="bg-card border border-border rounded p-12 text-center">
          <LinkIcon className="w-12 h-12 text-primary mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">All Matched!</h3>
          <p className="text-sm text-muted-foreground">
            All your series are matched to ComicVine metadata.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {unmatched.map((item) => {
            const displayTitle = item.metadata.title || item.name;
            return (
              <div
                key={item.id}
                className="bg-card border border-border rounded p-4 hover:border-primary/30 transition-colors"
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-foreground truncate mb-2">
                      {displayTitle}
                    </h4>
                    <div className="flex gap-2 flex-wrap">
                      <Badge variant="secondary" className="text-[10px] h-5">
                        {item.booksCount} Files
                      </Badge>
                      {item.metadata.publisher && (
                        <Badge variant="outline" className="text-[10px] h-5">
                          {item.metadata.publisher}
                        </Badge>
                      )}
                      {item.metadata.status && (
                        <Badge variant="outline" className="text-[10px] h-5">
                          {item.metadata.status}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <ImportMatcher term={displayTitle} seriesId={item.id} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
