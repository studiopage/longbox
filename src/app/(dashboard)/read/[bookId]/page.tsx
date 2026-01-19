import { db } from '@/db';
import { books, read_progress } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import ReaderView from './reader-view';

export const dynamic = 'force-dynamic';

export default async function ReaderPage({ params }: { params: Promise<{ bookId: string }> }) {
  const { bookId } = await params;

  // Join books with read_progress to get the saved page
  const result = await db.select({
      id: books.id,
      page_count: books.page_count,
      saved_page: read_progress.page
    })
    .from(books)
    .leftJoin(read_progress, eq(books.id, read_progress.book_id))
    .where(eq(books.id, bookId))
    .limit(1);

  if (!result || result.length === 0) notFound();

  const book = result[0];

  return (
    <ReaderView 
      bookId={book.id} 
      pageCount={book.page_count || 0} 
      initialPage={book.saved_page || 1}
    />
  );
}

