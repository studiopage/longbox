import {
  ScanLine,
  Link,
  AlertTriangle,
  BookOpen,
  FolderOpen,
  Layers,
  Activity,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ActivityEventRowProps {
  type: string;
  message: string;
  severity: string;
  createdAt: Date | null;
}

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  scan_started: ScanLine,
  scan_complete: ScanLine,
  series_linked: Link,
  error: AlertTriangle,
  triage_approved: FolderOpen,
  triage_rejected: FolderOpen,
  book_completed: BookOpen,
  collection_created: Layers,
  collection_deleted: Layers,
};

const SEVERITY_COLORS: Record<string, string> = {
  info: 'text-primary/70',
  warning: 'text-yellow-500/70',
  error: 'text-red-500/70',
};

export function ActivityEventRow({ type, message, severity, createdAt }: ActivityEventRowProps) {
  const Icon = ICON_MAP[type] ?? Activity;
  const iconColor = SEVERITY_COLORS[severity] ?? 'text-primary/70';
  const timeAgo = createdAt
    ? formatDistanceToNow(createdAt, { addSuffix: true })
    : '';

  return (
    <div className="flex items-start gap-3 py-2">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-sm text-foreground/80 leading-snug truncate">{message}</p>
        {timeAgo && (
          <p className="text-xs text-muted-foreground mt-0.5">{timeAgo}</p>
        )}
      </div>
    </div>
  );
}
