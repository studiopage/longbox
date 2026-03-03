'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { ChevronRight } from 'lucide-react';
import { DynamicIcon } from './icon-picker';
import { getPinnedCollections } from '@/actions/collections';
import type { Collection } from '@/actions/collections';

export function PinnedCollectionsSidebar() {
  const pathname = usePathname();
  const [collections, setCollections] = useState<Collection[]>([]);

  useEffect(() => {
    getPinnedCollections().then(setCollections);
  }, []);

  if (collections.length === 0) return null;

  return (
    <div className="px-4 mt-2">
      <div className="text-[10px] font-medium text-[rgba(255,255,255,0.18)] uppercase tracking-wider px-3 mb-1">
        Collections
      </div>
      <div className="space-y-0.5">
        {collections.map((col) => {
          const isActive = pathname === `/collections/${col.id}`;
          return (
            <Link
              key={col.id}
              href={`/collections/${col.id}`}
              className={cn(
                'flex items-center gap-2.5 px-3 py-1.5 text-xs font-medium rounded transition-all duration-200 ease-out',
                isActive
                  ? 'bg-primary/15 text-primary'
                  : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'
              )}
            >
              <DynamicIcon name={col.icon} className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate flex-1">{col.name}</span>
              <span className="text-[10px] text-[rgba(255,255,255,0.18)]">{col.itemCount}</span>
            </Link>
          );
        })}
        <Link
          href="/collections"
          className="flex items-center gap-2.5 px-3 py-1.5 text-xs text-[rgba(255,255,255,0.25)] hover:text-[rgba(255,255,255,0.5)] transition-colors"
        >
          <ChevronRight className="w-3 h-3" />
          All Collections
        </Link>
      </div>
    </div>
  );
}
