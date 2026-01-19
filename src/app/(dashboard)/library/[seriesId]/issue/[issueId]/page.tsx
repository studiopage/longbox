import { db } from '@/db';
import { books, series } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { Play, ArrowLeft, BookOpen, Clock } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function IssueDetailPage({ params }: { params: Promise<{ seriesId: string; issueId: string }> }) {
  const { seriesId, issueId } = await params;

  // Fetch Book + Parent Series
  const bookResult = await db
    .select({
      id: books.id,
      title: books.title,
      number: books.number,
      page_count: books.page_count,
      file_path: books.file_path,
      file_size: books.file_size,
      summary: books.summary,
      publisher: books.publisher,
      authors: books.authors,
      published_date: books.published_date,
      series_id: books.series_id,
    })
    .from(books)
    .where(eq(books.id, issueId))
    .limit(1);

  if (!bookResult || bookResult.length === 0) return notFound();

  const book = bookResult[0];

  // Verify the book belongs to the series
  if (book.series_id !== seriesId) return notFound();

  // Fetch series data
  const seriesResult = await db
    .select({
      id: series.id,
      name: series.name,
      publisher: series.publisher,
      year: series.year,
      thumbnail_url: series.thumbnail_url,
    })
    .from(series)
    .where(eq(series.id, seriesId))
    .limit(1);

  if (!seriesResult || seriesResult.length === 0) return notFound();

  const seriesData = seriesResult[0];

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-8 flex flex-col items-center justify-center relative">
        
        {/* Back Button */}
        <Link href={`/library/${seriesId}`} className="absolute top-8 left-8 flex items-center gap-2 text-zinc-500 hover:text-white transition font-bold">
            <ArrowLeft className="w-5 h-5" /> Back to Series
        </Link>

        <div className="max-w-5xl w-full grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
            
            {/* LEFT: Cover Image */}
            <div className="aspect-[2/3] bg-zinc-900 rounded-xl shadow-2xl shadow-blue-900/10 border border-zinc-800 flex items-center justify-center relative overflow-hidden">
                 {/* Placeholder for now since we don't store per-issue covers separately yet */}
                 <span className="text-9xl font-black text-zinc-800 select-none">{book.number}</span>
            </div>

            {/* RIGHT: Details & Actions */}
            <div className="md:col-span-2 space-y-8">
                <div>
                    <h2 className="text-blue-500 font-bold tracking-wide uppercase text-sm mb-2">
                        {seriesData.name}
                    </h2>
                    <h1 className="text-5xl font-black text-white leading-tight">
                        {book.title || `Issue #${book.number}`}
                    </h1>
                </div>

                <div className="flex gap-8 border-y border-zinc-800 py-6">
                    <div>
                        <span className="block text-xs text-zinc-500 uppercase font-bold">Release Date</span>
                        <span className="text-lg font-medium">
                            {book.published_date 
                                ? new Date(book.published_date).getFullYear() 
                                : 'Unknown Year'}
                        </span>
                    </div>
                    <div>
                        <span className="block text-xs text-zinc-500 uppercase font-bold">Writer</span>
                        <span className="text-lg font-medium text-white">{book.authors?.split(',')[0] || 'Unknown'}</span>
                    </div>
                    <div>
                        <span className="block text-xs text-zinc-500 uppercase font-bold">Length</span>
                        <span className="text-lg font-medium text-white">{book.page_count} Pages</span>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-zinc-400 text-lg leading-relaxed max-w-2xl">
                        {book.summary || "No summary available for this issue."}
                    </p>

                    {/* THE ACTION BUTTON */}
                    <div className="pt-4 flex items-center gap-4">
                        <Link 
                            href={`/read/${book.id}`}
                            className="bg-white text-black px-8 py-4 rounded-lg font-black text-xl hover:bg-zinc-200 transition flex items-center gap-3"
                        >
                            <Play className="w-6 h-6 fill-black" />
                            Read Now
                        </Link>
                        
                        {/* Placeholder for Progress */}
                        <div className="text-sm text-zinc-500 flex items-center gap-2">
                             <Clock className="w-4 h-4" />
                             0% Completed
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}
