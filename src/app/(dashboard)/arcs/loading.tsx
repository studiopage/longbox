export default function ArcsLoading() {
  return (
    <div className="space-y-6 p-6 md:p-8">
      <div className="h-[40vh] min-h-[300px] bg-muted rounded animate-pulse" />
      {[...Array(3)].map((_, i) => (
        <div key={i} className="h-32 bg-muted rounded animate-pulse" />
      ))}
    </div>
  );
}
