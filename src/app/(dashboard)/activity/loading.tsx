export default function ActivityLoading() {
  return (
    <div className="p-6 md:p-8 space-y-6">
      <div className="h-32 bg-muted rounded animate-pulse" />
      <div className="flex gap-3">
        <div className="h-9 w-32 bg-muted rounded animate-pulse" />
        <div className="h-9 w-32 bg-muted rounded animate-pulse" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-14 bg-muted rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
