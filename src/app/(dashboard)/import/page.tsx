import { db } from '@/db';
import { series } from '@/db/schema';
import { getAllKomgaSeries } from '@/lib/komga';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Library } from 'lucide-react';
import { ImportMatcher } from '@/components/longbox/import-matcher';
import { AutoScanner } from '@/components/longbox/auto-scanner';
import { unstable_noStore as noStore } from 'next/cache';

export default async function ImportPage() {
  noStore(); // Force dynamic rendering
  
  // 1. Parallel Fetch: Local DB & Komga
  let localSeries: { title: string }[] = [];
  let komgaSeries: any[] = [];
  
  try {
    // Try to fetch from database
    localSeries = await db.select({ title: series.title }).from(series);
  } catch (error) {
    console.error("❌ Database query failed:", error);
    // Continue with empty array if DB fails
    localSeries = [];
  }
  
  try {
    komgaSeries = await getAllKomgaSeries();
  } catch (error) {
    console.error("❌ Komga fetch failed:", error);
    komgaSeries = [];
  }

  // 2. Normalization Helper (strip case/special chars for better matching)
  const normalize = (s: string) => s.toLowerCase().trim().replace(/[^\w\s]/gi, '');
  const localSet = new Set(localSeries.map(s => normalize(s.title)));

  // 3. Filter: What is in Komga but NOT in Local?
  const missing = komgaSeries
    .filter(k => 
      !localSet.has(normalize(k.metadata.title || '')) && 
      !localSet.has(normalize(k.name))
    )
    .map(k => ({
      id: k.id,
      name: k.name,
      metadata: {
        title: k.metadata.title || k.name,
        publisher: k.metadata.publisher || '',
        status: k.metadata.status || '',
        releaseDate: k.metadata.releaseDate || null,
      },
      booksCount: k.booksCount || 0,
    }));

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Library Scanner</h1>
            <p className="text-muted-foreground">
                Found {komgaSeries.length} series in Komga. {missing.length} are untracked.
            </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* STATS CARDS */}
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Synced</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-green-500 flex items-center gap-2">
                    <Check className="w-5 h-5" />
                    {komgaSeries.length - missing.length}
                </div>
            </CardContent>
        </Card>
        <Card>
            <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">Untracked</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold text-yellow-500 flex items-center gap-2">
                    <Library className="w-5 h-5" />
                    {missing.length}
                </div>
            </CardContent>
        </Card>
      </div>

      {/* AUTO-SCANNER WIDGET */}
      {missing.length > 0 && (
        <div className="mb-8">
            <AutoScanner untracked={missing} />
        </div>
      )}

      {/* THE MATCH LIST */}
      <Card>
        <CardHeader>
            <CardTitle>Untracked Series</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {missing.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                    All your Komga series are imported! 🎉
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {missing.map((item) => {
                        const displayTitle = item.metadata.title || item.name;
                        return (
                            <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg bg-card hover:bg-accent/5 transition-colors">
                                <div className="min-w-0">
                                    <h4 className="font-semibold truncate">{displayTitle}</h4>
                                    <div className="flex gap-2 text-xs text-muted-foreground mt-1">
                                        <Badge variant="secondary" className="text-[10px] h-5">
                                            {item.booksCount} Files
                                        </Badge>
                                        {item.metadata.publisher && <span>{item.metadata.publisher}</span>}
                                        {item.metadata.status && <span>• {item.metadata.status}</span>}
                                    </div>
                                </div>
                                {/* The Intelligent Matcher Component */}
                                <ImportMatcher 
                                    term={displayTitle} 
                                    komgaId={item.id} 
                                />
                            </div>
                        );
                    })}
                </div>
            )}
        </CardContent>
      </Card>
    </div>
  );
}

