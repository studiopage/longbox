import { NextRequest, NextResponse } from 'next/server';
import { QueueManager } from '@/utils/queue';

const queue = new QueueManager();

export async function POST(request: NextRequest) {
  const { id } = await request.json();
  
  console.log(`Rejected item: ${id}`);
  queue.remove(id);
  
  return NextResponse.json({ success: true });
}


