export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { ContinueReading } from '@/components/longbox/continue-reading';
import { StatsOverview } from '@/components/longbox/stats-overview';
import { RecentActivity } from '@/components/longbox/recent-activity';
import { NeedsAttention } from '@/components/longbox/needs-attention';
import { GapReport } from '@/components/longbox/gap-report';
import { RecentlyAdded } from '@/components/longbox/recently-added';
import { FavoriteCharacters } from '@/components/longbox/favorite-characters';
import { PinnedCollectionsChips } from '@/components/longbox/pinned-collections-chips';
import { ReadingStreakWidget } from '@/components/longbox/reading-streak-widget';
import { seedStarterCollections } from '@/actions/collections';
import { auth } from '@/lib/auth';

function SectionSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${cols} gap-4`}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="aspect-[2/3] bg-muted rounded animate-pulse" />
      ))}
    </div>
  );
}

export default async function HomePage() {
  // Seed starter smart collections on first visit (idempotent)
  const session = await auth();
  if (session?.user?.id) {
    await seedStarterCollections(session.user.id);
  }

  return (
    <main className="p-6 md:p-8 space-y-8">
      {/* Pinned Collection Chips - Mobile quick access */}
      <Suspense fallback={<div className="h-10" />}>
        <PinnedCollectionsChips />
      </Suspense>

      {/* Continue Reading - Top priority for returning users */}
      <Suspense fallback={<SectionSkeleton cols={4} />}>
        <ContinueReading />
      </Suspense>

      {/* Favorite Characters - Quick access to favorites */}
      <FavoriteCharacters />

      {/* Reading Streak */}
      <Suspense fallback={<div className="h-24 bg-muted rounded animate-pulse" />}>
        <ReadingStreakWidget />
      </Suspense>

      {/* Stats Overview */}
      <StatsOverview />

      {/* Recent Activity */}
      <Suspense fallback={<div className="h-48 bg-muted rounded animate-pulse" />}>
        <RecentActivity />
      </Suspense>

      {/* Two-column layout: Needs Attention + Collection Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Suspense fallback={<div className="h-64 bg-muted rounded animate-pulse" />}>
          <NeedsAttention />
        </Suspense>
        <Suspense fallback={<div className="h-64 bg-muted rounded animate-pulse" />}>
          <GapReport />
        </Suspense>
      </div>

      {/* Recently Added */}
      <Suspense fallback={<SectionSkeleton cols={6} />}>
        <RecentlyAdded />
      </Suspense>
    </main>
  );
}
