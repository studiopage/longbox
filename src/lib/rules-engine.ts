import { db } from '@/db';
import { books, series, read_progress, collectionItems } from '@/db/schema';
import { eq, ne, and, or, like, ilike, gt, lt, gte, lte, isNull, isNotNull, count, sql, type SQL } from 'drizzle-orm';
import { unstable_cache, updateTag } from 'next/cache';
import type { SmartRules, Condition } from '@/types/longbox';

/**
 * Build a single Drizzle SQL condition from a rule condition.
 * Returns undefined if the condition is invalid (graceful degradation).
 */
function buildCondition(condition: Condition, userId: string): SQL | undefined {
  const { field, operator, value } = condition;

  try {
    switch (field) {
      case 'publisher':
        if (operator === 'is') return eq(books.publisher, value);
        if (operator === 'is_not') return ne(books.publisher, value);
        if (operator === 'contains') return ilike(books.publisher, `%${value}%`);
        break;

      case 'series_name':
        if (operator === 'contains') return ilike(series.name, `%${value}%`);
        if (operator === 'starts_with') return ilike(series.name, `${value}%`);
        break;

      case 'reading_status': {
        const completedSubquery = db
          .select({ book_id: read_progress.book_id })
          .from(read_progress)
          .where(
            and(
              eq(read_progress.book_id, books.id),
              eq(read_progress.user_id, userId),
              eq(read_progress.is_completed, true)
            )
          );

        const inProgressSubquery = db
          .select({ book_id: read_progress.book_id })
          .from(read_progress)
          .where(
            and(
              eq(read_progress.book_id, books.id),
              eq(read_progress.user_id, userId),
              gt(read_progress.page, 1),
              eq(read_progress.is_completed, false)
            )
          );

        if (value === 'completed') {
          const cond = sql`EXISTS (${completedSubquery})`;
          return operator === 'is' ? cond : sql`NOT EXISTS (${completedSubquery})`;
        }
        if (value === 'in_progress') {
          const cond = sql`EXISTS (${inProgressSubquery})`;
          return operator === 'is' ? cond : sql`NOT EXISTS (${inProgressSubquery})`;
        }
        if (value === 'unread') {
          const anyProgressSubquery = db
            .select({ book_id: read_progress.book_id })
            .from(read_progress)
            .where(
              and(
                eq(read_progress.book_id, books.id),
                eq(read_progress.user_id, userId),
                or(eq(read_progress.is_completed, true), gt(read_progress.page, 1))
              )
            );
          const cond = sql`NOT EXISTS (${anyProgressSubquery})`;
          return operator === 'is' ? cond : sql`EXISTS (${anyProgressSubquery})`;
        }
        break;
      }

      case 'series_status':
        if (operator === 'is') return eq(series.status, value);
        if (operator === 'is_not') return ne(series.status, value);
        break;

      case 'date_added':
        if (operator === 'within_last') {
          const days = parseInt(value, 10);
          return gte(books.created_at, sql`NOW() - INTERVAL '${sql.raw(String(days))} days'`);
        }
        if (operator === 'before') return lt(books.created_at, new Date(value));
        if (operator === 'after') return gt(books.created_at, new Date(value));
        break;

      case 'year':
        if (operator === 'is') return eq(series.year, parseInt(value, 10));
        if (operator === 'before') return lt(series.year, parseInt(value, 10));
        if (operator === 'after') return gt(series.year, parseInt(value, 10));
        if (operator === 'between') {
          const [start, end] = value.split(',').map(Number);
          return and(gte(series.year, start), lte(series.year, end));
        }
        break;

      case 'decade': {
        const decadeStart = parseInt(value, 10);
        return and(gte(series.year, decadeStart), lt(series.year, decadeStart + 10));
      }

      case 'has_comicvine_id':
        if (operator === 'is_true') return isNotNull(series.cv_id);
        if (operator === 'is_false') return isNull(series.cv_id);
        break;

      case 'has_credits':
        if (operator === 'is_true') return isNotNull(books.credits);
        if (operator === 'is_false') return isNull(books.credits);
        break;

      case 'page_count':
        if (operator === 'greater_than') return gt(books.page_count, parseInt(value, 10));
        if (operator === 'less_than') return lt(books.page_count, parseInt(value, 10));
        if (operator === 'between') {
          const [min, max] = value.split(',').map(Number);
          return and(gte(books.page_count, min), lte(books.page_count, max));
        }
        break;

      case 'format': {
        const ext = `.${value}`;
        return like(books.file_path, `%${ext}`);
      }

      case 'story_arc':
        if (operator === 'contains') {
          return sql`${books.story_arcs}::text ILIKE ${'%' + value + '%'}`;
        }
        break;

      case 'author':
        if (operator === 'contains') {
          return or(
            ilike(books.authors, `%${value}%`),
            sql`${books.credits}::text ILIKE ${'%' + value + '%'}`
          );
        }
        break;

      case 'collection_membership': {
        const memberSubquery = db
          .select({ book_id: collectionItems.book_id })
          .from(collectionItems)
          .where(eq(collectionItems.collection_id, value));

        if (operator === 'in') return sql`${books.id} IN (${memberSubquery})`;
        if (operator === 'not_in') return sql`${books.id} NOT IN (${memberSubquery})`;
        break;
      }

      case 'file_size':
        if (operator === 'greater_than') return gt(books.file_size, parseInt(value, 10));
        if (operator === 'less_than') return lt(books.file_size, parseInt(value, 10));
        break;

      default:
        console.warn(`[RULES ENGINE] Unknown field: ${field}`);
        return undefined;
    }
  } catch (error) {
    console.warn(`[RULES ENGINE] Error building condition for ${field}:`, error);
    return undefined;
  }

  console.warn(`[RULES ENGINE] Unknown operator "${operator}" for field "${field}"`);
  return undefined;
}

/**
 * Build a complete WHERE clause from smart rules.
 * Fields referencing `series` require a join — the caller must ensure
 * the query includes `.innerJoin(series, eq(books.series_id, series.id))`.
 */
export function buildWhereClause(rules: SmartRules, userId: string): SQL | undefined {
  if (!rules.conditions || rules.conditions.length === 0) return undefined;

  const conditions = rules.conditions
    .map((c) => buildCondition(c, userId))
    .filter((c): c is SQL => c !== undefined);

  if (conditions.length === 0) return undefined;
  if (conditions.length === 1) return conditions[0];

  return rules.match === 'all' ? and(...conditions) : or(...conditions);
}

/**
 * Get the sort expression for a collection.
 */
function getSortExpression(sortPreference?: string | null) {
  switch (sortPreference) {
    case 'title_asc': return sql`${books.title} ASC`;
    case 'title_desc': return sql`${books.title} DESC`;
    case 'date_added_asc': return sql`${books.created_at} ASC`;
    case 'date_added_desc': return sql`${books.created_at} DESC`;
    case 'issue_number_asc': return sql`${books.number} ASC`;
    case 'issue_number_desc': return sql`${books.number} DESC`;
    case 'year_asc': return sql`${series.year} ASC`;
    case 'year_desc': return sql`${series.year} DESC`;
    case 'publisher_asc': return sql`${books.publisher} ASC`;
    default: return sql`${books.created_at} DESC`;
  }
}

/**
 * Get the count of books matching a smart collection's rules.
 */
export async function getSmartCollectionCount(
  rules: SmartRules,
  userId: string
): Promise<number> {
  const whereClause = buildWhereClause(rules, userId);
  if (!whereClause) return 0;

  const [result] = await db
    .select({ count: count() })
    .from(books)
    .innerJoin(series, eq(books.series_id, series.id))
    .where(whereClause);

  return result?.count ?? 0;
}

/**
 * Cached version of getSmartCollectionCount.
 */
export const getCachedSmartCollectionCount = unstable_cache(
  async (rulesJson: string, userId: string) => {
    const rules: SmartRules = JSON.parse(rulesJson);
    return getSmartCollectionCount(rules, userId);
  },
  ['smart-collection-count'],
  { revalidate: 30, tags: ['smart-collections-all'] }
);

/**
 * Get books matching a smart collection's rules.
 */
export async function getSmartCollectionBooks(
  rules: SmartRules,
  userId: string,
  sortPreference?: string | null,
  limit?: number,
  offset?: number
) {
  const whereClause = buildWhereClause(rules, userId);

  let query = db
    .select({
      id: books.id,
      series_id: books.series_id,
      file_path: books.file_path,
      file_size: books.file_size,
      title: books.title,
      number: books.number,
      page_count: books.page_count,
      summary: books.summary,
      publisher: books.publisher,
      authors: books.authors,
      published_date: books.published_date,
      metron_id: books.metron_id,
      credits: books.credits,
      story_arcs: books.story_arcs,
      created_at: books.created_at,
      updated_at: books.updated_at,
    })
    .from(books)
    .innerJoin(series, eq(books.series_id, series.id))
    .$dynamic();

  if (whereClause) {
    query = query.where(whereClause);
  }

  query = query.orderBy(getSortExpression(sortPreference));

  if (limit) {
    query = query.limit(limit);
    if (offset) {
      query = query.offset(offset);
    }
  }

  return query;
}

/**
 * Cached version of getSmartCollectionBooks.
 */
export const getCachedSmartCollectionBooks = unstable_cache(
  async (
    rulesJson: string,
    userId: string,
    sortPreference?: string | null,
    limit?: number,
    offset?: number
  ) => {
    const rules: SmartRules = JSON.parse(rulesJson);
    return getSmartCollectionBooks(rules, userId, sortPreference, limit, offset);
  },
  ['smart-collection-books'],
  { revalidate: 60, tags: ['smart-collections-all'] }
);

/**
 * Invalidate all smart collection caches.
 * Call this when reading progress changes, books are added/deleted, etc.
 */
export function invalidateSmartCollections() {
  updateTag('smart-collections-all');
}
