import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ToasterProvider } from '@/components/providers/toaster-provider';
import { SessionProvider } from '@/components/providers/session-provider';

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: 'Longbox',
  description: 'Your Personal Comic Server',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-background text-foreground min-h-screen antialiased`}>
        <SessionProvider>
          {children}
        </SessionProvider>
        <ToasterProvider />
      </body>
    </html>
  );
}
