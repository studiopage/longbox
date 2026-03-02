import { Sidebar } from '@/components/longbox/sidebar';
import { MobileSidebar } from '@/components/longbox/mobile-sidebar';
import { GlobalHeader } from '@/components/longbox/global-header';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen w-full bg-background overflow-hidden">
      {/* Desktop Sidebar - hidden on mobile */}
      <Sidebar />

      {/* Mobile Sidebar with hamburger menu */}
      <MobileSidebar />

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Floating Header - overlays content, only shown on desktop */}
        <div className="hidden md:block absolute top-0 left-0 right-0 z-10">
          <GlobalHeader />
        </div>

        {/* Page Content - scrollable area with top padding for header */}
        <main className="flex-1 overflow-auto pt-16 md:pt-16">
          {children}
        </main>
      </div>
    </div>
  );
}
