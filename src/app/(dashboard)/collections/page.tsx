export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Plus, Layers } from 'lucide-react';
import { getCollections } from '@/actions/collections';
import { CollectionCard } from '@/components/longbox/collection-card';
import { EmptyState } from '@/components/longbox/empty-state';

export default async function CollectionsPage() {
  const collections = await getCollections();

  const pinned = collections.filter((c) => c.pinned);
  const all = collections;

  return (
    <main className="p-6 md:p-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">Collections</h1>
        <Link
          href="/collections/new"
          className="flex items-center gap-2 px-3 py-2 rounded-md bg-[rgba(160,180,145,0.15)] hover:bg-[rgba(160,180,145,0.25)] text-[#c0c8b8] text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New
        </Link>
      </div>

      {collections.length === 0 ? (
        <EmptyState
          icon={Layers}
          title="No collections yet"
          description="Create a smart collection to automatically organize your library, or a manual collection to curate your own."
          action={
            <Link
              href="/collections/new"
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-[rgba(160,180,145,0.2)] hover:bg-[rgba(160,180,145,0.3)] text-[#c0c8b8] text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Create Collection
            </Link>
          }
        />
      ) : (
        <>
          {/* Pinned section */}
          {pinned.length > 0 && (
            <section>
              <h2 className="text-xs font-medium text-[rgba(255,255,255,0.32)] uppercase tracking-wider mb-4">
                Pinned
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {pinned.map((collection) => (
                  <CollectionCard key={collection.id} collection={collection} />
                ))}
              </div>
            </section>
          )}

          {/* All collections */}
          <section>
            <h2 className="text-xs font-medium text-[rgba(255,255,255,0.32)] uppercase tracking-wider mb-4">
              All Collections
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {all.map((collection) => (
                <CollectionCard key={collection.id} collection={collection} />
              ))}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
