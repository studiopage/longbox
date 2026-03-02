export default function SeriesLoading() {
  return (
    <div className="p-8 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 bg-muted rounded" />
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-muted rounded" />
          <div className="h-8 w-8 bg-muted rounded" />
        </div>
      </div>

      {/* Series Info */}
      <div className="flex gap-6 items-start">
        {/* Cover */}
        <div className="hidden md:block w-40 flex-shrink-0">
          <div className="aspect-[2/3] bg-muted rounded" />
        </div>

        {/* Details */}
        <div className="flex-1 space-y-4 pt-1">
          <div className="h-3 w-40 bg-muted rounded" />
          <div className="h-8 w-64 bg-muted rounded" />
          <div className="flex items-center gap-3">
            <div className="h-5 w-20 bg-muted rounded" />
            <div className="h-5 w-20 bg-muted rounded" />
          </div>
          <div className="space-y-2">
            <div className="h-4 w-full max-w-xl bg-muted rounded" />
            <div className="h-4 w-3/4 max-w-md bg-muted rounded" />
          </div>
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid lg:grid-cols-[1fr_300px] gap-6 pt-4">
        {/* Issues Grid */}
        <div>
          <div className="h-6 w-24 bg-muted rounded mb-4" />
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i}>
                <div className="aspect-[2/3] bg-muted rounded" />
                <div className="mt-2 h-4 bg-muted rounded w-3/4" />
                <div className="mt-1 h-3 bg-muted rounded w-1/2" />
              </div>
            ))}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <div className="h-6 w-28 bg-muted rounded" />
          <div className="border border-border rounded p-4 space-y-3">
            <div className="h-4 w-full bg-muted rounded" />
            <div className="h-4 w-2/3 bg-muted rounded" />
            <div className="h-4 w-3/4 bg-muted rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
