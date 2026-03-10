import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { books, series } from '@/db/schema';
import { eq, ilike, or, asc } from 'drizzle-orm';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { buildAcquisitionFeed, buildSearchDescription, getMimeType, OPDS_HEADERS, type AcquisitionEntry } from '@/lib/opds';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const q = request.nextUrl.searchParams.get('q');

  // No query = return OpenSearch description
  if (!q) {
    const baseUrl = `${request.nextUrl.protocol}//${request.nextUrl.host}`;
    const xml = buildSearchDescription(baseUrl);
    return new NextResponse(xml, {
      headers: { 'Content-Type': 'application/opensearchdescription+xml; charset=utf-8' },
    });
  }

  const pattern = `%${q}%`;

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
    .from(books)
    .leftJoin(series, eq(books.series_id, series.id))
    .where(
      or(
        ilike(books.title, pattern),
        ilike(series.name, pattern),
        ilike(books.authors, pattern)
      )
    )
    .orderBy(asc(series.name), asc(books.number))
    .limit(100);

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

  const feed = buildAcquisitionFeed(
    `Search: ${q}`,
    `/api/opds/v1.2/search?q=${encodeURIComponent(q)}`,
    entries
  );

  return new NextResponse(feed, { headers: OPDS_HEADERS });
}
