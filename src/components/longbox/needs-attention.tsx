import { db } from '@/db';
import { importQueue, series, books, requests } from '@/db/schema';
import { sql, eq, isNull } from 'drizzle-orm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, FileQuestion, Link2Off, Download, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { unstable_noStore as noStore } from 'next/cache';

interface AttentionItem {
  label: string;
  count: number;
  href: string;
  description: string;
  icon: React.ReactNode;
  variant: 'warning' | 'info' | 'default';
}

export async function NeedsAttention() {
  noStore();

  try {
    // Parallel fetch all counts
    const [reviewQueueResult, unmatchedSeriesResult, activeDownloadsResult] = await Promise.allSettled([
      // Review queue count
      db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(importQueue),

      // Unmatched series (series with books but no cv_id)
      db.select({ count: sql<number>`count(distinct ${series.id})`.mapWith(Number) })
        .from(series)
        .innerJoin(books, eq(series.id, books.series_id))
        .where(isNull(series.cv_id)),

      // Active downloads (pending requests)
      db.select({ count: sql<number>`count(*)`.mapWith(Number) })
        .from(requests)
        .where(eq(requests.status, 'pending')),
    ]);

    const reviewQueue = reviewQueueResult.status === 'fulfilled' ? reviewQueueResult.value[0]?.count || 0 : 0;
    const unmatchedSeries = unmatchedSeriesResult.status === 'fulfilled' ? unmatchedSeriesResult.value[0]?.count || 0 : 0;
    const activeDownloads = activeDownloadsResult.status === 'fulfilled' ? activeDownloadsResult.value[0]?.count || 0 : 0;

    const items: AttentionItem[] = [
      {
        label: 'Review Queue',
        count: reviewQueue,
        href: '/review',
        description: 'Files awaiting series match',
        icon: <FileQuestion className="w-4 h-4" />,
        variant: reviewQueue > 0 ? 'warning' : 'default',
      },
      {
        label: 'Unmatched Series',
        count: unmatchedSeries,
        href: '/import',
        description: 'Series without ComicVine match',
        icon: <Link2Off className="w-4 h-4" />,
        variant: unmatchedSeries > 0 ? 'info' : 'default',
      },
      {
        label: 'Active Downloads',
        count: activeDownloads,
        href: '/requests',
        description: 'Pending in download queue',
        icon: <Download className="w-4 h-4" />,
        variant: 'default',
      },
    ];

    const totalAttention = reviewQueue + unmatchedSeries;

    return (
      <Card className="border-border bg-card h-full">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertCircle className={`w-4 h-4 ${totalAttention > 0 ? 'text-primary/50' : 'text-muted-foreground'}`} />
            Needs Attention
            {totalAttention > 0 && (
              <span className="text-xs font-normal text-muted-foreground ml-auto">
                {totalAttention} item{totalAttention !== 1 ? 's' : ''}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {items.map((item) => (
            <Link key={item.label} href={item.href}>
              <div className={`flex items-center justify-between p-3 rounded transition-colors hover:bg-accent/50 ${
                item.variant === 'warning' && item.count > 0 ? 'bg-primary/10 border border-primary/20' :
                item.variant === 'info' && item.count > 0 ? 'bg-primary/10 border border-primary/20' :
                'bg-muted/30'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`${
                    item.variant === 'warning' && item.count > 0 ? 'text-primary/50' :
                    item.variant === 'info' && item.count > 0 ? 'text-primary' :
                    'text-muted-foreground'
                  }`}>
                    {item.icon}
                  </div>
                  <div>
                    <p className="text-sm font-medium">{item.label}</p>
                    <p className="text-xs text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${
                    item.count > 0 && item.variant === 'warning' ? 'text-primary/50' :
                    item.count > 0 && item.variant === 'info' ? 'text-primary' :
                    'text-muted-foreground'
                  }`}>
                    {item.count}
                  </span>
                  <ArrowRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    );
  } catch (error) {
    console.error('NeedsAttention error:', error);
    return null;
  }
}
