import { Progress } from '@/components/ui/progress';

interface StatProgressBarProps {
  label: string;
  current: number;
  total: number;
  href?: string;
}

export function StatProgressBar({ label, current, total, href }: StatProgressBarProps) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  const content = (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-sm text-foreground/80">{label}</span>
        <span className="text-sm font-medium">
          {current}/{total} ({percentage}%)
        </span>
      </div>
      <Progress value={percentage} className="h-2" />
    </div>
  );

  if (href) {
    return (
      <a href={href} className="block hover:bg-accent/30 rounded p-2 -m-2 transition-colors">
        {content}
      </a>
    );
  }

  return content;
}
