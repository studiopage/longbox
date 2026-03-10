'use client';

import Link from 'next/link';

const FILTERS = [
  { value: undefined, label: 'All' },
  { value: 'requested', label: 'Wanted' },
  { value: 'searching', label: 'Searching' },
  { value: 'fulfilled', label: 'Fulfilled' },
] as const;

export function RequestFilters({ activeStatus }: { activeStatus?: string }) {
  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {FILTERS.map((f) => {
        const isActive = activeStatus === f.value;
        const href = f.value ? `/requests?status=${f.value}` : '/requests';

        return (
          <Link
            key={f.label}
            href={href}
            className={`shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary text-muted-foreground hover:text-foreground hover:bg-accent'
            }`}
          >
            {f.label}
          </Link>
        );
      })}
    </div>
  );
}
