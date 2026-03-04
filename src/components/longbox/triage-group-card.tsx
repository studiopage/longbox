'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import path from 'path';
import {
  ChevronDown,
  ChevronRight,
  FolderOpen,
  Check,
  X,
  FileText,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { TriageGroup } from '@/actions/triage';
import { approveGroup, rejectGroup } from '@/actions/triage';

function confidenceBadgeClasses(confidence: number): string {
  if (confidence >= 90) return 'bg-primary/10 text-primary';
  if (confidence >= 60) return 'bg-yellow-500/10 text-yellow-500/70';
  return 'bg-destructive/10 text-destructive/70';
}

export function TriageGroupCard({ group }: { group: TriageGroup }) {
  const [expanded, setExpanded] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleApprove() {
    startTransition(async () => {
      await approveGroup(group.folderPath, group.suggestedSeriesId);
      router.refresh();
    });
  }

  function handleReject() {
    startTransition(async () => {
      await rejectGroup(group.folderPath);
      router.refresh();
    });
  }

  return (
    <div className="rounded border border-border bg-card overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-3 px-4 py-3">
        {/* Chevron toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-shrink-0 p-1 -m-1 rounded hover:bg-accent/50 transition-colors"
          aria-label={expanded ? 'Collapse group' : 'Expand group'}
        >
          {expanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </button>

        {/* Folder icon and name */}
        <FolderOpen className="w-4 h-4 flex-shrink-0 text-muted-foreground" />
        <span className="text-sm font-medium text-foreground truncate">
          {group.folderName}
        </span>

        {/* File count badge */}
        <span className="flex-shrink-0 px-2 py-0.5 rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {group.items.length} {group.items.length === 1 ? 'file' : 'files'}
        </span>

        {/* Suggested series name */}
        {group.suggestedSeriesName && (
          <span className="hidden sm:inline text-xs text-muted-foreground truncate">
            {group.suggestedSeriesName}
          </span>
        )}

        {/* Confidence badge */}
        <span
          className={cn(
            'ml-auto flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium',
            confidenceBadgeClasses(group.avgConfidence)
          )}
        >
          {Math.round(group.avgConfidence)}%
        </span>

        {/* Action buttons */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            onClick={handleApprove}
            disabled={isPending}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors',
              'bg-primary/10 text-primary hover:bg-primary/20',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <Check className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Approve</span>
          </button>
          <button
            onClick={handleReject}
            disabled={isPending}
            className={cn(
              'flex items-center gap-1 px-2.5 py-1.5 rounded text-xs font-medium transition-colors',
              'bg-destructive/10 text-destructive/70 hover:bg-destructive/20',
              'disabled:opacity-50 disabled:cursor-not-allowed'
            )}
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Reject</span>
          </button>
        </div>
      </div>

      {/* Expanded file list */}
      {expanded && (
        <div className="border-t border-border">
          {group.items.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 px-4 py-2.5 border-b border-border last:border-b-0 hover:bg-accent/30 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 flex-shrink-0 text-muted-foreground" />

              {/* Filename */}
              <span className="text-xs text-foreground truncate min-w-0 flex-1">
                {path.basename(item.filePath)}
              </span>

              {/* Suggested series */}
              {(item.matchedSeriesName || item.suggestedSeries) && (
                <span className="hidden sm:inline text-xs text-muted-foreground truncate max-w-[200px]">
                  {item.matchedSeriesName || item.suggestedSeries}
                </span>
              )}

              {/* Issue number */}
              {item.suggestedNumber && (
                <span className="flex-shrink-0 text-xs text-muted-foreground">
                  #{item.suggestedNumber}
                </span>
              )}

              {/* Per-file confidence */}
              <span
                className={cn(
                  'flex-shrink-0 px-1.5 py-0.5 rounded text-xs font-medium',
                  confidenceBadgeClasses(item.matchConfidence)
                )}
              >
                {Math.round(item.matchConfidence)}%
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
