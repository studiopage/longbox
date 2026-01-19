'use client'

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { searchSeries } from '@/actions/search';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { ImageOff } from 'lucide-react';

export function DiscoverySearch() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    const data = await searchSeries(query);
    setResults(data);
    setLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Search Input Area */}
      <div className="flex gap-4 max-w-2xl mx-auto">
        <Input 
          placeholder="Search for a series (e.g. 'Saga', 'X-Men')..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          className="text-lg h-12"
        />
        <Button size="lg" onClick={handleSearch} disabled={loading} className="w-24">
          {loading ? <Loader2 className="animate-spin" /> : <Search />}
        </Button>
      </div>

      {/* Results Grid */}
      {results.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
          {results.map((series) => (
            <Card 
              key={series.id} 
              className="cursor-pointer hover:bg-accent/50 transition-colors group"
              onClick={() => router.push(`/series/new?cvId=${series.id}`)} // We will build this route next
            >
              <CardContent className="p-4 flex gap-4 items-start">
                 {/* Thumbnail */}
                 <div className="w-16 h-24 bg-muted shrink-0 rounded overflow-hidden shadow-sm">
                    {series.image?.medium_url ? (
                        <img src={series.image.medium_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center"><ImageOff className="opacity-20"/></div>
                    )}
                 </div>
                 {/* Info */}
                 <div className="flex-1 min-w-0">
                    <h3 className="font-bold truncate">{series.name}</h3>
                    <p className="text-sm text-muted-foreground">{series.start_year} • {series.publisher?.name}</p>
                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">
                        {series.description?.replace(/<[^>]*>/g, '') || "No description."}
                    </p>
                 </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

