import { NextRequest, NextResponse } from 'next/server';
import { QueueManager } from '@/utils/queue';

const queue = new QueueManager();

export async function POST(request: NextRequest) {
  const { id, remoteId, remoteTitle, remoteYear } = await request.json();
  
  const item = queue.getById(id);
  if (!item) {
    return NextResponse.json({ error: 'Item not found' }, { status: 404 });
  }

  // Update the item with the MANUAL selection
  queue.add({
    ...item,
    remoteId,
    remoteTitle,
    remoteYear: remoteYear || null,
    score: 100, // Manual Override = 100% Confidence
  });
  
  console.log(`[MANUAL] User linked "${item.localTitle}" to "${remoteTitle}"`);
  
  return NextResponse.json({ success: true });
}


