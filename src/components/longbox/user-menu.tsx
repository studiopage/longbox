'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import {
  User,
  Settings,
  LogOut,
  ChevronUp,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserAvatar } from '@/components/longbox/user-avatar';
import { cn } from '@/lib/utils';

export function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  if (status === 'loading') {
    return (
      <div className="flex items-center gap-3 px-3 py-2">
        <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        <div className="flex-1">
          <div className="h-4 w-20 bg-muted rounded animate-pulse" />
        </div>
      </div>
    );
  }

  if (!session?.user) {
    return (
      <Link
        href="/login"
        className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
      >
        <UserAvatar size="sm" />
        <span>Sign In</span>
      </Link>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors">
          {/* Avatar */}
          <UserAvatar
            src={session.user.image}
            alt={session.user.name || 'User'}
            size="sm"
          />

          {/* Name */}
          <div className="flex-1 text-left min-w-0">
            <div className="truncate">{session.user.name || 'User'}</div>
            <div className="text-xs text-muted-foreground truncate">{session.user.email}</div>
          </div>

          {/* Chevron */}
          <ChevronUp className={cn(
            'w-4 h-4 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )} />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-56 p-1 bg-popover border-border"
        align="start"
        side="top"
        sideOffset={8}
      >
        {/* User info header in popover */}
        <div className="px-3 py-2 border-b border-border mb-1">
          <div className="flex items-center gap-3">
            <UserAvatar
              src={session.user.image}
              alt={session.user.name || 'User'}
              size="md"
            />
            <div className="flex-1 min-w-0">
              <div className="font-medium text-popover-foreground truncate">
                {session.user.name || 'User'}
              </div>
              <div className="text-xs text-muted-foreground truncate">
                {session.user.email}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col">
          <Link
            href="/profile"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-foreground rounded transition-colors"
          >
            <User className="w-4 h-4" />
            Profile
          </Link>

          <Link
            href="/profile/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2 text-sm text-popover-foreground hover:bg-accent hover:text-foreground rounded transition-colors"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Link>

          <div className="h-px bg-border my-1" />

          <button
            onClick={() => signOut({ callbackUrl: '/login' })}
            className="flex items-center gap-2 px-3 py-2 text-sm text-destructive hover:bg-destructive/10 rounded transition-colors w-full text-left"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
