import { db } from '@/db';
import { importQueue } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { ApproveButton, DeleteButton } from './buttons';

export const dynamic = 'force-dynamic';

export default async function ReviewPage() {
  const queue = await db.select({
    id: importQueue.id,
    file_path: importQueue.file_path,
    file_size: importQueue.file_size,
    suggested_series: importQueue.suggested_series,
    suggested_title: importQueue.suggested_title,
    suggested_number: importQueue.suggested_number,
    metadata_xml: importQueue.metadata_xml,
    created_at: importQueue.created_at,
  })
    .from(importQueue)
    .orderBy(desc(importQueue.created_at));

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
            <h1 className="text-3xl font-black text-foreground">Review Queue</h1>
            <p className="text-muted-foreground">Found {queue.length} files belonging to unknown series.</p>
        </div>
      </div>

      <div className="space-y-4">
        {queue.map((item) => (
          <div key={item.id} className="bg-card border border-border p-4 rounded flex items-center justify-between group">
            <div className="flex-1 min-w-0 pr-4">
                <div className="flex items-center gap-2 mb-1">
                    <span className="bg-primary/10 text-primary text-xs font-bold px-2 py-0.5 rounded border border-primary/20">
                        NEW SERIES DETECTED
                    </span>
                    <span className="text-muted-foreground text-xs font-mono truncate">{item.file_path}</span>
                </div>
                <h3 className="text-lg font-bold text-foreground truncate">
                    {item.suggested_series || 'Unknown Series'}
                </h3>
                <p className="text-sm text-muted-foreground">
                    Issue #{item.suggested_number || '?'} • {item.suggested_title || 'Untitled'}
                </p>
            </div>

            <div className="flex items-center gap-3">
                <DeleteButton id={item.id} />
                <ApproveButton 
                    id={item.id} 
                    seriesName={item.suggested_series || 'Unknown Series'} 
                    metadata={item.metadata_xml}
                />
            </div>
          </div>
        ))}

        {queue.length === 0 && (
            <div className="text-center py-20 text-muted-foreground">
                <p>All clean. No pending imports.</p>
            </div>
        )}
      </div>
    </div>
  );
}
