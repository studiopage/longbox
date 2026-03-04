import { unstable_noStore as noStore } from 'next/cache';
import { ArrowRight, Activity } from 'lucide-react';
import Link from 'next/link';
import { getRecentActivity } from '@/actions/activity';
import { ActivityEventRow } from './activity-event-row';
import { EmptyState } from './empty-state';

export async function RecentActivity() {
  noStore();

  const events = await getRecentActivity(5);

  if (events.length === 0) {
    return (
      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Recent Activity
        </h2>
        <EmptyState
          icon={Activity}
          title="No activity yet"
          description="Run a scan to get started."
        />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          Recent Activity
        </h2>
        <Link
          href="/activity"
          className="text-xs text-primary hover:underline flex items-center"
        >
          View All <ArrowRight className="w-3 h-3 ml-1" />
        </Link>
      </div>
      <div className="rounded border border-border bg-card p-4 space-y-1">
        {events.map((event) => (
          <ActivityEventRow
            key={event.id}
            type={event.type}
            message={event.message}
            severity={event.severity}
            createdAt={event.createdAt}
          />
        ))}
      </div>
    </section>
  );
}
