import { Suspense } from 'react';
import { HeroHeader } from '@/components/longbox/hero-header';
import { getStoryArcs } from '@/actions/reader-features';
import { Swords, BookOpen } from 'lucide-react';
import Link from 'next/link';
import { EmptyState } from '@/components/longbox/empty-state';

export const dynamic = 'force-dynamic';

async function ArcsList() {
  const arcs = await getStoryArcs();

  if (arcs.length === 0) {
    return (
      <EmptyState
        icon={Swords}
        title="No story arcs found"
        description="Story arcs are extracted from ComicInfo.xml metadata in your comic files. Import comics with arc data to see them here."
      />
    );
  }

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        {arcs.length} arc{arcs.length !== 1 ? 's' : ''} across your library
      </p>

      {arcs.map((arc) => (
        <div key={arc.name} className="rounded border border-border bg-card overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Swords className="w-4 h-4 text-primary/70" />
              <h3 className="font-semibold text-foreground">{arc.name}</h3>
            </div>
            <span className="text-xs text-muted-foreground">
              {arc.books.length} issue{arc.books.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="divide-y divide-border">
            {arc.books.map((book) => (
              <Link
                key={book.id}
                href={`/read/${book.id}`}
                className="flex items-center justify-between p-3 hover:bg-accent/50 transition-colors text-sm"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <BookOpen className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0">
                    <span className="text-foreground truncate block">{book.title}</span>
                    <span className="text-xs text-muted-foreground">{book.seriesName}{book.number ? ` #${book.number}` : ''}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function ArcsPage() {
  return (
    <>
      <HeroHeader title="Story Arcs" />
      <main className="p-6 md:p-8">
        <Suspense fallback={<div className="h-48 bg-muted rounded animate-pulse" />}>
          <ArcsList />
        </Suspense>
      </main>
    </>
  );
}
