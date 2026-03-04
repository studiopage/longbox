'use client';

import { useState, useEffect, useRef } from 'react';
import { Activity } from 'lucide-react';
import { getActivityEvents, type ActivityEvent } from '@/actions/activity';
import { ActivityEventRow } from '@/components/longbox/activity-event-row';
import { EmptyState } from '@/components/longbox/empty-state';
import { HeroHeader } from '@/components/longbox/hero-header';

const TYPE_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'scans', label: 'Scans' },
  { value: 'matches', label: 'Matches' },
  { value: 'triage', label: 'Triage' },
  { value: 'reading', label: 'Reading' },
  { value: 'errors', label: 'Errors' },
];

const SEVERITY_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'info', label: 'Info' },
  { value: 'warning', label: 'Warning' },
  { value: 'error', label: 'Error' },
];

function groupByDate(events: ActivityEvent[]): Map<string, ActivityEvent[]> {
  const groups = new Map<string, ActivityEvent[]>();
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 86400000);

  for (const event of events) {
    if (!event.createdAt) continue;

    const eventDate = new Date(event.createdAt);
    const eventDay = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    let label: string;
    if (eventDay.getTime() === today.getTime()) {
      label = 'Today';
    } else if (eventDay.getTime() === yesterday.getTime()) {
      label = 'Yesterday';
    } else {
      label = eventDay.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    }

    const existing = groups.get(label);
    if (existing) {
      existing.push(event);
    } else {
      groups.set(label, [event]);
    }
  }

  return groups;
}

export default function ActivityPage() {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [typeFilter, setTypeFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const pageRef = useRef(1);
  const filterKeyRef = useRef(`${typeFilter}:${severityFilter}`);

  useEffect(() => {
    const currentKey = `${typeFilter}:${severityFilter}`;
    const isFilterChange = currentKey !== filterKeyRef.current;
    filterKeyRef.current = currentKey;

    if (isFilterChange) {
      pageRef.current = 1;
    }

    let cancelled = false;
    async function load() {
      setLoading(true);
      const result = await getActivityEvents({
        type: typeFilter,
        severity: severityFilter,
        page: isFilterChange ? 1 : pageRef.current,
      });
      if (!cancelled) {
        setEvents(isFilterChange ? result.events : (prev => [...prev, ...result.events]));
        setHasMore(result.hasMore);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [typeFilter, severityFilter]);

  const loadMore = () => {
    pageRef.current += 1;
    // Trigger re-fetch by toggling a counter
    setLoading(true);
    getActivityEvents({
      type: typeFilter,
      severity: severityFilter,
      page: pageRef.current,
    }).then(result => {
      setEvents(prev => [...prev, ...result.events]);
      setHasMore(result.hasMore);
      setLoading(false);
    });
  };

  const grouped = groupByDate(events);

  return (
    <>
      <HeroHeader title="Activity" />
      <main className="p-6 md:p-8 space-y-6">
        {/* Filter bar */}
        <div className="flex flex-wrap gap-3">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="h-9 px-3 rounded border border-border bg-card text-sm text-foreground"
          >
            {TYPE_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
          <select
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-9 px-3 rounded border border-border bg-card text-sm text-foreground"
          >
            {SEVERITY_FILTERS.map(f => (
              <option key={f.value} value={f.value}>{f.label}</option>
            ))}
          </select>
        </div>

        {/* Event list grouped by date */}
        {events.length === 0 && !loading ? (
          <EmptyState
            icon={Activity}
            title="No activity recorded yet"
            description="Events will appear here as you use Longbox."
          />
        ) : (
          <div className="space-y-6">
            {Array.from(grouped.entries()).map(([dateLabel, dateEvents]) => (
              <div key={dateLabel}>
                <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
                  {dateLabel}
                </h3>
                <div className="rounded border border-border bg-card p-4 space-y-1">
                  {dateEvents.map((event) => (
                    <ActivityEventRow
                      key={event.id}
                      type={event.type}
                      message={event.message}
                      severity={event.severity}
                      createdAt={event.createdAt}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="flex justify-center">
            <button
              onClick={loadMore}
              disabled={loading}
              className="px-4 py-2 text-sm rounded border border-border bg-card hover:bg-accent/50 transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load more'}
            </button>
          </div>
        )}
      </main>
    </>
  );
}
