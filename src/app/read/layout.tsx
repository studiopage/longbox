export default function ReaderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Reader has its own isolated layout - no sidebar, no header, just the reader
  return (
    <div className="min-h-screen bg-black">
      {children}
    </div>
  );
}
