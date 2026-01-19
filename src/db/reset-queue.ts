import { db } from './index';
import { sql } from 'drizzle-orm';

async function clearQueue() {
  console.log('🧹 Clearing old review queue...');
  // Assuming the table is named 'requests' or similar based on your old schema
  await db.execute(sql`DELETE FROM "requests"`); 
  console.log('✅ Queue cleared.');
  process.exit(0);
}

clearQueue();
