'use client';

import { useEffect, useState } from 'react';
import { AlertTriangle, Trash2, CheckCircle2, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface QueueItem {
  id: string;
  file_path: string;
  file_size: number | null;
  suggested_series: string | null;
  suggested_title: string | null;
  suggested_number: string | null;
  metadata_xml: string | null;
  created_at: Date;
}

export function ReviewQueueSection() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const router = useRouter();

  const fetchQueue = async () => {
    try {
      const response = await fetch('/api/review/queue');
      if (response.ok) {
        const data = await response.json();
        setQueue(data);
      }
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQueue();
  }, []);

  const handleApprove = async (item: QueueItem) => {
    if (!item.suggested_series) return;

    setProcessing(item.id);
    try {
      const response = await fetch('/api/review/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: item.id,
          seriesName: item.suggested_series,
          metadata: item.metadata_xml,
        }),
      });

      if (response.ok) {
        await fetchQueue();
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to approve:', error);
    } finally {
      setProcessing(null);
    }
  };

  const handleDelete = async (id: string) => {
    setProcessing(id);
    try {
      const response = await fetch('/api/review/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (response.ok) {
        await fetchQueue();
        router.refresh();
      }
    } catch (error) {
      console.error('Failed to delete:', error);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <section className="space-y-4 w-full">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="w-5 h-5 text-primary" />
        <h2 className="text-xl font-bold">Review Queue</h2>
        <span className="text-sm text-muted-foreground">({queue.length} items)</span>
      </div>

      <div className="w-full">
        {queue.length === 0 ? (
          <div className="bg-card border border-border rounded p-12 text-center">
            <CheckCircle2 className="w-12 h-12 text-primary mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">All Clean!</h3>
            <p className="text-sm text-muted-foreground">No files pending review.</p>
          </div>
        ) : (
          <div className="space-y-3">
          {queue.map((item) => (
            <div
              key={item.id}
              className="bg-card border border-border rounded p-4 hover:border-primary/30 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="bg-primary/15 text-primary text-xs font-bold px-2 py-0.5 rounded border border-primary/20">
                      NEW SERIES
                    </span>
                    <span className="text-xs text-muted-foreground font-mono truncate">
                      {item.file_path}
                    </span>
                  </div>
                  <h3 className="text-lg font-bold text-foreground truncate mb-1">
                    {item.suggested_series || 'Unknown Series'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Issue #{item.suggested_number || '?'} • {item.suggested_title || 'Untitled'}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleDelete(item.id)}
                    disabled={processing === item.id}
                    className="p-2 rounded bg-destructive/10 text-destructive border border-destructive/20 hover:bg-destructive/15 transition disabled:opacity-50"
                    title="Delete"
                  >
                    {processing === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                  <button
                    onClick={() => handleApprove(item)}
                    disabled={processing === item.id}
                    className="px-4 py-2 rounded bg-primary text-primary-foreground font-semibold hover:bg-primary/90 transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {processing === item.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Approve
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
          </div>
        )}
      </div>
    </section>
  );
}
