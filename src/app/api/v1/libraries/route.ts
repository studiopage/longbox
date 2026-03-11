import { NextRequest, NextResponse } from 'next/server';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { formatLibrary } from '@/lib/komga';
import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const setting = await db.query.appSettings.findFirst({
    where: eq(appSettings.key, 'library_path'),
  });

  return NextResponse.json([formatLibrary(setting?.value ?? '/comics')]);
}
