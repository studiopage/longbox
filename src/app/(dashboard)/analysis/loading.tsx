export default function AnalysisLoading() {
  return (
    <div className="p-6 md:p-8 space-y-8">
      <div className="h-32 bg-muted rounded animate-pulse" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-20 bg-muted rounded animate-pulse" />
        ))}
      </div>
      <div className="h-64 bg-muted rounded animate-pulse" />
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-12 bg-muted rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
