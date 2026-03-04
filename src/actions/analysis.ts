'use server';

import { db } from '@/db';
import { books, series, read_progress, issues } from '@/db/schema';
import { sql, eq, desc, and, isNotNull, gte } from 'drizzle-orm';

// =====================
// Library Composition
// =====================

export interface LibraryComposition {
  totalSeries: number;
  totalBooks: number;
  totalFileSize: number;
  avgPageCount: number;
  publisherBreakdown: { name: string; count: number }[];
  decadeBreakdown: { decade: string; count: number }[];
}

export async function getLibraryComposition(): Promise<LibraryComposition> {
  const [totals, publishers, decades] = await Promise.all([
    db.select({
      totalSeries: sql<number>`count(distinct ${books.series_id})`,
      totalBooks: sql<number>`count(${books.id})`,
      totalFileSize: sql<number>`coalesce(sum(${books.file_size}), 0)`,
      avgPageCount: sql<number>`coalesce(round(avg(${books.page_count})), 0)`,
    }).from(books),

    db.select({
      name: sql<string>`coalesce(${books.publisher}, 'Unknown')`,
      count: sql<number>`count(*)`,
    })
      .from(books)
      .groupBy(books.publisher)
      .orderBy(desc(sql`count(*)`))
      .limit(11),

    db.select({
      decade: sql<string>`concat(floor(extract(year from ${books.published_date}) / 10) * 10, 's')`,
      count: sql<number>`count(*)`,
    })
      .from(books)
      .where(isNotNull(books.published_date))
      .groupBy(sql`floor(extract(year from ${books.published_date}) / 10) * 10`)
      .orderBy(sql`floor(extract(year from ${books.published_date}) / 10) * 10`),
  ]);

  let publisherBreakdown = publishers.map(p => ({
    name: p.name,
    count: Number(p.count),
  }));

  if (publisherBreakdown.length > 10) {
    const top10 = publisherBreakdown.slice(0, 10);
    const otherCount = publisherBreakdown.slice(10).reduce((sum, p) => sum + p.count, 0);
    publisherBreakdown = [...top10, { name: 'Other', count: otherCount }];
  }

  return {
    totalSeries: Number(totals[0]?.totalSeries ?? 0),
    totalBooks: Number(totals[0]?.totalBooks ?? 0),
    totalFileSize: Number(totals[0]?.totalFileSize ?? 0),
    avgPageCount: Number(totals[0]?.avgPageCount ?? 0),
    publisherBreakdown,
    decadeBreakdown: decades
      .filter(d => d.decade && !d.decade.startsWith('NaN'))
      .map(d => ({ decade: d.decade, count: Number(d.count) })),
  };
}

// =====================
// Metadata Health
// =====================

export interface MetadataHealth {
  totalSeries: number;
  seriesWithCvId: number;
  totalBooks: number;
  booksWithCredits: number;
  booksWithPages: number;
  booksFlagged: number;
}

export async function getMetadataHealth(): Promise<MetadataHealth> {
  const [seriesStats, bookStats] = await Promise.all([
    db.select({
      total: sql<number>`count(*)`,
      withCvId: sql<number>`count(${series.cv_id})`,
    }).from(series),

    db.select({
      total: sql<number>`count(*)`,
      withCredits: sql<number>`count(${books.credits})`,
      withPages: sql<number>`sum(case when ${books.page_count} > 0 then 1 else 0 end)`,
      flagged: sql<number>`sum(case when ${books.match_flags} is not null and array_length(${books.match_flags}, 1) > 0 then 1 else 0 end)`,
    }).from(books),
  ]);

  return {
    totalSeries: Number(seriesStats[0]?.total ?? 0),
    seriesWithCvId: Number(seriesStats[0]?.withCvId ?? 0),
    totalBooks: Number(bookStats[0]?.total ?? 0),
    booksWithCredits: Number(bookStats[0]?.withCredits ?? 0),
    booksWithPages: Number(bookStats[0]?.withPages ?? 0),
    booksFlagged: Number(bookStats[0]?.flagged ?? 0),
  };
}

// =====================
// Series Completion
// =====================

export interface SeriesCompletionStats {
  complete: number;
  almostComplete: number;
  inProgress: number;
  topAlmostComplete: {
    id: string;
    name: string;
    ownedCount: number;
    totalIssues: number;
    percentage: number;
  }[];
}

export async function getSeriesCompletion(): Promise<SeriesCompletionStats> {
  const seriesData = await db
    .select({
      id: series.id,
      name: series.name,
      ownedCount: sql<number>`count(${books.id})`,
    })
    .from(series)
    .innerJoin(books, eq(books.series_id, series.id))
    .groupBy(series.id, series.name);

  const issueCounts = await db
    .select({
      seriesId: issues.series_id,
      totalIssues: sql<number>`count(*)`,
    })
    .from(issues)
    .groupBy(issues.series_id);

  const issueCountMap = new Map(issueCounts.map(ic => [ic.seriesId, Number(ic.totalIssues)]));

  let complete = 0;
  let almostComplete = 0;
  let inProgress = 0;
  const almostCompleteList: SeriesCompletionStats['topAlmostComplete'] = [];

  for (const s of seriesData) {
    const totalIssues = issueCountMap.get(s.id);
    if (!totalIssues || totalIssues === 0) continue;

    const owned = Number(s.ownedCount);
    const pct = Math.round((owned / totalIssues) * 100);

    if (pct >= 100) {
      complete++;
    } else if (pct > 75) {
      almostComplete++;
      almostCompleteList.push({
        id: s.id,
        name: s.name,
        ownedCount: owned,
        totalIssues,
        percentage: pct,
      });
    } else {
      inProgress++;
    }
  }

  almostCompleteList.sort((a, b) => b.percentage - a.percentage);

  return {
    complete,
    almostComplete,
    inProgress,
    topAlmostComplete: almostCompleteList.slice(0, 10),
  };
}

// =====================
// Reading Stats
// =====================

export interface ReadingStats {
  totalCompleted: number;
  totalInProgress: number;
  totalPagesRead: number;
  weeklyPace: { week: string; count: number }[];
  currentStreak: number;
}

export async function getReadingStats(): Promise<ReadingStats> {
  const [counts, weekly, streakData] = await Promise.all([
    db.select({
      completed: sql<number>`coalesce(sum(case when ${read_progress.is_completed} = true then 1 else 0 end), 0)`,
      inProgress: sql<number>`coalesce(sum(case when ${read_progress.is_completed} = false then 1 else 0 end), 0)`,
      pagesRead: sql<number>`coalesce(sum(${read_progress.page}), 0)`,
    }).from(read_progress),

    db.select({
      week: sql<string>`to_char(date_trunc('week', ${read_progress.updated_at}), 'YYYY-MM-DD')`,
      count: sql<number>`count(*)`,
    })
      .from(read_progress)
      .where(
        and(
          eq(read_progress.is_completed, true),
          gte(read_progress.updated_at, sql`now() - interval '12 weeks'`)
        )
      )
      .groupBy(sql`date_trunc('week', ${read_progress.updated_at})`)
      .orderBy(sql`date_trunc('week', ${read_progress.updated_at})`),

    db.select({
      day: sql<string>`to_char(${read_progress.updated_at}::date, 'YYYY-MM-DD')`,
    })
      .from(read_progress)
      .where(gte(read_progress.updated_at, sql`now() - interval '90 days'`))
      .groupBy(sql`${read_progress.updated_at}::date`)
      .orderBy(desc(sql`${read_progress.updated_at}::date`)),
  ]);

  let currentStreak = 0;
  if (streakData.length > 0) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < streakData.length; i++) {
      const expectedDate = new Date(today);
      expectedDate.setDate(expectedDate.getDate() - i);
      const expectedStr = expectedDate.toISOString().split('T')[0];

      if (streakData[i].day === expectedStr) {
        currentStreak++;
      } else {
        break;
      }
    }
  }

  return {
    totalCompleted: Number(counts[0]?.completed ?? 0),
    totalInProgress: Number(counts[0]?.inProgress ?? 0),
    totalPagesRead: Number(counts[0]?.pagesRead ?? 0),
    weeklyPace: weekly.map(w => ({
      week: w.week,
      count: Number(w.count),
    })),
    currentStreak,
  };
}
