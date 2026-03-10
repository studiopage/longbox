import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { readFileSync } from 'fs';

const connectionString = process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || 'longbox'}:${process.env.DB_PASSWORD || 'longbox_secret'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'longbox'}`;

console.log('[MIGRATE] Running database migrations...');

const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

try {
  // Check if DB has existing tables but no migration journal
  // (created via drizzle-kit push, not migrate)
  const tables = await sql`
    SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  `;
  const hasExistingTables = tables.some(t => t.tablename === 'users' || t.tablename === 'series');

  const journalExists = await sql`
    SELECT EXISTS (
      SELECT FROM pg_tables WHERE schemaname = 'drizzle' AND tablename = '__drizzle_migrations'
    ) as exists
  `;
  const hasJournal = journalExists[0]?.exists === true;

  let journalHasEntries = false;
  if (hasJournal) {
    const entries = await sql`SELECT count(*) as cnt FROM drizzle.__drizzle_migrations`;
    journalHasEntries = parseInt(entries[0]?.cnt) > 0;
  }

  if (hasExistingTables && !journalHasEntries) {
    // DB was set up via push — stamp the initial migration as applied
    console.log('[MIGRATE] Existing database detected (no migration journal). Stamping initial migration...');

    // Read the journal to find the initial migration hash
    const journal = JSON.parse(readFileSync('./drizzle/meta/_journal.json', 'utf8'));
    const initial = journal.entries[0];

    // Create the drizzle schema and migrations table if needed
    await sql`CREATE SCHEMA IF NOT EXISTS drizzle`;
    await sql`
      CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
        id SERIAL PRIMARY KEY,
        hash TEXT NOT NULL,
        created_at BIGINT
      )
    `;

    // Stamp the initial migration
    await sql`
      INSERT INTO drizzle.__drizzle_migrations (hash, created_at)
      VALUES (${initial.tag}, ${initial.when})
    `;

    console.log('[MIGRATE] Initial migration stamped. Running remaining migrations...');
  }

  await migrate(db, { migrationsFolder: './drizzle' });
  console.log('[MIGRATE] Migrations complete.');
} catch (err) {
  console.error('[MIGRATE] Migration failed:', err.message);
  process.exit(1);
} finally {
  await sql.end();
}
