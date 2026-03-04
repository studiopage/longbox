export const dynamic = 'force-dynamic';

import { getTriageItems, getTriageCounts } from '@/actions/triage';
import { TriageGroupCard } from '@/components/longbox/triage-group-card';
import { EmptyState } from '@/components/longbox/empty-state';
import { CheckCircle2, AlertTriangle, Clock } from 'lucide-react';

export default async function TriagePage() {
  const [groups, counts] = await Promise.all([
    getTriageItems(),
    getTriageCounts(),
  ]);

  return (
    <main className="p-6 md:p-8 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">Triage</h1>
        <p className="text-muted-foreground mt-1">
          Review and assign unmatched files to series
        </p>
      </div>

      {/* Stats chips — only show when there are items */}
      {counts.pending > 0 && (
        <div className="flex flex-wrap gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(160,180,145,0.15)] text-xs font-medium text-[#c0c8b8]">
            <Clock className="w-3.5 h-3.5" />
            {counts.pending} pending
          </div>
          {counts.high > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-xs font-medium text-primary">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {counts.high} high confidence
            </div>
          )}
          {counts.medium > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-500/10 text-xs font-medium text-yellow-500/70">
              <AlertTriangle className="w-3.5 h-3.5" />
              {counts.medium} medium
            </div>
          )}
          {counts.low > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-destructive/10 text-xs font-medium text-destructive/70">
              <AlertTriangle className="w-3.5 h-3.5" />
              {counts.low} low
            </div>
          )}
        </div>
      )}

      {/* Groups or empty state */}
      {groups.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="All caught up"
          description="No files need triage. Run a scan to detect new files."
        />
      ) : (
        <div className="space-y-4">
          {groups.map((group) => (
            <TriageGroupCard key={group.folderPath} group={group} />
          ))}
        </div>
      )}
    </main>
  );
}
