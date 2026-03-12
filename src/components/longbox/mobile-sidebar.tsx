'use client'

import { useState } from 'react';
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
  ShieldCheck,
  Swords,
  Menu,
  X
} from 'lucide-react';
import { PinnedCollectionsSidebar } from './pinned-collections-sidebar';

type NavItem = {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  matchExact: boolean;
  disabled?: boolean;
};

type NavGroup = {
  groupLabel?: string;
  items: NavItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    items: [
      { label: 'Dashboard', icon: LayoutGrid, href: '/', matchExact: true },
      { label: 'Library', icon: Library, href: '/library', matchExact: false },
    ],
  },
  {
    groupLabel: 'Browse',
    items: [
      { label: 'Discovery', icon: Compass, href: '/discovery', matchExact: false },
      { label: 'Characters', icon: Users, href: '/discover/characters', matchExact: false },
      { label: 'Collections', icon: Layers, href: '/collections', matchExact: false },
      { label: 'Story Arcs', icon: Swords, href: '/arcs', matchExact: false },
    ],
  },
  {
    groupLabel: 'Queue',
    items: [
      { label: 'Requests', icon: DownloadCloud, href: '/requests', matchExact: false },
      { label: 'Triage', icon: AlertTriangle, href: '/triage', matchExact: false },
    ],
  },
  {
    groupLabel: 'Insights',
    items: [
      { label: 'Activity', icon: Activity, href: '/activity', matchExact: false },
      { label: 'Analysis', icon: BarChart3, href: '/analysis', matchExact: false },
      { label: 'Health', icon: ShieldCheck, href: '/health', matchExact: false },
    ],
  },
  {
    groupLabel: 'Settings',
    items: [
      { label: 'Management', icon: Settings, href: '/settings', matchExact: false },
    ],
  },
];

export function MobileSidebar() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => setIsOpen(!isOpen);
  const closeSidebar = () => setIsOpen(false);

  return (
    <>
      {/* Mobile Header with Hamburger Menu */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-16 bg-background border-b flex items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight" onClick={closeSidebar}>
          <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          Longbox
        </Link>

        <button
          onClick={toggleSidebar}
          className="p-2 hover:bg-accent rounded-md transition"
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeSidebar}
        />
      )}

      {/* Mobile Sidebar Drawer */}
      <aside
        className={cn(
          "md:hidden fixed top-16 left-0 bottom-0 w-64 bg-background border-r z-50 transition-transform duration-300 ease-in-out flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* NAVIGATION LINKS */}
        <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
          {NAV_GROUPS.map((group, gi) => (
            <div key={gi}>
              {group.groupLabel && (
                <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/50">
                  {group.groupLabel}
                </p>
              )}
              <div className="space-y-0.5">
                {group.items.map((route) => {
                  const isActive = route.matchExact
                    ? pathname === route.href
                    : pathname.startsWith(route.href);
                  return (
                    <Link
                      key={route.href}
                      href={route.disabled ? '#' : route.href}
                      onClick={closeSidebar}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded transition-colors",
                        route.disabled && "opacity-50 cursor-not-allowed",
                        isActive
                          ? "bg-primary/10 text-primary"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground"
                      )}
                    >
                      <route.icon className="w-4 h-4" />
                      {route.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* PINNED COLLECTIONS */}
        <PinnedCollectionsSidebar />

        {/* FOOTER / STATUS */}
        <div className="p-4 border-t text-xs text-muted-foreground">
          <p>Vidiai Longbox v0.2</p>
          <p className="opacity-50">Connected to Local DB</p>
        </div>
      </aside>

      {/* Spacer for mobile to push content below fixed header */}
      <div className="md:hidden h-16" />
    </>
  );
}
