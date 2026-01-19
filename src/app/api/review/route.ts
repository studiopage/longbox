import { NextResponse } from 'next/server';
import { QueueManager } from '@/utils/queue';

const queue = new QueueManager();

export async function GET() {
  const pending = queue.getPending();
  
  return NextResponse.json({ items: pending });
}


