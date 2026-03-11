'use client';

import { Check, Sun, Moon, Monitor } from 'lucide-react';
import { useTheme, type Theme } from '@/components/providers/theme-provider';
import { cn } from '@/lib/utils';

interface ThemeOption {
  id: Theme;
  label: string;
  icon?: React.ReactNode;
  colors: {
    bg: string;
    primary: string;
    accent: string;
  };
}

const THEME_OPTIONS: ThemeOption[] = [
  {
    id: 'system',
    label: 'System',
    icon: <Monitor className="w-4 h-4" />,
    colors: { bg: '#1a1a2e', primary: '#a0b891', accent: '#6b7280' },
  },
  {
    id: 'light',
    label: 'Light',
    icon: <Sun className="w-4 h-4" />,
    colors: { bg: '#ffffff', primary: '#1a1a1a', accent: '#f5f5f5' },
  },
  {
    id: 'dark',
    label: 'Dark',
    icon: <Moon className="w-4 h-4" />,
    colors: { bg: '#1e2a2e', primary: '#a0c878', accent: '#2a3a3e' },
  },
  {
    id: 'midnight',
    label: 'Midnight',
    colors: { bg: '#141828', primary: '#7aa0e0', accent: '#1e2640' },
  },
  {
    id: 'forest',
    label: 'Forest',
    colors: { bg: '#0e1a12', primary: '#6aaa5c', accent: '#1a2e1e' },
  },
  {
    id: 'amber',
    label: 'Amber',
    colors: { bg: '#1e1810', primary: '#c8a850', accent: '#2e2818' },
  },
  {
    id: 'slate',
    label: 'Slate',
    colors: { bg: '#202020', primary: '#a0a0a0', accent: '#2e2e2e' },
  },
  {
    id: 'ocean',
    label: 'Ocean',
    colors: { bg: '#101e22', primary: '#60c8c0', accent: '#182e32' },
  },
  {
    id: 'rose',
    label: 'Rose',
    colors: { bg: '#1e1018', primary: '#c87898', accent: '#2e1828' },
  },
];

export function ThemeSelector() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {THEME_OPTIONS.map((opt) => {
          const isActive = theme === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={cn(
                'relative flex flex-col items-center gap-2 p-3 rounded-lg border transition-all',
                'hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isActive
                  ? 'border-primary bg-primary/5 ring-1 ring-primary/30'
                  : 'border-border bg-card'
              )}
            >
              {/* Color preview */}
              <div
                className="w-full aspect-[4/3] rounded-md flex items-end justify-between p-1.5 relative overflow-hidden"
                style={{ backgroundColor: opt.colors.bg }}
              >
                {/* Accent bar */}
                <div
                  className="absolute top-0 left-0 right-0 h-1"
                  style={{ backgroundColor: opt.colors.primary }}
                />
                {/* Mini UI preview */}
                <div className="flex gap-1 w-full">
                  <div
                    className="h-3 rounded-sm flex-1"
                    style={{ backgroundColor: opt.colors.accent }}
                  />
                  <div
                    className="h-3 w-3 rounded-sm"
                    style={{ backgroundColor: opt.colors.primary, opacity: 0.7 }}
                  />
                </div>
                {/* Active check */}
                {isActive && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                    <Check className="w-3 h-3 text-primary-foreground" />
                  </div>
                )}
              </div>
              {/* Label */}
              <span className="flex items-center gap-1.5 text-xs font-medium text-foreground">
                {opt.icon}
                {opt.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
