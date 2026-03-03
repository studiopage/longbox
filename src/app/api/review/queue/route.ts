import { db } from '@/db';
import { triageQueue } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const queue = await db
      .select({
        id: triageQueue.id,
        file_path: triageQueue.file_path,
        file_size: triageQueue.file_size,
        suggested_series: triageQueue.suggested_series,
        suggested_title: triageQueue.suggested_title,
        suggested_number: triageQueue.suggested_number,
        metadata_xml: triageQueue.metadata_xml,
        created_at: triageQueue.created_at,
      })
      .from(triageQueue)
      .orderBy(desc(triageQueue.created_at));

    return NextResponse.json(queue);
  } catch (error) {
    console.error('Failed to fetch review queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review queue' },
      { status: 500 }
    );
  }
}
