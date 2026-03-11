import { NextRequest, NextResponse } from 'next/server';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { db } from '@/db';
import { books, read_progress } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

/** GET /api/v1/books/:id/read-progress */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const progress = await db.query.read_progress.findFirst({
    where: eq(read_progress.book_id, id),
  });

  const now = new Date().toISOString();

  return NextResponse.json({
    page: progress?.page ?? 0,
    completed: progress?.is_completed ?? false,
    readDate: progress?.updated_at?.toISOString() ?? null,
    created: progress?.updated_at?.toISOString() ?? now,
    lastModified: progress?.updated_at?.toISOString() ?? now,
    deviceId: '',
    deviceName: '',
  });
}

/** PATCH /api/v1/books/:id/read-progress */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;
  const body = await request.json();
  const { page, completed } = body as { page?: number; completed?: boolean };

  // Verify book exists
  const book = await db.query.books.findFirst({
    where: eq(books.id, id),
    columns: { id: true, page_count: true },
  });

  if (!book) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }

  const newPage = page ?? 0;
  const isCompleted = completed ?? (book.page_count ? newPage >= book.page_count : false);

  // Upsert read progress
  const existing = await db.query.read_progress.findFirst({
    where: eq(read_progress.book_id, id),
  });

  if (existing) {
    await db
      .update(read_progress)
      .set({
        page: newPage,
        is_completed: isCompleted,
        updated_at: new Date(),
      })
      .where(eq(read_progress.book_id, id));
  } else {
    await db.insert(read_progress).values({
      book_id: id,
      user_id: auth.userId,
      page: newPage,
      is_completed: isCompleted,
    });
  }

  return new NextResponse(null, { status: 204 });
}
