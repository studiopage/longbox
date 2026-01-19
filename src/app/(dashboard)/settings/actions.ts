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
      updated_at: systemSettings.updated_at,
    }).from(systemSettings).limit(1);
    return settings[0] || null;
  } catch (error) {
    console.error("Failed to get settings:", error);
    return null;
  }
}

export async function saveSettings(data: { cv_api_key: string }) {
  try {
    // Check if a row exists
    const existing = await db.select({
      id: systemSettings.id,
    }).from(systemSettings).limit(1);
    
    if (existing.length > 0) {
      // Update
      await db.update(systemSettings)
        .set({ 
            cv_api_key: data.cv_api_key,
            updated_at: new Date()
        })
        .where(eq(systemSettings.id, existing[0].id));
    } else {
      // Insert first time
      await db.insert(systemSettings).values({
        cv_api_key: data.cv_api_key
      });
    }
    
    revalidatePath('/settings');
    return { success: true };
  } catch (error) {
    console.error("Failed to save settings:", error);
    return { success: false };
  }
}
