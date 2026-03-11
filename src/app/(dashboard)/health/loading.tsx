export default function HealthLoading() {
  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="h-[40vh] min-h-[300px] bg-muted rounded animate-pulse" />
      <div className="h-12 bg-muted rounded animate-pulse w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-muted rounded animate-pulse" />
        ))}
      </div>
    </div>
  );
}
