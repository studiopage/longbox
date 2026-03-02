export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { ContinueReading } from '@/components/longbox/continue-reading';
import { StatsOverview } from '@/components/longbox/stats-overview';
import { NeedsAttention } from '@/components/longbox/needs-attention';
import { GapReport } from '@/components/longbox/gap-report';
import { RecentlyAdded } from '@/components/longbox/recently-added';
import { FavoriteCharacters } from '@/components/longbox/favorite-characters';

function SectionSkeleton({ cols = 4 }: { cols?: number }) {
  return (
    <div className={`grid grid-cols-2 md:grid-cols-${cols} gap-4`}>
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="aspect-[2/3] bg-muted rounded animate-pulse" />
      ))}
    </div>
  );
}

export default function HomePage() {
  return (
    <main className="p-6 md:p-8 space-y-8">
      {/* Continue Reading - Top priority for returning users */}
      <Suspense fallback={<SectionSkeleton cols={4} />}>
        <ContinueReading />
      </Suspense>

      {/* Favorite Characters - Quick access to favorites */}
      <FavoriteCharacters />

      {/* Stats Overview */}
      <StatsOverview />

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
