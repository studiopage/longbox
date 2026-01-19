import { db } from './index';
import { sql } from 'drizzle-orm';

async function reset() {
  console.log('💥 Resetting Database...');
  
  // Drop ALL tables - CASCADE will handle dependencies
  await db.execute(sql`DROP SCHEMA public CASCADE`);
  await db.execute(sql`CREATE SCHEMA public`);
  await db.execute(sql`GRANT ALL ON SCHEMA public TO public`);
  
  console.log('✅ Database wiped clean.');
  process.exit(0);
}

reset().catch((err) => {
  console.error(err);
  process.exit(1);
});
