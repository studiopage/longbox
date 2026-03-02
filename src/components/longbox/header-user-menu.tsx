'use client';

import { useState } from 'react';
import Link from 'next/link';
import { signOut, useSession } from 'next-auth/react';
import {
  User,
  Settings,
  LogOut,
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserAvatar } from '@/components/longbox/user-avatar';

export function HeaderUserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);

  if (status === 'loading') {
    return <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />;
  }

  if (!session?.user) {
    return (
      <Link href="/login">
        <UserAvatar size="sm" />
      </Link>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button className="hover:opacity-80 transition-opacity rounded-full focus:outline-none focus:ring-2 focus:ring-primary/50">
          <UserAvatar
            src={session.user.image}
            alt={session.user.name || 'User'}
            size="sm"
          />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-56 p-1 bg-popover border-border"
        align="end"
        side="bottom"
        sideOffset={8}
      >
        {/* User info header */}
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
