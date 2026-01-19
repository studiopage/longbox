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
  CheckCircle2
} from 'lucide-react';

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
    label: 'Import', 
    icon: DownloadCloud, 
    href: '/import',
    matchExact: false,
    disabled: false
  },
  { 
    label: 'Review', 
    icon: CheckCircle2, 
    href: '/review',
    matchExact: false,
    disabled: false
  },
  { 
    label: 'Settings', 
    icon: Settings, 
    href: '/settings',
    matchExact: false,
    disabled: false
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 border-r bg-muted/10 h-screen sticky top-0 flex flex-col hidden md:flex">
      
      {/* BRAND HEADER */}
      <div className="h-16 flex items-center px-6 border-b">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-primary text-primary-foreground rounded-lg flex items-center justify-center">
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
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
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
      </nav>

      {/* FOOTER / STATUS (Optional) */}
      <div className="p-4 border-t text-xs text-muted-foreground">
        <p>Vidiai Longbox v0.2</p>
        <p className="opacity-50">Connected to Local DB</p>
      </div>
    </aside>
  );
}

