import { db } from '@/db';
import { series, books } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { BookOpen, Calendar, Building2 } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function SeriesDetailPage({ params }: { params: Promise<{ seriesId: string }> }) {
  const { seriesId } = await params;

  // Fetch Series + Books
  const seriesData = await db
    .select({
      id: series.id,
      name: series.name,
      description: series.description,
      publisher: series.publisher,
      year: series.year,
      thumbnail_url: series.thumbnail_url,
    })
    .from(series)
    .where(eq(series.id, seriesId))
    .limit(1);

  if (!seriesData || seriesData.length === 0) return notFound();

  const currentSeries = seriesData[0];

  // Fetch books for this series
  const seriesBooks = await db
    .select({
      id: books.id,
      title: books.title,
      number: books.number,
      page_count: books.page_count,
      file_path: books.file_path,
      created_at: books.created_at,
    })
    .from(books)
    .where(eq(books.series_id, seriesId))
    .orderBy(asc(books.number));

  return (
    <div className="min-h-screen bg-black text-white">
      {/* --- CINEMATIC HEADER --- */}
      <div className="relative w-full h-[50vh] overflow-hidden">
        {/* Backdrop (Blurred) */}
        <div 
            className="absolute inset-0 bg-cover bg-center blur-2xl opacity-40 scale-110"
            style={{ backgroundImage: `url(${currentSeries.thumbnail_url || '/placeholder.png'})` }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />

        {/* Content Container */}
        <div className="relative z-10 h-full max-w-7xl mx-auto px-8 flex flex-col justify-end pb-12">
            <div className="flex gap-8 items-end">
                {/* Poster Card */}
                <div className="hidden md:block w-48 aspect-[2/3] rounded-lg shadow-2xl overflow-hidden border border-white/10 flex-shrink-0">
                     <img 
                        src={currentSeries.thumbnail_url || '/placeholder.png'} 
                        alt={currentSeries.name}
                        className="w-full h-full object-cover"
                     />
                </div>

                {/* Text Info */}
                <div className="space-y-4 max-w-3xl">
                    <h1 className="text-5xl font-black tracking-tight leading-none">
                        {currentSeries.name}
                    </h1>
                    
                    {/* Metadata Row */}
                    <div className="flex items-center gap-6 text-sm font-bold text-zinc-300">
                        {currentSeries.year && (
                            <span className="flex items-center gap-2"><Calendar className="w-4 h-4"/> {currentSeries.year}</span>
                        )}
                        {currentSeries.publisher && (
                            <span className="flex items-center gap-2"><Building2 className="w-4 h-4"/> {currentSeries.publisher}</span>
                        )}
                        <span className="bg-zinc-800 px-2 py-0.5 rounded text-xs border border-zinc-700">
                            {seriesBooks.length} ISSUES
                        </span>
                    </div>

                    {/* Synopsis */}
                    <p className="text-lg text-zinc-400 line-clamp-3 md:line-clamp-none max-w-2xl">
                        {currentSeries.description || "No synopsis available for this series."}
                    </p>
                </div>
            </div>
        </div>
      </div>

      {/* --- ISSUE LIST --- */}
      <div className="max-w-7xl mx-auto px-8 py-12">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-blue-500" />
            Episodes (Issues)
        </h2>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {seriesBooks.map((book) => (
                <Link 
                    key={book.id} 
                    // LINK TO THE NEW DETAIL PAGE (Not the reader)
                    href={`/library/${currentSeries.id}/issue/${book.id}`} 
                    className="group space-y-3 cursor-pointer"
                >
                    {/* Thumbnail */}
                    <div className="relative aspect-[2/3] bg-zinc-900 rounded-md border border-zinc-800 overflow-hidden group-hover:border-blue-500/50 transition shadow-lg">
                        {/* If we had issue covers, they go here. For now, using series cover or generic */}
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-700 font-black text-4xl opacity-20">
                            #{book.number}
                        </div>
                    </div>

                    {/* Info */}
                    <div>
                        <h3 className="font-bold text-white truncate group-hover:text-blue-400 transition">
                            {book.title || `Issue #${book.number}`}
                        </h3>
                        <div className="flex justify-between text-xs text-zinc-500 mt-1">
                            <span>#{book.number}</span>
                            <span>{book.page_count} Pages</span>
                        </div>
                    </div>
                </Link>
            ))}
        </div>
      </div>
    </div>
  );
}

