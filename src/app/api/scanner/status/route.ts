import { db } from '@/db';
import { scanJobs } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/scanner/status
 *
 * Returns the latest scan job record for lightweight polling.
 * Used by the global header scan indicator and dashboard widgets.
 */
export async function GET() {
  const latest = await db.select()
    .from(scanJobs)
    .orderBy(desc(scanJobs.started_at))
    .limit(1);

  if (latest.length === 0) {
    return NextResponse.json({ status: 'idle', hasRun: false });
  }

  return NextResponse.json(latest[0]);
}
