export default function Loading() {
  return (
    <div className="p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div className="h-10 bg-muted rounded w-48 animate-pulse" />
        <div className="h-5 bg-muted rounded w-24 animate-pulse" />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} className="space-y-3">
            <div className="aspect-[2/3] bg-muted rounded animate-pulse" />
            <div>
              <div className="h-5 bg-muted rounded w-full mb-2 animate-pulse" />
              <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
