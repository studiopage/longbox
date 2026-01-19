import postgres from 'postgres';

const connectionString = `postgresql://longbox:longbox_secret@localhost:5432/longbox`;
const sql = postgres(connectionString);

async function migrate() {
  console.log('🗑️  Dropping library_mapping table...');
  await sql`DROP TABLE IF EXISTS library_mapping CASCADE`;
  console.log('✅ Table dropped. Now run: npx drizzle-kit push');
  await sql.end();
}

migrate().catch(console.error);

