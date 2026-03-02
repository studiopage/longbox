'use client';

import { Toaster } from 'sonner';

export function ToasterProvider() {
  return (
    <Toaster
      position="bottom-right"
      expand={false}
      richColors
      closeButton
      theme="dark"
      toastOptions={{
        style: {
          background: '#18181b',
          border: '1px solid #27272a',
          color: '#fafafa',
        },
        className: 'font-sans',
      }}
    />
  );
}
