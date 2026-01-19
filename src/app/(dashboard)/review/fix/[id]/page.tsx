'use client'

import { useEffect, useState } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { Loader2, ArrowLeft, Search, ExternalLink, CheckCircle2 } from 'lucide-react';
import type { QueueItem } from '@/utils/queue';

interface ComicResult {
  id: string;
  name: string;
  start_year: string | null;
  count_of_issues: number;
  publisher: { name: string } | null;
  image: { 
    icon_url: string; 
    medium_url: string; // High-quality cover for visual matching
  } | null;
  description?: string;
}

export default function ManualMatchPage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [item, setItem] = useState<QueueItem | null>(null);
  const [results, setResults] = useState<ComicResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    // Load the queue item
    const loadItem = async () => {
      try {
        const res = await fetch('/api/review');
        const data = await res.json();
        const found = data.items.find((i: QueueItem) => i.id === params.id);
        if (found) {
          setItem(found);
          setQuery(searchParams.get('q') || found.localTitle);
        }
      } catch (error) {
        console.error('Failed to load item:', error);
      } finally {
        setLoading(false);
      }
    };
    loadItem();
  }, [params.id, searchParams]);

  useEffect(() => {
    // Perform search when query changes
    if (query && item) {
      performSearch(query);
    }
  }, [query, item]);

  const performSearch = async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    setSearching(true);
    try {
      const res = await fetch(`/api/review/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (error) {
      console.error('Search failed:', error);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = async (result: ComicResult) => {
    if (!item) return;

    setProcessing(result.id);
    try {
      const res = await fetch('/api/review/select', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          remoteId: result.id,
          remoteTitle: result.name,
          remoteYear: result.start_year,
        }),
      });

      if (res.ok) {
        router.push('/review');
      } else {
        const error = await res.json();
        alert(error.error || 'Failed to select match');
      }
    } catch (error) {
      console.error('Failed to select:', error);
      alert('Failed to select match');
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="bg-zinc-950 text-zinc-50 min-h-screen p-8 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-zinc-600" />
      </div>
    );
  }

  if (!item) {
    return (
      <div className="bg-zinc-950 text-zinc-50 min-h-screen p-8">
        <div className="max-w-5xl mx-auto text-center py-20">
          <p className="text-zinc-400">Item not found</p>
          <button
            onClick={() => router.push('/review')}
            className="mt-4 text-blue-400 hover:text-blue-300"
          >
            Back to Review
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-950 text-zinc-50 min-h-screen p-8">
      <div className="max-w-5xl mx-auto">
        
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => router.push('/review')}
            className="text-zinc-400 hover:text-white transition flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Queue
          </button>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            performSearch(query);
          }}
          className="mb-8 relative"
        >
          <Search className="absolute left-4 top-4 text-zinc-500 w-4 h-4" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-700 text-white pl-12 pr-4 py-3 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition text-lg"
            placeholder="Search Series Name..."
            autoFocus
          />
        </form>

        <div className="flex justify-between items-end mb-4 px-2">
          <h2 className="text-xl font-bold text-zinc-100">Select Correct Series</h2>
          <div className="text-sm text-zinc-400">
            Matching for local file: <span className="text-blue-400 font-mono">{item.localTitle}</span> ({item.localYear || 'No Year'})
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {results.map((r) => (
            <div
              key={r.id}
              className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl flex gap-6 hover:border-blue-500/50 transition group items-start relative overflow-hidden"
            >
              
              <div className="w-24 h-36 bg-zinc-800 rounded-lg shadow-lg flex-shrink-0 overflow-hidden border border-zinc-700">
                {r.image?.medium_url ? (
                  <img
                    src={r.image.medium_url}
                    alt={r.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-zinc-600">
                    <ExternalLink className="w-8 h-8" />
                  </div>
                )}
              </div>

              <div className="flex-1 py-1">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-xl text-blue-400 group-hover:text-blue-300 leading-tight mb-1 transition">
                      {r.name}
                    </h3>
                    <div className="flex items-center gap-3 text-sm text-zinc-400">
                      <span className="bg-zinc-800 px-2 py-0.5 rounded text-zinc-300 border border-zinc-700">
                        {r.start_year || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="opacity-50">🏢</span>
                        {r.publisher?.name || 'Unknown'}
                      </span>
                      <span className="flex items-center gap-1">
                        <span className="opacity-50">📚</span>
                        {r.count_of_issues} issues
                      </span>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleSelect(r)}
                    disabled={processing === r.id}
                    className="bg-zinc-800 text-zinc-300 border border-zinc-600 hover:bg-blue-600 hover:text-white hover:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg font-bold transition shadow-sm flex items-center gap-2"
                  >
                    {processing === r.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <span>Select</span>
                        <CheckCircle2 className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
                
                {r.description && (
                  <div className="mt-3 text-sm text-zinc-500 line-clamp-2 leading-relaxed max-w-3xl">
                    {r.description}
                  </div>
                )}
                
                <div className="mt-3 text-xs font-mono text-zinc-600">
                  ID: {r.id}
                </div>
              </div>
            </div>
          ))}
          
          {!searching && results.length === 0 && query && (
            <div className="text-center py-20 bg-zinc-900 rounded-xl border border-dashed border-zinc-800">
              <div className="text-4xl text-zinc-700 mb-4">👻</div>
              <p className="text-zinc-500">No series found matching &quot;{query}&quot;</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

