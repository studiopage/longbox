import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { series, books } from '@/db/schema';
import { eq, asc } from 'drizzle-orm';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { buildAcquisitionFeed, getMimeType, OPDS_HEADERS, type AcquisitionEntry } from '@/lib/opds';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const [seriesRow] = await db
    .select({ name: series.name })
    .from(series)
    .where(eq(series.id, id))
    .limit(1);

  if (!seriesRow) {
    return new NextResponse('Not Found', { status: 404 });
  }

  const bookRows = await db
    .select()
    .from(books)
    .where(eq(books.series_id, id))
    .orderBy(asc(books.number));

  const entries: AcquisitionEntry[] = bookRows.map(book => ({
    id: book.id,
    title: book.number ? `${seriesRow.name} #${book.number}` : book.title,
    authors: book.authors ?? undefined,
    summary: book.summary ?? undefined,
    updated: (book.updated_at ?? book.created_at ?? new Date()).toISOString(),
    coverUrl: `/api/cover/${book.id}`,
    downloadUrl: `/api/read/${book.id}/download`,
    downloadType: getMimeType(book.file_path),
  }));

  const feed = buildAcquisitionFeed(seriesRow.name, `/api/opds/v1.2/series/${id}`, entries);
  return new NextResponse(feed, { headers: OPDS_HEADERS });
}
