import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { books, series, collections, collectionItems } from '@/db/schema';
import { eq, asc, inArray } from 'drizzle-orm';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { buildAcquisitionFeed, getMimeType, OPDS_HEADERS, type AcquisitionEntry } from '@/lib/opds';
import { buildWhereClause } from '@/lib/rules-engine';
import type { SmartRules } from '@/types/longbox';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { userId } = auth;
  const { id } = await params;

  // Get collection info
  const [collection] = await db
    .select()
    .from(collections)
    .where(eq(collections.id, id))
    .limit(1);

  if (!collection) {
    return new NextResponse('Not Found', { status: 404 });
  }

  let bookRows: any[];

  if (collection.smart_rules) {
    // Smart collection: evaluate rules
    const rules = collection.smart_rules as SmartRules;
    const whereClause = buildWhereClause(rules, userId);

    const query = db
      .select({
        id: books.id,
        title: books.title,
        number: books.number,
        authors: books.authors,
        summary: books.summary,
        file_path: books.file_path,
        created_at: books.created_at,
        updated_at: books.updated_at,
        series_id: books.series_id,
      })
      .from(books)
      .leftJoin(series, eq(books.series_id, series.id));

    bookRows = whereClause
      ? await query.where(whereClause).orderBy(asc(books.title)).limit(200)
      : await query.orderBy(asc(books.title)).limit(200);
  } else {
    // Manual collection: get books from join table
    const items = await db
      .select({ book_id: collectionItems.book_id })
      .from(collectionItems)
      .where(eq(collectionItems.collection_id, id))
      .orderBy(asc(collectionItems.sort_order));

    const bookIds = items.map(i => i.book_id);
    if (bookIds.length === 0) {
      const feed = buildAcquisitionFeed(collection.name, `/api/opds/v1.2/collections/${id}`, []);
      return new NextResponse(feed, { headers: OPDS_HEADERS });
    }

    bookRows = await db
      .select({
        id: books.id,
        title: books.title,
        number: books.number,
        authors: books.authors,
        summary: books.summary,
        file_path: books.file_path,
        created_at: books.created_at,
        updated_at: books.updated_at,
        series_id: books.series_id,
      })
      .from(books)
      .where(inArray(books.id, bookIds));
  }

  // Get series names for display
  const seriesIds = [...new Set(bookRows.map(b => b.series_id))];
  const seriesMap = new Map<string, string>();
  if (seriesIds.length > 0) {
    const seriesRows = await db
      .select({ id: series.id, name: series.name })
      .from(series)
      .where(inArray(series.id, seriesIds));
    for (const s of seriesRows) {
      seriesMap.set(s.id, s.name);
    }
  }

  const entries: AcquisitionEntry[] = bookRows.map(book => ({
    id: book.id,
    title: book.number
      ? `${seriesMap.get(book.series_id) || book.title} #${book.number}`
      : book.title,
    authors: book.authors ?? undefined,
    summary: book.summary ?? undefined,
    updated: (book.updated_at ?? book.created_at ?? new Date()).toISOString(),
    coverUrl: `/api/cover/${book.id}`,
    downloadUrl: `/api/read/${book.id}/download`,
    downloadType: getMimeType(book.file_path),
  }));

  const feed = buildAcquisitionFeed(collection.name, `/api/opds/v1.2/collections/${id}`, entries);
  return new NextResponse(feed, { headers: OPDS_HEADERS });
}
