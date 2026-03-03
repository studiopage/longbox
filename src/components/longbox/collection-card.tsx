import Link from 'next/link';
import { Zap, Pin } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { DynamicIcon } from './icon-picker';
import type { Collection } from '@/actions/collections';

interface CollectionCardProps {
  collection: Collection;
}

export function CollectionCard({ collection }: CollectionCardProps) {
  return (
    <Link
      href={`/collections/${collection.id}`}
      className="group relative flex flex-col gap-3"
    >
      {/* 2x2 Cover Mosaic */}
      <div className="aspect-square bg-card rounded border border-border overflow-hidden group-hover:border-primary/30 transition-all duration-200 group-hover:scale-[1.02]">
        {collection.coverBookId ? (
          <div className="w-full h-full grid grid-cols-2 grid-rows-2">
            <div className="overflow-hidden">
              <img
                src={`/api/cover/${collection.coverBookId}`}
                alt=""
                className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity"
                loading="lazy"
              />
            </div>
            {/* Remaining 3 slots show muted placeholder */}
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-[rgba(160,180,145,0.04)] border-l border-t border-[rgba(255,255,255,0.03)]" />
            ))}
          </div>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-[rgba(255,255,255,0.18)] gap-2">
            <DynamicIcon name={collection.icon} className="w-10 h-10" />
          </div>
        )}

        {/* Count badge (top-right) */}
        <div className="absolute top-2 right-2">
          <Badge
            variant="default"
            className="bg-background/85 text-foreground text-xs font-bold border border-border rounded"
          >
            {collection.itemCount}
          </Badge>
        </div>

        {/* Smart indicator (top-left) */}
        {collection.isSmart && (
          <div className="absolute top-2 left-2">
            <Zap className="w-3.5 h-3.5 text-[rgba(160,180,145,0.5)]" />
          </div>
        )}

        {/* Pin indicator */}
        {collection.pinned && (
          <div className="absolute bottom-2 right-2">
            <Pin className="w-3 h-3 text-[rgba(160,180,145,0.4)]" />
          </div>
        )}
      </div>

      {/* Text Info */}
      <div className="flex items-center gap-2">
        <DynamicIcon name={collection.icon} className="w-4 h-4 text-[rgba(160,180,145,0.5)] shrink-0" />
        <h3 className="text-foreground font-medium leading-tight truncate group-hover:text-primary transition text-sm">
          {collection.name}
        </h3>
      </div>
    </Link>
  );
}
