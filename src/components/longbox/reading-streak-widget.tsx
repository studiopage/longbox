import { Flame, BookOpen, TrendingUp, Trophy } from 'lucide-react';
import { getReadingStreak } from '@/actions/reader-features';

export async function ReadingStreakWidget() {
  const data = await getReadingStreak();

  if (data.totalCompleted === 0) return null;

  const stats = [
    { icon: Flame, label: 'Day Streak', value: data.currentStreak, color: 'text-orange-500/70' },
    { icon: BookOpen, label: 'This Week', value: data.booksThisWeek, color: 'text-primary/70' },
    { icon: TrendingUp, label: 'This Month', value: data.booksThisMonth, color: 'text-primary/50' },
    { icon: Trophy, label: 'Total Read', value: data.totalCompleted, color: 'text-yellow-500/70' },
  ];

  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-2">
        <Flame className="w-4 h-4" />
        Reading Pace
      </h2>
      <div className="grid grid-cols-4 gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded border border-border bg-card p-3 text-center">
            <stat.icon className={`w-4 h-4 mx-auto mb-1 ${stat.color}`} />
            <span className="text-xl font-bold block">{stat.value}</span>
            <p className="text-[10px] text-muted-foreground">{stat.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
