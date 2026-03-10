'use server';

import { db } from '@/db';
import { systemSettings } from '@/db/schema';

/**
 * Check whether a ComicVine API key is configured.
 * Used by the discovery page to show helpful guidance when unconfigured.
 */
export async function checkComicVineConfigured(): Promise<boolean> {
  try {
    const [row] = await db.select({ cv_api_key: systemSettings.cv_api_key }).from(systemSettings).limit(1);
    return !!row?.cv_api_key;
  } catch {
    return false;
  }
}
