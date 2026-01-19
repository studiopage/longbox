'use client'

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Compass, 
  Library, 
  List, 
  Activity, 
  Settings, 
  BookOpen, 
  User 
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { name: 'Discover', href: '/discovery', icon: Compass },
  { name: 'Browse', href: '/browse', icon: BookOpen }, // We will build this later
  { name: 'Requests', href: '/requests', icon: List }, // We will build this later
  { name: 'My Library', href: '/library', icon: Library },
  { name: 'Activity', href: '/activity', icon: Activity },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <div className="w-64 border-r bg-card h-screen fixed left-0 top-0 flex flex-col hidden md:flex">
      <div className="p-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <BookOpen className="w-6 h-6" />
          Longbox
        </h1>
      </div>

      <nav className="flex-1 px-4 space-y-2">
        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link 
              key={item.href} 
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-4 py-3 rounded-md transition-colors text-sm font-medium",
                isActive 
                  ? "bg-primary text-primary-foreground" 
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="w-5 h-5" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t">
        <Link href="/settings" className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
          <Settings className="w-5 h-5" />
          Settings
        </Link>
        <div className="flex items-center gap-3 px-4 py-3 mt-2">
          <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
             <User className="w-4 h-4 text-primary" />
          </div>
          <div className="text-sm">
            <p className="font-medium">Mike Reader</p>
            <p className="text-xs text-muted-foreground">Requester</p>
          </div>
        </div>
      </div>
    </div>
  );
}

