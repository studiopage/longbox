'use server'

import { db } from '@/db';
import { systemSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { unstable_cache } from 'next/cache';

// 1. GET SETTINGS (Cached Version)
// This wraps the DB query so it only runs once per hour (or until updated)
export const getSettings = unstable_cache(
  async () => {
    const result = await db.select().from(systemSettings).limit(1);
    return result[0] || null;
  },
  ['system-settings'], // Cache Key
  { tags: ['settings'], revalidate: 3600 }
);

// 2. SAVE SETTINGS
export async function saveSettings(data: typeof systemSettings.$inferInsert) {
  // We check if a row exists (ID=1). If so update, else insert.
  const existing = await getSettings();
  
  if (existing) {
    await db.update(systemSettings)
      .set({ ...data, updated_at: new Date() })
      .where(eq(systemSettings.id, existing.id));
  } else {
    await db.insert(systemSettings).values(data);
  }
  
  // AFTER the update, clear the cache so the app sees new keys immediately
  revalidatePath('/settings');
  
  return { success: true };
}

// 3. TEST COMICVINE CONNECTION
export async function testComicVineConnection(apiKey: string) {
  if (!apiKey) return { success: false, message: "No API Key provided" };
  
  try {
    const res = await fetch(`https://comicvine.gamespot.com/api/types/?api_key=${apiKey}&format=json`, {
      headers: { 'User-Agent': 'Vidiai-Longbox/1.0' }
    });
    
    if (res.ok) return { success: true, message: "Connected to ComicVine!" };
    return { success: false, message: `Failed: ${res.statusText}` };
  } catch (error) {
    return { success: false, message: "Connection Error" };
  }
}

// 4. TEST KOMGA CONNECTION
export async function testKomgaConnection(url: string, user: string, pass: string) {
  if (!url) return { success: false, message: "No URL provided" };
  
  const cleanUrl = url.trim().replace(/\/$/, "");
  const cleanUser = user.trim();
  const cleanPass = pass.trim();

  console.log(`🔍 [DEBUG] Testing V2 Endpoint: '${cleanUrl}/api/v2/users/me'`);

  try {
    // UPDATED TO V2 👇
    const res = await fetch(`${cleanUrl}/api/v2/users/me`, {
      headers: {
        'Authorization': 'Basic ' + Buffer.from(cleanUser + ":" + cleanPass).toString('base64'),
        'Accept': 'application/json',
      },
      cache: 'no-store'
    });

    console.log(`🔍 [DEBUG] Status: ${res.status}`);

    if (res.ok) {
        return { success: true, message: "Connected to Komga (v2)!" };
    }
    
    // ... rest of the error handling ...
    const errorText = await res.text();
    console.log(`❌ [DEBUG] Server Reply: ${errorText.slice(0, 200)}...`);

    if (res.status === 401) return { success: false, message: "Auth Failed: Check Password" };
    if (res.status === 404) return { success: false, message: "404: Endpoint not found" };
    
    return { success: false, message: `Failed: ${res.status}` };

  } catch (error) {
    console.error("❌ [DEBUG] Network Error:", error);
    return { success: false, message: "Network Error: Check IP/Port" };
  }
}

