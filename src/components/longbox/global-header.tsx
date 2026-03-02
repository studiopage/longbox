'use client'

import { SmartSearch } from './smart-search';
import { HeaderUserMenu } from './header-user-menu';

export function GlobalHeader() {
  return (
    <header className="flex h-16 items-center gap-4 bg-transparent px-6">
      {/* The new Omnibar */}
      <div className="flex w-full items-center">
        <SmartSearch />
      </div>

      <div className="ml-auto flex items-center gap-2">
        <HeaderUserMenu />
      </div>
    </header>
  );
}

