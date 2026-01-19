export const dynamic = 'force-dynamic';

import { getFreshSeries } from '@/lib/comicvine';
import { db } from '@/db';
import { requests, series } from '@/db/schema';
import { desc, eq, count } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ArrowRight, ImageOff, Activity } from 'lucide-react';
import { GapReport } from '@/components/longbox/gap-report';

export default async function HomePage() {
  // Parallel Fetch: 
  // 1. Trending (Remote)
  // 2. Recent Requests (Local Join)
  // 3. Total Request Count (Local Agg)
  const [freshSeries, recentRequests, requestStats] = await Promise.all([
    getFreshSeries(),
    db.select({
        id: requests.id,
        state: requests.status, // Note: field is 'status' in DB, mapped to UI
        seriesTitle: series.title,
        thumbnail: series.thumbnail_url,
        seriesId: series.id
    })
    .from(requests)
    .innerJoin(series, eq(requests.series_id, series.id))
    .orderBy(desc(requests.created_at))
    .limit(4),
    
    db.select({ count: count() }).from(requests)
  ]);

  const totalRequests = requestStats[0]?.count || 0;

  return (
    <main className="p-8 space-y-10">
      
      {/* SECTION 0: STATS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
            <CardContent className="p-6 flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-muted-foreground">Active Queue</p>
                    <h2 className="text-3xl font-bold">{totalRequests}</h2>
                </div>
                <Activity className="h-8 w-8 text-primary opacity-50" />
            </CardContent>
        </Card>
        
        {/* GAP REPORT (Spans 1 column) */}
        <div className="md:col-span-1">
            <GapReport />
        </div>
      </div>

      {/* SECTION 1: ACTIVE REQUESTS */}
      {recentRequests.length > 0 && (
          <section className="space-y-4">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold tracking-tight text-left">Recent Requests</h2>
                <Link href="/requests" className="text-sm text-primary hover:underline flex items-center">
                    View Queue <ArrowRight className="w-4 h-4 ml-1" />
                </Link>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {recentRequests.map((req) => (
                    <Link key={req.id} href={`/series/${req.seriesId}`}>
                        <Card className="hover:bg-accent/50 transition-colors h-full">
                            <CardContent className="p-4 flex gap-4 items-center">
                                <div className="w-12 h-16 bg-muted rounded overflow-hidden shrink-0">
                                    {req.thumbnail && <img src={req.thumbnail} className="w-full h-full object-cover"/>}
                                </div>
                                <div className="min-w-0">
                                    <h4 className="font-medium truncate text-left">{req.seriesTitle}</h4>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Badge variant={req.state === 'sent_to_kapowarr' ? 'secondary' : 'default'} className="text-[10px] px-1 py-0 h-5">
                                            {req.state === 'sent_to_kapowarr' ? 'QUEUED' : req.state}
                                        </Badge>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </Link>
                ))}
            </div>
          </section>
      )}

      {/* SECTION 2: DISCOVERY (Existing code...) */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold tracking-tight text-left">New on ComicVine</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {freshSeries.map((item) => (
                <Link key={item.id} href={`/series/new?cvId=${item.id}`}>
                    <div className="group cursor-pointer space-y-2 text-left">
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
