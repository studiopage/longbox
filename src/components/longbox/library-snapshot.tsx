import { db } from '@/db';
import { books, series, read_progress } from '@/db/schema';
import { sql, eq } from 'drizzle-orm';
import { Library, BookOpen, BookMarked, CheckCircle2, Flame, Trophy } from 'lucide-react';
import { getReadingStreak } from '@/actions/reader-features';
import { unstable_noStore as noStore } from 'next/cache';
import Link from 'next/link';

export async function LibrarySnapshot() {
  noStore();

  try {
    const [statsResult, streakResult] = await Promise.allSettled([
      Promise.all([
        db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(series),
        db.select({ count: sql<number>`count(*)`.mapWith(Number) }).from(books),
        db.select({ count: sql<number>`count(*)`.mapWith(Number) })
          .from(read_progress)
          .where(eq(read_progress.is_completed, false)),
        db.select({ count: sql<number>`count(*)`.mapWith(Number) })
          .from(read_progress)
          .where(eq(read_progress.is_completed, true)),
      ]),
      getReadingStreak(),
    ]);

    const [seriesCount, bookCount, inProgress, completed] =
      statsResult.status === 'fulfilled' ? statsResult.value : [[], [], [], []];
    const streak = streakResult.status === 'fulfilled' ? streakResult.value : null;

    const stats = [
      { icon: Library, label: 'Series', value: seriesCount[0]?.count ?? 0, href: '/library' },
      { icon: BookOpen, label: 'Issues', value: bookCount[0]?.count ?? 0, href: '/library' },
      { icon: BookMarked, label: 'Reading', value: inProgress[0]?.count ?? 0, href: '/library' },
      { icon: CheckCircle2, label: 'Completed', value: completed[0]?.count ?? 0, href: '/library' },
      ...(streak && streak.currentStreak > 0
        ? [{ icon: Flame, label: 'Day Streak', value: streak.currentStreak, href: '/activity', accent: 'text-orange-500/70' }]
        : []),
      ...(streak && streak.totalCompleted > 0
        ? [{ icon: Trophy, label: 'Total Read', value: streak.totalCompleted, href: '/activity', accent: 'text-yellow-500/60' }]
        : []),
    ];

    return (
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="rounded border border-border bg-card p-3 text-center hover:bg-accent/50 transition-colors"
          >
            <stat.icon className={`w-4 h-4 mx-auto mb-1.5 ${'accent' in stat ? stat.accent : 'text-primary/60'}`} />
            <span className="text-lg font-bold block tabular-nums">
              {stat.value.toLocaleString()}
            </span>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
          </Link>
        ))}
      </div>
    );
  } catch (error) {
    console.error('LibrarySnapshot error:', error);
    return null;
  }
}
