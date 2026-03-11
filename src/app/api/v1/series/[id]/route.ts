import { NextRequest, NextResponse } from 'next/server';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { formatSeries } from '@/lib/komga';
import { db } from '@/db';
import { series, books, read_progress } from '@/db/schema';
import { eq, count, and, sql } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const s = await db.query.series.findFirst({
    where: eq(series.id, id),
  });

  if (!s) {
    return NextResponse.json({ error: 'Series not found' }, { status: 404 });
  }

  const [{ total }] = await db
    .select({ total: count() })
    .from(books)
    .where(eq(books.series_id, id));

  const [readResult] = await db
    .select({ read: count() })
    .from(read_progress)
    .innerJoin(books, eq(read_progress.book_id, books.id))
    .where(and(eq(books.series_id, id), eq(read_progress.is_completed, true)));

  const [progressResult] = await db
    .select({ inProgress: count() })
    .from(read_progress)
    .innerJoin(books, eq(read_progress.book_id, books.id))
    .where(and(
      eq(books.series_id, id),
      eq(read_progress.is_completed, false),
      sql`${read_progress.page} > 0`
    ));

  return NextResponse.json(formatSeries(s, {
    total,
    read: readResult?.read ?? 0,
    inProgress: progressResult?.inProgress ?? 0,
  }));
}
