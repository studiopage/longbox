'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import {
  LayoutGrid,
  Compass,
  DownloadCloud,
  Settings,
  Library,
  BookOpen,
  Users,
  Layers,
  AlertTriangle,
  Activity,
  BarChart3,
} from 'lucide-react';
import { UserMenu } from './user-menu';
import { PinnedCollectionsSidebar } from './pinned-collections-sidebar';

const ROUTES: Array<{
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  matchExact: boolean;
  disabled?: boolean;
}> = [
  {
    label: 'Dashboard',
    icon: LayoutGrid,
    href: '/',
    matchExact: true,
    disabled: false
  },
  {
    label: 'Discovery',
    icon: Compass,
    href: '/discovery',
    matchExact: false,
    disabled: false
  },
  {
    label: 'Characters',
    icon: Users,
    href: '/discover/characters',
    matchExact: false,
    disabled: false
  },
  {
    label: 'Requests',
    icon: DownloadCloud,
    href: '/requests',
    matchExact: false,
    disabled: false
  },
  {
    label: 'Library',
    icon: Library,
    href: '/library',
    matchExact: false,
    disabled: false
  },
  {
    label: 'Collections',
    icon: Layers,
    href: '/collections',
    matchExact: false,
    disabled: false
  },
  {
    label: 'Triage',
    icon: AlertTriangle,
    href: '/triage',
    matchExact: false,
    disabled: false
  },
  {
    label: 'Activity',
    icon: Activity,
    href: '/activity',
    matchExact: false,
    disabled: false
  },
  {
    label: 'Analysis',
    icon: BarChart3,
    href: '/analysis',
    matchExact: false,
    disabled: false
  },
  {
    label: 'Management',
    icon: Settings,
    href: '/settings',
    matchExact: false,
    disabled: false
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r border-sidebar-border bg-sidebar h-screen sticky top-0 flex flex-col hidden md:flex">

      {/* BRAND HEADER */}
      <div className="h-16 flex items-center px-6">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight text-foreground">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded flex items-center justify-center">
                <BookOpen className="w-5 h-5" />
            </div>
            Longbox
        </Link>
      </div>

      {/* NAVIGATION LINKS */}
      <nav className="flex-1 p-4 space-y-1">
        {ROUTES.map((route) => {
          const isActive = route.matchExact
            ? pathname === route.href
            : pathname.startsWith(route.href);

          return (
            <Link
              key={route.href}
              href={route.disabled ? '#' : route.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded transition-all duration-200 ease-out",
                route.disabled && "opacity-50 cursor-not-allowed",
                isActive
                  ? "bg-primary/15 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
              )}
            >
              <route.icon className="w-4 h-4" />
              {route.label}
            </Link>
          );
        })}
      </nav>

      {/* PINNED COLLECTIONS */}
      <PinnedCollectionsSidebar />

      {/* USER MENU */}
      <div className="p-3 border-t border-sidebar-border">
        <UserMenu />
      </div>
    </aside>
  );
}

