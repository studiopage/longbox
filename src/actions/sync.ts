'use server'

import { db } from '@/db';
import { libraryMapping } from '@/db/schema';
import { getKomgaSeries } from '@/lib/komga';
import { revalidatePath } from 'next/cache';
import { v4 as uuidv4 } from 'uuid';
import { sql } from 'drizzle-orm';

export async function syncLibrary() {
  console.log('🚀 Starting Turbo Sync (LAN Mode)...');
  let page = 0;
  let totalImported = 0;
  let hasMore = true;

  try {
    while (hasMore) {
      // 1. Fetch Batch from Komga API (50 items)
      // We fetch larger batches to reduce network roundtrips
      const batch = await getKomgaSeries(page, 50);
      
      if (batch.length === 0) {
        hasMore = false;
        break;
      }

      // 2. Prepare Payload (In Memory Map)
      // Instead of 50 database calls, we build 1 big array
      const payload = batch.map(item => ({
        id: uuidv4(), // Generate a new ID (ignored if updating)
        komga_series_id: item.id,
        local_title: item.metadata.title || item.name,
        match_confidence: 0,
        is_manually_verified: false,
        updated_at: new Date(),
      }));

      // 3. BULK WRITE (One Transaction per Batch)
      // This is the "Turbo" part. 1 Query instead of 50.
      await db.insert(libraryMapping)
        .values(payload)
        .onConflictDoUpdate({
          target: libraryMapping.komga_series_id,
          set: { 
            local_title: sql`excluded.local_title`,
            updated_at: new Date()
          }
        });

      totalImported += batch.length;
      console.log(`⚡ Page ${page}: Bulk inserted ${batch.length} items.`);
      page++;
    }

    console.log(`✅ Turbo Sync Complete. Total: ${totalImported}`);
    revalidatePath('/library');
    return { success: true, count: totalImported };

  } catch (error) {
    console.error('❌ Sync Failed:', error);
    return { success: false, error: 'Sync failed' };
  }
}

