'use server';

import { db } from '@/db';
import { systemSettings } from '@/db/schema';
import { runFullScan } from '@/lib/scanner/scan-manager';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';

// --- SCANNER ACTION ---
export async function triggerScan() {
  const result = await runFullScan();
  revalidatePath('/');
  revalidatePath('/library');
  revalidatePath('/review');
  return result;
}

// --- SETTINGS ACTIONS ---

export async function getSettings() {
  try {
    // Fetch the first row (since it's a singleton table)
    const settings = await db.select({
      id: systemSettings.id,
      cv_api_key: systemSettings.cv_api_key,
      metron_username: systemSettings.metron_username,
      metron_api_key: systemSettings.metron_api_key,
      updated_at: systemSettings.updated_at,
    }).from(systemSettings).limit(1);
    return settings[0] || null;
  } catch (error) {
    console.error("Failed to get settings:", error);
    return null;
  }
}

export async function saveSettings(data: {
  cv_api_key?: string;
  metron_username?: string;
  metron_api_key?: string;
}) {
  try {
    // Check if a row exists
    const existing = await db.select({
      id: systemSettings.id,
    }).from(systemSettings).limit(1);

    if (existing.length > 0) {
      // Update only the fields that are provided
      await db.update(systemSettings)
        .set({
          ...(data.cv_api_key !== undefined && { cv_api_key: data.cv_api_key }),
          ...(data.metron_username !== undefined && { metron_username: data.metron_username }),
          ...(data.metron_api_key !== undefined && { metron_api_key: data.metron_api_key }),
          updated_at: new Date()
        })
        .where(eq(systemSettings.id, existing[0].id));
    } else {
      // Insert first time
      await db.insert(systemSettings).values({
        cv_api_key: data.cv_api_key,
        metron_username: data.metron_username,
        metron_api_key: data.metron_api_key,
      });
    }

    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error("Failed to save settings:", error);
    return { success: false };
  }
}

export async function testMetronConnection(username: string, apiKey: string) {
  if (!username || !apiKey) {
    return { success: false, message: "Username and API Key required" };
  }

  try {
    const auth = Buffer.from(`${username}:${apiKey}`).toString('base64');
    const res = await fetch('https://metron.cloud/api/publisher/', {
      headers: {
        'Authorization': `Basic ${auth}`,
        'Accept': 'application/json',
        'User-Agent': 'Longbox/1.0',
      },
    });

    if (res.ok) return { success: true, message: "Connected to Metron!" };
    if (res.status === 401) return { success: false, message: "Invalid credentials" };
    return { success: false, message: `Failed: ${res.statusText}` };
  } catch (error) {
    return { success: false, message: "Connection Error" };
  }
}
