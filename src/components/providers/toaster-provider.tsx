'use client';

import { Toaster } from 'sonner';
import { useTheme } from '@/components/providers/theme-provider';

export function ToasterProvider() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== 'light';

  return (
    <Toaster
      position="bottom-right"
      expand={false}
      richColors
      closeButton
      theme={isDark ? 'dark' : 'light'}
      toastOptions={{
        className: 'font-sans',
      }}
    />
  );
}
