import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { series } from '@/db/schema';
import { sql, asc } from 'drizzle-orm';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { buildNavigationFeed, OPDS_HEADERS } from '@/lib/opds';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  // Get distinct publishers with series counts
  const rows = await db
    .select({
      publisher: series.publisher,
      count: sql<number>`count(*)::int`,
    })
    .from(series)
    .groupBy(series.publisher)
    .orderBy(asc(series.publisher));

  const entries = rows.map(row => ({
    title: row.publisher || 'Unknown Publisher',
    href: `/api/opds/v1.2/series?publisher=${encodeURIComponent(row.publisher || '')}`,
    content: `${row.count} series`,
    count: row.count,
  }));

  const feed = buildNavigationFeed('By Publisher', '/api/opds/v1.2/publishers', entries);
  return new NextResponse(feed, { headers: OPDS_HEADERS });
}
