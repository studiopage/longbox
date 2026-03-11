import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToasterProvider } from '@/components/providers/toaster-provider';
import { SessionProvider } from '@/components/providers/session-provider';
import { ThemeProvider } from '@/components/providers/theme-provider';
import { PWAMeta } from "./pwa-meta";
import { PwaInstallPrompt } from "@/components/longbox/pwa-install-prompt";
import { PwaUpdateBanner } from "@/components/longbox/pwa-update-banner";
import { OfflineIndicator } from "@/components/longbox/offline-indicator";
const inter = Inter({ subsets: ["latin"] });
export const metadata: Metadata = { title: 'Longbox', description: 'Your Personal Comic Server' };

const themeScript = `
(function() {
  try {
    var theme = localStorage.getItem('longbox-theme') || 'dark';
    var resolved = theme;
    if (theme === 'system') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var classes = ['light','dark','midnight','forest','amber','slate','ocean','rose'];
    var cl = document.documentElement.classList;
    classes.forEach(function(c) { cl.remove(c); });
    cl.add(resolved);
  } catch(e) {}
})();
`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <PWAMeta />
      </head>
      <body className={`${inter.className} bg-background text-foreground min-h-screen antialiased`}>
        <SessionProvider>
          <ThemeProvider>
            <OfflineIndicator />
            <PwaUpdateBanner />
            {children}
            <ToasterProvider />
            <PwaInstallPrompt />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
