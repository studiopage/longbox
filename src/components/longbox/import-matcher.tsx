'use client'

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Search, Loader2 } from 'lucide-react';
import { searchComicVineAction } from '@/actions/search-cv';
import { importSeriesAction } from '@/actions/library';
import { useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

export function ImportMatcher({ term }: { term: string }) {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();

  // 1. Search ComicVine when dialog opens
  useEffect(() => {
    if (isOpen && results.length === 0 && !loading) {
      handleSearch();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const handleSearch = async () => {
    setLoading(true);
    try {
      const res = await searchComicVineAction(term);
      setResults(res || []);
    } catch (error) {
      console.error("Search failed:", error);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // 2. Import Selected
  const handleImport = async (cvId: number) => {
    setImporting(cvId);
    try {
      const res = await importSeriesAction(cvId.toString());
      setImporting(null);
      
      if (res.success) {
        // Feedback update
        alert("Imported & Synced!");
        setIsOpen(false);
        router.refresh(); // Refresh page to update the list
      } else {
        alert(res.message || "Import failed");
      }
    } catch (error) {
      console.error("Import failed:", error);
      alert("Import failed");
      setImporting(null);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
            <Button size="sm" variant="outline">
                <Search className="w-4 h-4 mr-2" /> Match
            </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
                <DialogTitle>Match "{term}"</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
                {loading && (
                    <div className="flex justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                    </div>
                )}

                {!loading && results.length === 0 && (
                    <div className="text-center text-muted-foreground">No matches found on ComicVine.</div>
                )}

                <div className="grid gap-3">
                    {results.map((series) => (
                        <div key={series.id} className="flex items-start gap-4 p-3 border rounded hover:bg-accent cursor-pointer group">
                            <div className="w-12 h-16 bg-muted shrink-0 rounded overflow-hidden">
                                {series.image?.medium_url && <img src={series.image.medium_url} className="w-full h-full object-cover"/>}
                            </div>
                            <div className="flex-1 min-w-0">
                                <h4 className="font-bold text-sm">{series.name}</h4>
                                <p className="text-xs text-muted-foreground">
                                    {series.start_year} • {series.count_of_issues} Issues • {series.publisher?.name}
                                </p>
                            </div>
                            <Button 
                                size="sm" 
                                disabled={importing === series.id}
                                onClick={() => handleImport(series.id)}
                            >
                                {importing === series.id ? <Loader2 className="w-4 h-4 animate-spin" /> : "Select"}
                            </Button>
                        </div>
                    ))}
                </div>
            </div>
        </DialogContent>
    </Dialog>
  );
}

