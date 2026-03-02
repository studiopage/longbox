import { db } from '@/db';
import { importQueue } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const queue = await db
      .select({
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

    return NextResponse.json(queue);
  } catch (error) {
    console.error('Failed to fetch review queue:', error);
    return NextResponse.json(
      { error: 'Failed to fetch review queue' },
      { status: 500 }
    );
  }
}
