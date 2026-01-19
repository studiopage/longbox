export default function BrowsePage() {
  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-left mb-4">Browse Categories</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['Publisher', 'Genre', 'Era', 'Format'].map((cat) => (
            <div key={cat} className="p-6 border rounded-lg hover:bg-accent cursor-pointer">
                <h2 className="text-xl font-bold text-left">{cat}</h2>
                <p className="text-sm text-muted-foreground text-left">Explore comics by {cat.toLowerCase()}.</p>
            </div>
        ))}
      </div>
    </div>
  );
}

