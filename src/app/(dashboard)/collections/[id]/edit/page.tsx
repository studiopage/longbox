export const dynamic = 'force-dynamic';

import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getCollection } from '@/actions/collections';
import { RuleBuilder } from '@/components/longbox/rule-builder';
import type { SmartRules, Condition } from '@/types/longbox';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditCollectionPage({ params }: Props) {
  const { id } = await params;
  const collection = await getCollection(id);

  if (!collection) {
    notFound();
  }

  const smartRules = collection.smartRules as SmartRules | null;

  return (
    <main className="p-6 md:p-8 space-y-6 max-w-2xl">
      {/* Back link */}
      <Link
        href={`/collections/${id}`}
        className="flex items-center gap-1.5 text-sm text-[rgba(255,255,255,0.32)] hover:text-[#c0c8b8] transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {collection.name}
      </Link>

      <h1 className="text-2xl font-bold text-foreground">Edit Collection</h1>

      <RuleBuilder
        collectionId={id}
        initialValues={{
          name: collection.name,
          icon: collection.icon,
          match: smartRules?.match ?? 'all',
          conditions: (smartRules?.conditions as Condition[]) ?? [],
          sortPreference: collection.sortPreference,
          pinned: collection.pinned,
          description: collection.description,
        }}
      />
    </main>
  );
}
