'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { DynamicIcon } from './icon-picker';
import { getPinnedCollections } from '@/actions/collections';
import type { Collection } from '@/actions/collections';

export function PinnedCollectionsChips() {
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    getPinnedCollections().then(setCollections);
  }, []);

  if (collections.length === 0) return null;

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 -mx-2 px-2 scrollbar-none">
      {collections.map((col) => (
        <Link
          key={col.id}
          href={`/collections/${col.id}`}
          className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(160,180,145,0.15)] hover:bg-[rgba(160,180,145,0.25)] text-[#c0c8b8] text-xs font-medium transition-colors"
        >
          <DynamicIcon name={col.icon} className="w-3.5 h-3.5" />
          <span>{col.name}</span>
          <span className="text-[rgba(255,255,255,0.32)]">{col.itemCount}</span>
        </Link>
      ))}
    </div>
  );
}
