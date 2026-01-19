import { NextRequest, NextResponse } from 'next/server';
import { QueueManager } from '@/utils/queue';
import { importSeriesAction } from '@/actions/library';

const queue = new QueueManager();

export async function POST(request: NextRequest) {
  const { id } = await request.json();
  
  const item = queue.getById(id);
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  try {
    console.log(`Manually approving: ${item.localTitle}`);
    await importSeriesAction(item.remoteId, item.filePath); // filePath is komgaId
    
    queue.remove(item.id);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("Import failed:", e);
    return NextResponse.json({ error: 'Import failed' }, { status: 500 });
  }
}


