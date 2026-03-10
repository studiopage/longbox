import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { series, books } from '@/db/schema';
import { asc, count, eq } from 'drizzle-orm';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { buildNavigationFeed, OPDS_HEADERS } from '@/lib/opds';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const rows = await db
    .select({
      id: series.id,
      name: series.name,
      publisher: series.publisher,
      bookCount: count(books.id),
    })
    .from(series)
    .leftJoin(books, eq(books.series_id, series.id))
    .groupBy(series.id, series.name, series.publisher)
    .orderBy(asc(series.name));

  const entries = rows.map(row => ({
    title: row.name,
    href: `/api/opds/v1.2/series/${row.id}`,
    content: row.publisher ?? 'Unknown Publisher',
    count: row.bookCount,
  }));

  const feed = buildNavigationFeed('All Series', '/api/opds/v1.2/series', entries);
  return new NextResponse(feed, { headers: OPDS_HEADERS });
}
