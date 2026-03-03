export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Settings, Zap } from 'lucide-react';
import { getCollection } from '@/actions/collections';
import { HeroHeader } from '@/components/longbox/hero-header';
import { DynamicIcon } from '@/components/longbox/icon-picker';
import { GridCard } from '@/components/longbox/grid-card';
import { EmptyState } from '@/components/longbox/empty-state';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function CollectionDetailPage({ params }: Props) {
  const { id } = await params;
  const collection = await getCollection(id);

  if (!collection) {
    notFound();
  }

  return (
    <div>
      <HeroHeader
        title={collection.name}
        description={collection.description ?? undefined}
        metadata={
          <>
            <span className="flex items-center gap-1.5">
              <DynamicIcon name={collection.icon} className="w-4 h-4" />
              {collection.itemCount} {collection.itemCount === 1 ? 'book' : 'books'}
            </span>
            {collection.isSmart && (
              <span className="flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                Smart Collection
              </span>
            )}
          </>
        }
      >
        <div className="flex gap-3 mt-2">
          <Link
            href="/collections"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs text-[rgba(255,255,255,0.32)] hover:text-[#c0c8b8] hover:bg-[rgba(160,180,145,0.08)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            All Collections
          </Link>
          {collection.isSmart && (
            <Link
              href={`/collections/${id}/edit`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-xs bg-[rgba(160,180,145,0.15)] hover:bg-[rgba(160,180,145,0.25)] text-[#c0c8b8] transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Edit Rules
            </Link>
          )}
        </div>
      </HeroHeader>

      <main className="p-6 md:p-8">
        {collection.items.length === 0 ? (
          <EmptyState
            title="No books in this collection"
            description={
              collection.isSmart
                ? 'No books match the current rules. Try adjusting the conditions.'
                : 'Add books to this collection from the library.'
            }
          />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {collection.items.map((item) => (
              <GridCard
                key={item.id}
                href={`/read/${item.bookId}`}
                imageUrl={`/api/cover/${item.bookId}`}
                title={item.bookTitle}
                subtitle={item.bookNumber ? `#${item.bookNumber}` : undefined}
              />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
