export default function Loading() {
  return (
    <div className="min-h-screen bg-background text-foreground p-8 flex flex-col items-center justify-center">
      <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-3 gap-12 items-center">

        {/* Cover Skeleton */}
        <div className="aspect-[2/3] bg-muted rounded border border-border animate-pulse" />

        {/* Details Skeleton */}
        <div className="md:col-span-2 space-y-8">
          <div>
            <div className="h-4 bg-muted rounded w-48 mb-2 animate-pulse" />
            <div className="h-12 bg-muted rounded w-full animate-pulse" />
          </div>

          <div className="flex gap-8 border-y border-border py-6">
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded w-24 animate-pulse" />
              <div className="h-5 bg-muted rounded w-20 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded w-24 animate-pulse" />
              <div className="h-5 bg-muted rounded w-32 animate-pulse" />
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded w-24 animate-pulse" />
              <div className="h-5 bg-muted rounded w-20 animate-pulse" />
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded w-full animate-pulse" />
              <div className="h-4 bg-muted rounded w-5/6 animate-pulse" />
              <div className="h-4 bg-muted rounded w-4/6 animate-pulse" />
            </div>

            <div className="pt-4 flex items-center gap-4">
              <div className="h-16 bg-muted rounded w-48 animate-pulse" />
              <div className="h-6 bg-muted rounded w-32 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
