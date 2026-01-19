'use client'

import { SmartSearch } from './smart-search';

export function GlobalHeader() {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background px-6 shadow-sm">
      {/* The new Omnibar */}
      <div className="flex w-full items-center">
        <SmartSearch />
      </div>

      <div className="ml-auto flex items-center gap-2">
         {/* User Menu placeholder */}
         <div className="w-8 h-8 rounded-full bg-primary/20" />
      </div>
    </header>
  );
}

