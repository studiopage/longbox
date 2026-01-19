'use server'

import { getKomgaSeries } from '@/lib/komga';

export async function testKomgaConnection() {
  console.log('📡 Pinging Komga...');
  const results = await getKomgaSeries(0, 5); // Fetch first 5
  
  if (results.length > 0) {
    console.log(`✅ Success! Found ${results.length} series.`);
    console.log('First hit:', results[0].name);
    return { success: true, count: results.length, first: results[0].name };
  } else {
    console.log('⚠️ Connected, but returned 0 series (or failed). check logs.');
    return { success: false, error: 'No data or connection failed' };
  }
}

