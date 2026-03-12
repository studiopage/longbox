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

// simple byte formatter (copied from analysis page)
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

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
        <span
          className="text-sm font-medium text-foreground truncate"
          title={group.folderPath}
        >
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
            {group.suggestedSeriesPublisher && (
              <> ({group.suggestedSeriesPublisher})</>
            )}
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
            <>
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

              {/* Signal details for context */}
              {item.signals && (
                <div className="px-4 pb-2 text-xs text-muted-foreground bg-muted/5">
                  {/* ComicInfo signal summary */}
                  <div className="truncate">
                    <strong>CI:</strong>{' '}
                    {(item.signals as any).comicInfo ? (
                      <>
                        {(item.signals as any).comicInfo.seriesName ?? <em>no series</em>}
                        {(item.signals as any).comicInfo.issueNumber && ` #${(item.signals as any).comicInfo.issueNumber}`}
                        {(item.signals as any).comicInfo.title && ` – ${(item.signals as any).comicInfo.title}`}
                        {(item.signals as any).comicInfo.year && ` (${(item.signals as any).comicInfo.year})`}
                        {(item.signals as any).comicInfo.publisher && ` — ${(item.signals as any).comicInfo.publisher}`}
                      </>
                    ) : (
                      <em>none</em>
                    )}
                  </div>

                  <div className="truncate">
                    <strong>Size:</strong> {formatBytes(item.fileSize)}
                  </div>

                  {(item.signals as any).comicInfo?.publisher && (
                    <div className="truncate">
                      <strong>Publisher:</strong> {(item.signals as any).comicInfo.publisher}
                    </div>
                  )}

                  {item.createdAt && (
                    <div className="truncate">
                      <strong>Queued:</strong>{' '}
                      {new Date(item.createdAt).toLocaleString()}
                    </div>
                  )}

                  {/* Folder and filename signals */}
                  <div className="truncate">
                    <strong>Folder:</strong> {(item.signals as any).folder.folderName}
                  </div>
                  <div className="truncate">
                    <strong>Filename:</strong>{' '}
                    {(item.signals as any).filename.seriesName ?? <em>n/a</em>}
                    {(item.signals as any).filename.issueNumber && ` #${(item.signals as any).filename.issueNumber}`}
                    {(item.signals as any).filename.year && ` (${(item.signals as any).filename.year})`}
                  </div>

                  {/* raw JSON for deep inspection */}
                  <details className="mt-1 text-xs text-muted-foreground">
                    <summary className="cursor-pointer">Raw signals</summary>
                    <pre className="whitespace-pre-wrap max-h-48 overflow-y-auto">
{JSON.stringify(item.signals, null, 2)}
                    </pre>
                  </details>
                </div>
              )}
            </>
          ))}
        </div>
      )}
    </div>
  );
}
