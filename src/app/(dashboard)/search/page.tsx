export const dynamic = 'force-dynamic';

import { db } from '@/db';
import { series } from '@/db/schema';
import { ilike } from 'drizzle-orm';
import { searchComicVine } from '@/lib/comicvine';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ImageOff, Library, Globe, ArrowRight } from 'lucide-react';
import { redirect } from 'next/navigation';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q: query } = await searchParams;

  if (!query) {
    redirect('/');
  }

  // Parallel Fetch: Get ALL local matches + Top 20 Remote matches
  const [localResults, remoteResults] = await Promise.all([
    db.select().from(series).where(ilike(series.title, `%${query}%`)),
    searchComicVine(query, 20)
  ]);

  return (
    <main className="p-8 space-y-10">
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Search Results</h1>
        <p className="text-muted-foreground">
          Showing results for <span className="text-primary font-bold">"{query}"</span>
        </p>
      </div>

      {/* SECTION 1: IN LIBRARY */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
            <Library className="w-5 h-5 text-green-500" />
            <h2 className="text-xl font-bold">In Your Library</h2>
            <Badge variant="secondary" className="ml-2">{localResults.length}</Badge>
        </div>

        {localResults.length > 0 ? (
             <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {localResults.map((item) => (
                    <Link key={item.id} href={`/series/${item.id}`}>
                        <Card className="hover:bg-accent/50 transition-colors h-full border-green-900/30">
                            <div className="aspect-[2/3] relative">
                                {item.thumbnail_url ? (
                                    <img src={item.thumbnail_url} className="w-full h-full object-cover rounded-t-lg" />
                                ) : (
                                    <div className="w-full h-full bg-muted flex items-center justify-center"><ImageOff className="opacity-20"/></div>
                                )}
                                <div className="absolute top-2 right-2">
                                    <Badge className="bg-green-600 hover:bg-green-600">OWNED</Badge>
                                </div>
                            </div>
                            <CardContent className="p-3">
                                <h3 className="font-bold text-sm truncate">{item.title}</h3>
                                <p className="text-xs text-muted-foreground">{item.start_year} • {item.publisher}</p>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
             </div>
        ) : (
            <div className="p-8 border border-dashed rounded-lg text-center text-muted-foreground bg-accent/10">
                No matching series found in your local collection.
            </div>
        )}
      </section>

      {/* SECTION 2: GLOBAL DATABASE */}
      <section className="space-y-4 pt-4">
        <div className="flex items-center gap-2 mb-4">
            <Globe className="w-5 h-5 text-blue-500" />
            <h2 className="text-xl font-bold">Global Database (ComicVine)</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {remoteResults.map((item) => (
                <Link key={item.id} href={`/series/new?cvId=${item.id}`}>
                    <div className="group cursor-pointer space-y-2">
                        <div className="aspect-[2/3] rounded-lg overflow-hidden bg-muted shadow-sm relative">
                             {item.image?.medium_url ? (
                                <img src={item.image.medium_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                             ) : (
                                <div className="w-full h-full flex items-center justify-center"><ImageOff className="opacity-20"/></div>
                             )}
                        </div>
                        <div>
                            <h3 className="font-medium text-sm leading-tight truncate group-hover:text-primary transition-colors">{item.name}</h3>
                            <p className="text-xs text-muted-foreground mt-1">{item.start_year} • {item.publisher?.name}</p>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
      </section>
    </main>
  );
}

