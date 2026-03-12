export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import { ReadingHero } from '@/components/longbox/reading-hero';
import { ContinueReading } from '@/components/longbox/continue-reading';
import { LibrarySnapshot } from '@/components/longbox/library-snapshot';
import { RecentlyAdded } from '@/components/longbox/recently-added';
import { NeedsAttention } from '@/components/longbox/needs-attention';
import { GapReport } from '@/components/longbox/gap-report';
import { PinnedCollectionsChips } from '@/components/longbox/pinned-collections-chips';
import { seedStarterCollections } from '@/actions/collections';
import { auth } from '@/lib/auth';

export default async function HomePage() {
  const session = await auth();
  if (session?.user?.id) {
    await seedStarterCollections(session.user.id);
  }

  return (
    <main className="p-6 md:p-8 space-y-6">
      {/* Pinned Collection Chips - Mobile quick access */}
      <Suspense fallback={<div className="h-10" />}>
        <PinnedCollectionsChips />
      </Suspense>

      {/* Reading Hero - most recent in-progress book */}
      <Suspense fallback={<div className="h-40 bg-card border border-border rounded-lg animate-pulse" />}>
        <ReadingHero />
      </Suspense>

      {/* Continue Reading - remaining in-progress (offset past the hero) */}
      <Suspense fallback={null}>
        <ContinueReading offset={1} />
      </Suspense>

      {/* Library Snapshot - stats + streak in one bar */}
      <Suspense fallback={<div className="h-20 bg-card border border-border rounded animate-pulse" />}>
        <LibrarySnapshot />
      </Suspense>

      {/* Recently Added */}
      <Suspense fallback={<div className="h-32 bg-card border border-border rounded animate-pulse" />}>
        <RecentlyAdded />
      </Suspense>

      {/* Library Status - maintenance section, de-emphasised */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Suspense fallback={<div className="h-48 bg-card border border-border rounded animate-pulse" />}>
          <NeedsAttention />
        </Suspense>
        <Suspense fallback={<div className="h-48 bg-card border border-border rounded animate-pulse" />}>
          <GapReport />
        </Suspense>
      </div>
    </main>
  );
}
