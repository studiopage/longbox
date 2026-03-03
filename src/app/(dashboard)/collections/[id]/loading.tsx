export default function CollectionDetailLoading() {
  return (
    <div>
      {/* Hero skeleton */}
      <div className="relative w-full h-[40vh] min-h-[300px] bg-muted animate-pulse" />

      {/* Content skeleton */}
      <main className="p-6 md:p-8">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="space-y-3">
              <div className="aspect-[2/3] bg-muted rounded animate-pulse" />
              <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
