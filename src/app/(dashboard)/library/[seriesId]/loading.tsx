export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header Skeleton */}
      <div className="relative w-full h-[40vh] min-h-[300px] overflow-hidden">
        <div className="absolute inset-0 bg-muted animate-pulse" />

        <div className="relative z-10 h-full max-w-7xl mx-auto px-4 md:px-8 flex flex-col justify-end pb-8 md:pb-12">
          <div className="flex gap-4 md:gap-8 items-end">
            {/* Poster Skeleton */}
            <div className="hidden md:block w-32 md:w-48 aspect-[2/3] rounded bg-muted animate-pulse" />

            {/* Text Info Skeleton */}
            <div className="space-y-4 max-w-3xl">
              <div className="h-12 bg-muted rounded w-3/4 animate-pulse" />
              <div className="flex items-center gap-6">
                <div className="h-5 bg-muted rounded w-24 animate-pulse" />
                <div className="h-5 bg-muted rounded w-32 animate-pulse" />
                <div className="h-5 bg-muted rounded w-20 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 bg-muted rounded w-full animate-pulse" />
                <div className="h-4 bg-muted rounded w-5/6 animate-pulse" />
                <div className="h-4 bg-muted rounded w-4/6 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Issue Grid Skeleton */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <div className="h-8 bg-muted rounded w-48 mb-6 animate-pulse" />

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[2/3] bg-muted rounded-md animate-pulse" />
              <div>
                <div className="h-5 bg-muted rounded w-full mb-2 animate-pulse" />
                <div className="h-4 bg-muted rounded w-3/4 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
