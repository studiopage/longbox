import { db } from '@/db';
import { series, books } from '@/db/schema';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Library } from 'lucide-react';
import { ImportMatcher } from '@/components/longbox/import-matcher';
import { AutoScanner } from '@/components/longbox/auto-scanner';
import { unstable_noStore as noStore } from 'next/cache';
import { sql } from 'drizzle-orm';

export default async function ImportPage() {
  noStore(); // Force dynamic rendering
  
  // 1. Fetch file-based series and ComicVine series
  let fileBasedSeries: Array<{ id: string; name: string; bookCount: number }> = [];
  let comicVineSeries: { title: string }[] = [];
  
  try {
    // Fetch file-based series with book counts (series that have books)
    fileBasedSeries = await db
      .select({
        id: series.id,
        name: series.name,
        bookCount: sql<number>`count(${books.id})`.mapWith(Number),
      })
      .from(series)
      .innerJoin(books, sql`${series.id} = ${books.series_id}`)
      .groupBy(series.id, series.name);
  } catch (error) {
    console.error("❌ Database query failed:", error);
    fileBasedSeries = [];
  }
  
  try {
    // Fetch ComicVine series (already imported)
    // Note: This query may fail if database schema hasn't been migrated yet
    // (old schema uses 'title', new schema uses 'name')
    // If it fails, we'll just show all file-based series as "untracked"
    comicVineSeries = await db.select({ title: series.name }).from(series);
  } catch (error) {
    // Schema mismatch - database likely still has old 'title' column
    // Just continue with empty array - all file series will show as untracked
    console.warn("⚠️ ComicVine series query failed (schema mismatch?) - continuing with empty list:", error);
    comicVineSeries = [];
  }

  // 2. Normalization Helper (strip case/special chars for better matching)
  const normalize = (s: string) => s.toLowerCase().trim().replace(/[^\w\s]/gi, '');
  const comicVineSet = new Set(comicVineSeries.map(s => normalize(s.title)));

  // 3. Filter: What is in file system but NOT matched to ComicVine?
  const missing = fileBasedSeries
    .filter(fs => !comicVineSet.has(normalize(fs.name)))
    .map(fs => ({
      id: fs.id,
      name: fs.name,
      metadata: {
        title: fs.name,
        publisher: '',
        status: '',
        releaseDate: null,
      },
      booksCount: fs.bookCount || 0,
    }));

  // Ensure stable array reference to prevent hydration mismatches
  const missingArray = Array.isArray(missing) ? missing : [];

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-bold tracking-tight">Library Scanner</h1>
            <p className="text-muted-foreground">
                Found {fileBasedSeries.length} series in library. {missingArray.length} need ComicVine matching.
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
                    {fileBasedSeries.length - missingArray.length}
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
                    {missingArray.length}
                </div>
            </CardContent>
        </Card>
      </div>

      {/* AUTO-SCANNER WIDGET */}
      {missingArray.length > 0 && (
        <div className="mb-8">
            <AutoScanner untracked={missingArray} />
        </div>
      )}

      {/* THE MATCH LIST */}
      <Card>
        <CardHeader>
            <CardTitle>Untracked Series</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
            {missingArray.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground" key="empty-state">
                    All your series are matched to ComicVine! 🎉
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4" key="series-list">
                    {missingArray.map((item) => {
                        const displayTitle = item.metadata.title || item.name;
                        return (
                            <div key={item.id} className="flex items-center justify-between p-4 border rounded bg-card hover:bg-accent/5 transition-colors">
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

