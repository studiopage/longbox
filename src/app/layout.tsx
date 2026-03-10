import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToasterProvider } from '@/components/providers/toaster-provider';
import { SessionProvider } from '@/components/providers/session-provider';
import { PWAMeta } from "./pwa-meta";
import { PwaInstallPrompt } from "@/components/longbox/pwa-install-prompt";
import { PwaUpdateBanner } from "@/components/longbox/pwa-update-banner";
import { OfflineIndicator } from "@/components/longbox/offline-indicator";
const inter = Inter({ subsets: ["latin"] });
export const metadata: Metadata = { title: 'Longbox', description: 'Your Personal Comic Server' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <head><PWAMeta /></head>
      <body className={`${inter.className} bg-background text-foreground min-h-screen antialiased`}>
        <OfflineIndicator />
        <PwaUpdateBanner />
        <SessionProvider>{children}</SessionProvider>
        <ToasterProvider />
        <PwaInstallPrompt />
      </body>
    </html>
  );
}
