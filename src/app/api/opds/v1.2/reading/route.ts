import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { books, series, read_progress } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { buildAcquisitionFeed, getMimeType, OPDS_HEADERS, type AcquisitionEntry } from '@/lib/opds';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;

  // Get books the user is currently reading (has progress, not completed)
  const rows = await db
    .select({
      id: books.id,
      title: books.title,
      number: books.number,
      authors: books.authors,
      summary: books.summary,
      file_path: books.file_path,
      created_at: books.created_at,
      updated_at: books.updated_at,
      seriesName: series.name,
    })
    .from(read_progress)
    .innerJoin(books, eq(read_progress.book_id, books.id))
    .leftJoin(series, eq(books.series_id, series.id))
    .where(
      and(
        eq(read_progress.user_id, userId),
        eq(read_progress.is_completed, false)
      )
    )
    .orderBy(desc(read_progress.updated_at))
    .limit(50);

  const entries: AcquisitionEntry[] = rows.map(row => ({
    id: row.id,
    title: row.number ? `${row.seriesName || row.title} #${row.number}` : row.title,
    authors: row.authors ?? undefined,
    summary: row.summary ?? undefined,
    updated: (row.updated_at ?? row.created_at ?? new Date()).toISOString(),
    coverUrl: `/api/cover/${row.id}`,
    downloadUrl: `/api/read/${row.id}/download`,
    downloadType: getMimeType(row.file_path),
  }));

  const feed = buildAcquisitionFeed('Reading List', '/api/opds/v1.2/reading', entries);
  return new NextResponse(feed, { headers: OPDS_HEADERS });
}
