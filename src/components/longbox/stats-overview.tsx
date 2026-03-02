'use client';

import { useEffect, useState } from 'react';
import { Library, BookOpen, BookMarked, CheckCircle2 } from 'lucide-react';

interface Stats {
  totalSeries: number;
  totalBooks: number;
  inProgress: number;
  completed: number;
}

export function StatsOverview() {
  const [stats, setStats] = useState<Stats>({
    totalSeries: 0,
    totalBooks: 0,
    inProgress: 0,
    completed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch('/api/stats/overview');
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const statCards = [
    {
      label: 'Series',
      value: stats.totalSeries,
      icon: Library,
      iconColor: 'text-primary',
    },
    {
      label: 'Issues',
      value: stats.totalBooks,
      icon: BookOpen,
      iconColor: 'text-primary/70',
    },
    {
      label: 'Reading',
      value: stats.inProgress,
      icon: BookMarked,
      iconColor: 'text-primary/50',
    },
    {
      label: 'Completed',
      value: stats.completed,
      icon: CheckCircle2,
      iconColor: 'text-primary/90',
    },
  ];

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="bg-card border border-border rounded p-4 animate-pulse">
            <div className="h-16"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {statCards.map((stat) => (
        <div
          key={stat.label}
          className="group relative overflow-hidden rounded border border-border bg-card p-4 hover:bg-accent/50 transition-all duration-200 ease-out"
        >
          <div className="flex items-center justify-between mb-2">
            <stat.icon className={`w-5 h-5 ${stat.iconColor}`} />
            <span className="text-2xl font-bold">{stat.value}</span>
          </div>
          <p className="text-xs font-medium text-muted-foreground">{stat.label}</p>
        </div>
      ))}
    </div>
  );
}
