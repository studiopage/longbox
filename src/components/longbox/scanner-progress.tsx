'use client';

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { RotateCw, CheckCircle2, AlertTriangle, FileText } from 'lucide-react';

interface ScanProgress {
  status: 'started' | 'processing' | 'completed' | 'error';
  currentFile?: string;
  processed: number;
  total: number;
  added: number;
  queued: number;
  errors: number;
  message?: string;
  error?: string;
}

interface ScannerProgressProps {
  isScanning: boolean;
}

export function ScannerProgress({ isScanning }: ScannerProgressProps) {
  const [progress, setProgress] = useState<ScanProgress | null>(null);
  const [eventSource, setEventSource] = useState<EventSource | null>(null);

  useEffect(() => {
    if (!isScanning) {
      // Close existing connection if scanning stopped
      if (eventSource) {
        eventSource.close();
        setEventSource(null);
      }
      return;
    }

    // Connect to SSE endpoint
    const es = new EventSource('/api/scanner/stream');

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        setProgress(data);
      } catch (error) {
        console.error('Failed to parse SSE data:', error);
      }
    };

    es.onerror = (error) => {
      console.error('SSE connection error:', error);
      es.close();
      setEventSource(null);
    };

    setEventSource(es);

    return () => {
      es.close();
    };
  }, [isScanning]);

  if (!progress || progress.status === 'completed') {
    return null;
  }

  const percentage = progress.total > 0
    ? Math.round((progress.processed / progress.total) * 100)
    : 0;

  return (
    <div className="bg-card border border-border rounded p-6 space-y-4 animate-in slide-in-from-top-2">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <RotateCw className="w-5 h-5 text-primary animate-spin" />
          <div>
            <h3 className="font-bold text-foreground">Scanning Library</h3>
            <p className="text-xs text-muted-foreground">
              {progress.processed} / {progress.total} files processed
            </p>
          </div>
        </div>
        <div className="text-2xl font-bold text-foreground">{percentage}%</div>
      </div>

      {/* Progress Bar */}
      <Progress value={percentage} className="h-2" />

      {/* Current File */}
      {progress.currentFile && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <FileText className="w-4 h-4" />
          <span className="truncate">{progress.currentFile}</span>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-primary/10 border border-primary/20 rounded p-3">
          <CheckCircle2 className="w-4 h-4 text-primary mb-1" />
          <div className="text-xl font-bold text-foreground">{progress.added}</div>
          <div className="text-xs text-muted-foreground">Added</div>
        </div>

        <div className="bg-accent border border-border rounded p-3">
          <AlertTriangle className="w-4 h-4 text-muted-foreground mb-1" />
          <div className="text-xl font-bold text-foreground">{progress.queued}</div>
          <div className="text-xs text-muted-foreground">Queued</div>
        </div>

        <div className="bg-destructive/10 border border-destructive/20 rounded p-3">
          <AlertTriangle className="w-4 h-4 text-destructive mb-1" />
          <div className="text-xl font-bold text-foreground">{progress.errors}</div>
          <div className="text-xs text-muted-foreground">Errors</div>
        </div>
      </div>

      {/* Message */}
      {progress.message && (
        <div className="text-sm text-muted-foreground font-mono bg-secondary p-3 rounded">
          {progress.message}
        </div>
      )}

      {/* Error Display */}
      {progress.error && (
        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 p-3 rounded">
          <strong>Error:</strong> {progress.error}
        </div>
      )}
    </div>
  );
}
