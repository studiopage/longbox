'use client'

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { searchSeries } from '@/actions/search';
import { linkSeriesToMapping } from '@/actions/match'; 
import { Search, Link as LinkIcon, Loader2, ImageOff } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function MatchDialog({ mapping }: { mapping: any }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(mapping.local_title);
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSearch() {
    if (!query) return;
    setLoading(true);
    const data = await searchSeries(query);
    setResults(data);
    setLoading(false);
  }

  async function handleMatch(item: any) {
    await linkSeriesToMapping({
        mappingId: mapping.id,
        cvId: item.id.toString(),
        title: item.name,
        year: parseInt(item.start_year || '0'),
        publisher: item.publisher?.name || 'Unknown',
        description: item.description || '',
        image: item.image?.medium_url || ''
    });
    setOpen(false);
    router.refresh(); // Refresh the page to show "MATCHED"
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 text-yellow-500 hover:text-yellow-400">
          <LinkIcon className="w-3 h-3 mr-1" /> Match
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Identify "{mapping.local_title}"</DialogTitle>
        </DialogHeader>
        
        <div className="flex gap-2 mb-4">
          <Input 
            value={query} 
            onChange={(e) => setQuery(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </Button>
        </div>

        <div className="grid grid-cols-1 gap-2">
            {results.map((item) => (
                <div key={item.id} className="flex gap-4 p-3 border rounded hover:bg-accent/50 cursor-pointer" onClick={() => handleMatch(item)}>
                    <div className="w-12 h-16 bg-muted shrink-0 flex items-center justify-center">
                        {item.image?.medium_url ? (
                            <img src={item.image.medium_url} alt="" className="w-full h-full object-cover rounded-sm" />
                        ) : (
                            <ImageOff className="w-6 h-6 opacity-20" />
                        )}
                    </div>
                    <div>
                        <h4 className="font-bold">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.start_year} • {item.publisher?.name}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{item.description?.replace(/<[^>]*>/g, '')}</p>
                    </div>
                </div>
            ))}
            {results.length === 0 && !loading && (
                <p className="text-sm text-muted-foreground text-center py-4">No results found.</p>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

