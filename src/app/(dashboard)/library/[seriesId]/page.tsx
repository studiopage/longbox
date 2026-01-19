import { db } from '@/db';
import { books, fileSeries } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import Link from 'next/link';
import { notFound } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function SeriesPage({ params }: { params: Promise<{ seriesId: string }> }) {
  // Fix for Next.js 15 params
  const { seriesId } = await params;

  const seriesData = await db.query.fileSeries.findFirst({
    where: eq(fileSeries.id, seriesId),
    with: {
      books: {
        orderBy: [desc(books.number)], // Order by issue number
      }
    }
  });

  if (!seriesData) notFound();

  return (
    <div className="p-8 max-w-7xl mx-auto text-zinc-100">
      <header className="mb-8 border-b border-zinc-800 pb-6">
        <Link href="/library" className="text-sm text-zinc-500 hover:text-zinc-300 mb-2 block transition">
          ← Back to Library
        </Link>
        <h1 className="text-4xl font-bold tracking-tight">{seriesData.name}</h1>
        <p className="text-zinc-400 mt-2">{seriesData.books.length} issues available</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {seriesData.books.map((book) => (
          <Link 
            key={book.id} 
            href={`/read/${book.id}`}
            className="flex items-start gap-4 p-4 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 transition group"
          >
            {/* Placeholder Thumbnail */}
            <div className="w-16 h-24 bg-zinc-950 border border-zinc-800 rounded flex-shrink-0 flex items-center justify-center text-xs text-zinc-600">
              IMG
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate group-hover:text-blue-400 transition">
                {book.title || `Issue #${book.number}`}
              </h3>
              <div className="flex items-center gap-2 mt-2 text-xs text-zinc-500">
                <span>{book.page_count || 0} pages</span>
                <span>•</span>
                <span>{new Date(book.created_at || Date.now()).toLocaleDateString()}</span>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

