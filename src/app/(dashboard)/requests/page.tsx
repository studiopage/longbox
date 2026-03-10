import { db } from '@/db';
import { requests, series, issues } from '@/db/schema';
import { desc, eq, count } from 'drizzle-orm';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { QueueActions } from '@/components/longbox/queue-actions';
import { RequestFilters } from '@/components/longbox/request-filters';
import { EmptyState } from '@/components/longbox/empty-state';
import { unstable_noStore as noStore } from 'next/cache';
import { ShoppingCart, CheckCircle2, Clock, Search, Package } from 'lucide-react';

export const dynamic = 'force-dynamic';

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-muted text-muted-foreground' },
  requested: { label: 'Wanted', className: 'bg-amber-500/15 text-amber-400 border border-amber-500/20' },
  searching: { label: 'Searching', className: 'bg-blue-500/15 text-blue-400 border border-blue-500/20' },
  fulfilled: { label: 'Fulfilled', className: 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/20' },
};

interface PageProps {
  searchParams: Promise<{ status?: string }>;
}

export default async function RequestsPage({ searchParams }: PageProps) {
  noStore();
  const params = await searchParams;
  const validStatuses = ['draft', 'requested', 'searching', 'fulfilled'] as const;
  const statusFilter = validStatuses.includes(params.status as any)
    ? (params.status as typeof validStatuses[number])
    : undefined;

  // Get counts per status for stat cards
  const statusCounts = await db
    .select({
      status: requests.status,
      count: count(),
    })
    .from(requests)
    .groupBy(requests.status);

  const counts = {
    total: statusCounts.reduce((sum, r) => sum + r.count, 0),
    requested: statusCounts.find(r => r.status === 'requested')?.count ?? 0,
    searching: statusCounts.find(r => r.status === 'searching')?.count ?? 0,
    fulfilled: statusCounts.find(r => r.status === 'fulfilled')?.count ?? 0,
  };

  // Fetch requests with optional filter
  const baseQuery = db.select({
    id: requests.id,
    status: requests.status,
    title: requests.title,
    requestIssueNumber: requests.issue_number,
    publisher: requests.publisher,
    createdAt: requests.created_at,
    fulfilledAt: requests.fulfilled_at,
    issueTitle: issues.title,
    issueNumber: issues.issue_number,
    seriesTitle: series.name,
    seriesId: series.id,
    seriesThumb: series.thumbnail_url,
  })
  .from(requests)
  .leftJoin(issues, eq(requests.issue_id, issues.id))
  .leftJoin(series, eq(requests.series_id, series.id));

  const queue = statusFilter
    ? await baseQuery.where(eq(requests.status, statusFilter)).orderBy(desc(requests.created_at))
    : await baseQuery.orderBy(desc(requests.created_at));

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-black tracking-tight text-foreground">Requests</h1>
        <p className="text-muted-foreground text-sm mt-1">Track wanted issues and fulfilled downloads</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={Package} label="Total" value={counts.total} />
        <StatCard icon={Clock} label="Wanted" value={counts.requested} />
        <StatCard icon={Search} label="Searching" value={counts.searching} />
        <StatCard icon={CheckCircle2} label="Fulfilled" value={counts.fulfilled} />
      </div>

      {/* Filters */}
      <RequestFilters activeStatus={statusFilter} />

      {/* Request List */}
      {queue.length === 0 ? (
        <EmptyState
          icon={ShoppingCart}
          title={statusFilter ? `No ${statusFilter} requests` : "No requests yet"}
          description={
            statusFilter
              ? "Try clearing the filter to see all requests."
              : "Request missing issues from a series page and they'll appear here."
          }
          action={
            statusFilter ? (
              <Link href="/requests" className="text-sm text-primary hover:underline">
                Clear filter
              </Link>
            ) : (
              <Link href="/library" className="text-sm text-primary hover:underline">
                Browse library
              </Link>
            )
          }
        />
      ) : (
        <div className="space-y-2">
          {queue.map((req) => {
            const config = STATUS_CONFIG[req.status ?? 'draft'];
            const issueNum = req.issueNumber || req.requestIssueNumber;

            return (
              <div
                key={req.id}
                className="flex items-center gap-3 md:gap-4 rounded border border-border bg-card p-3 md:p-4 hover:bg-accent/50 transition-colors"
              >
                {/* Thumbnail */}
                <div className="w-10 h-14 md:w-12 md:h-16 bg-muted rounded overflow-hidden shrink-0">
                  {req.seriesThumb && (
                    <img src={req.seriesThumb} alt="" className="w-full h-full object-cover" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {req.seriesId ? (
                      <Link
                        href={`/series/${req.seriesId}`}
                        className="font-medium text-foreground hover:underline truncate"
                      >
                        {req.seriesTitle || req.title}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground truncate">{req.title}</span>
                    )}
                    {issueNum && (
                      <span className="text-sm text-muted-foreground shrink-0">#{issueNum}</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                    {req.publisher && <span>{req.publisher}</span>}
                    {req.publisher && <span>·</span>}
                    <span>
                      {req.createdAt
                        ? formatDistanceToNow(new Date(req.createdAt), { addSuffix: true })
                        : '-'}
                    </span>
                    {req.status === 'fulfilled' && req.fulfilledAt && (
                      <>
                        <span>·</span>
                        <span className="text-emerald-400">
                          Fulfilled {formatDistanceToNow(new Date(req.fulfilledAt), { addSuffix: true })}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <span className={`shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${config.className}`}>
                  {config.label}
                </span>

                {/* Actions */}
                {req.status !== 'fulfilled' && (
                  <QueueActions requestId={req.id} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: number }) {
  return (
    <div className="rounded border border-border bg-card p-3 md:p-4">
      <div className="flex items-center gap-2 text-muted-foreground mb-1">
        <Icon className="w-4 h-4" />
        <span className="text-xs">{label}</span>
      </div>
      <span className="text-xl md:text-2xl font-bold text-foreground">{value}</span>
    </div>
  );
}
