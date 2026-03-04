import { Suspense } from 'react';
import {
  Library,
  BookOpen,
  HardDrive,
  FileText,
  CheckCircle2,
  CircleDashed,
  TrendingUp,
  Flame,
} from 'lucide-react';
import { HeroHeader } from '@/components/longbox/hero-header';
import {
  getLibraryComposition,
  getMetadataHealth,
  getSeriesCompletion,
  getReadingStats,
} from '@/actions/analysis';
import { StatProgressBar } from '@/components/longbox/stat-progress-bar';
import { ReadingSparkline } from '@/components/longbox/reading-sparkline';
import { PublisherChart } from '@/components/longbox/publisher-chart';

export const dynamic = 'force-dynamic';

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function SectionSkeleton() {
  return <div className="h-48 bg-muted rounded animate-pulse" />;
}

async function CompositionSection() {
  const data = await getLibraryComposition();

  const statCards = [
    { label: 'Series', value: data.totalSeries.toLocaleString(), icon: Library },
    { label: 'Issues', value: data.totalBooks.toLocaleString(), icon: BookOpen },
    { label: 'Total Size', value: formatBytes(data.totalFileSize), icon: HardDrive },
    { label: 'Avg Pages', value: String(data.avgPageCount), icon: FileText },
  ];

  return (
    <section className="space-y-6">
      <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
        <Library className="w-5 h-5 text-primary" />
        Library Composition
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((stat) => (
          <div key={stat.label} className="rounded border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <stat.icon className="w-5 h-5 text-primary/70" />
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
            <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
      {data.publisherBreakdown.length > 0 && (
        <div className="rounded border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Publishers (by issue count)</h3>
          <PublisherChart data={data.publisherBreakdown} />
        </div>
      )}
      {data.decadeBreakdown.length > 0 && (
        <div className="rounded border border-border bg-card p-4 space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Issues by Decade</h3>
          <PublisherChart data={data.decadeBreakdown.map(d => ({ name: d.decade, count: d.count }))} />
        </div>
      )}
    </section>
  );
}

async function HealthSection() {
  const data = await getMetadataHealth();

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
        <CheckCircle2 className="w-5 h-5 text-primary" />
        Metadata Health
      </h2>
      <div className="rounded border border-border bg-card p-4 space-y-4">
        <StatProgressBar label="ComicVine Linked" current={data.seriesWithCvId} total={data.totalSeries} />
        <StatProgressBar label="Has Credits" current={data.booksWithCredits} total={data.totalBooks} />
        <StatProgressBar label="Has Page Data" current={data.booksWithPages} total={data.totalBooks} />
      </div>
      {data.booksFlagged > 0 && (
        <p className="text-sm text-muted-foreground">
          {data.booksFlagged} book{data.booksFlagged !== 1 ? 's' : ''} flagged for review
        </p>
      )}
    </section>
  );
}

async function CompletionSection() {
  const data = await getSeriesCompletion();
  const hasData = data.complete + data.almostComplete + data.inProgress > 0;

  const statCards = [
    { label: 'Complete', value: data.complete, icon: CheckCircle2, color: 'text-green-500/70' },
    { label: 'Almost', value: data.almostComplete, icon: TrendingUp, color: 'text-yellow-500/70' },
    { label: 'In Progress', value: data.inProgress, icon: CircleDashed, color: 'text-primary/50' },
  ];

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
        <CircleDashed className="w-5 h-5 text-primary" />
        Series Completion
      </h2>
      {!hasData ? (
        <p className="text-sm text-muted-foreground">No series with known issue counts yet. Link series to ComicVine for completion tracking.</p>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-4">
            {statCards.map((stat) => (
              <div key={stat.label} className="rounded border border-border bg-card p-4 text-center">
                <stat.icon className={`w-5 h-5 mx-auto mb-1 ${stat.color}`} />
                <span className="text-2xl font-bold block">{stat.value}</span>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
          {data.topAlmostComplete.length > 0 && (
            <div className="rounded border border-border bg-card overflow-hidden">
              <div className="p-3 border-b border-border">
                <h3 className="text-sm font-medium text-muted-foreground">Almost Complete</h3>
              </div>
              <div className="divide-y divide-border">
                {data.topAlmostComplete.map((s) => (
                  <div key={s.id} className="flex items-center justify-between p-3 text-sm">
                    <span className="truncate flex-1">{s.name}</span>
                    <span className="text-muted-foreground ml-2 shrink-0">
                      {s.ownedCount}/{s.totalIssues} ({s.percentage}%)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

async function ReadingSection() {
  const data = await getReadingStats();
  const hasData = data.totalCompleted + data.totalInProgress > 0;

  return (
    <section className="space-y-4">
      <h2 className="text-lg font-semibold tracking-tight flex items-center gap-2">
        <BookOpen className="w-5 h-5 text-primary" />
        Reading Stats
      </h2>
      {!hasData ? (
        <p className="text-sm text-muted-foreground">Start reading to see your stats here.</p>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <CheckCircle2 className="w-5 h-5 text-primary/70" />
                <span className="text-2xl font-bold">{data.totalCompleted}</span>
              </div>
              <p className="text-xs text-muted-foreground">Books Read</p>
            </div>
            <div className="rounded border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <BookOpen className="w-5 h-5 text-primary/50" />
                <span className="text-2xl font-bold">{data.totalInProgress}</span>
              </div>
              <p className="text-xs text-muted-foreground">In Progress</p>
            </div>
            <div className="rounded border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <FileText className="w-5 h-5 text-primary/50" />
                <span className="text-2xl font-bold">{data.totalPagesRead.toLocaleString()}</span>
              </div>
              <p className="text-xs text-muted-foreground">Pages Read</p>
            </div>
            <div className="rounded border border-border bg-card p-4">
              <div className="flex items-center justify-between mb-2">
                <Flame className="w-5 h-5 text-orange-500/70" />
                <span className="text-2xl font-bold">{data.currentStreak}</span>
              </div>
              <p className="text-xs text-muted-foreground">Day Streak</p>
            </div>
          </div>
          {data.weeklyPace.length > 1 && (
            <div className="rounded border border-border bg-card p-4 space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">Books Completed per Week (12 weeks)</h3>
              <ReadingSparkline data={data.weeklyPace} />
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default function AnalysisPage() {
  return (
    <>
      <HeroHeader title="Analysis" />
      <main className="p-6 md:p-8 space-y-10">
        <Suspense fallback={<SectionSkeleton />}>
          <CompositionSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <HealthSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <CompletionSection />
        </Suspense>
        <Suspense fallback={<SectionSkeleton />}>
          <ReadingSection />
        </Suspense>
      </main>
    </>
  );
}
