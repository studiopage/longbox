'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import { updateUserPreferences } from '@/actions/auth';
import { useSession } from 'next-auth/react';

const THEMES = [
  'light',
  'dark',
  'system',
  'midnight',
  'forest',
  'amber',
  'slate',
  'ocean',
  'rose',
] as const;

export type Theme = (typeof THEMES)[number];

const THEME_CLASSES: Theme[] = ['light', 'dark', 'midnight', 'forest', 'amber', 'slate', 'ocean', 'rose'];

const STORAGE_KEY = 'longbox-theme';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: string;
  themes: readonly string[];
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): string {
  if (typeof window === 'undefined') return 'dark';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function resolveTheme(theme: Theme): string {
  if (theme === 'system') return getSystemTheme();
  return theme;
}

function applyThemeClass(resolved: string) {
  const el = document.documentElement;
  THEME_CLASSES.forEach((t) => el.classList.remove(t));
  el.classList.add(resolved);
}

export function ThemeProvider({
  children,
  defaultTheme = 'dark',
}: {
  children: ReactNode;
  defaultTheme?: Theme;
}) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === 'undefined') return defaultTheme;
    return (localStorage.getItem(STORAGE_KEY) as Theme) || defaultTheme;
  });

  const { data: session } = useSession();

  const resolved = resolveTheme(theme);

  // Apply class on mount and when theme changes
  useEffect(() => {
    applyThemeClass(resolved);
  }, [resolved]);

  // Listen for system theme changes when theme is 'system'
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyThemeClass(getSystemTheme());
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const setTheme = useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme);
      localStorage.setItem(STORAGE_KEY, newTheme);
      applyThemeClass(resolveTheme(newTheme));

      // Persist to DB if we have a session
      if (session?.user?.id) {
        updateUserPreferences(session.user.id, { theme: newTheme }).catch(
          (err) => console.error('[THEME] Failed to persist theme:', err)
        );
      }
    },
    [session?.user?.id]
  );

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme: resolved, themes: THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}
