import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from '@/components/longbox/sidebar';
import { GlobalHeader } from '@/components/longbox/global-header';

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
        <div className="flex min-h-screen w-full bg-background">
          {/* 1. Sidebar on the left */}
          <Sidebar /> 
          
          <div className="flex flex-col flex-1">
            {/* 2. Header on top */}
            <GlobalHeader />
            
            {/* 3. Page Content */}
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
