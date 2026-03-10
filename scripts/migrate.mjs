/**
 * Idempotent schema migration using CREATE IF NOT EXISTS.
 * Reads the drizzle migration SQL, wraps statements to be safe for
 * existing databases, and applies only what's missing.
 */
import postgres from 'postgres';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const connectionString = process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || 'longbox'}:${process.env.DB_PASSWORD || 'longbox_secret'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'longbox'}`;

console.log('[MIGRATE] Running database migration...');

const sql = postgres(connectionString, { max: 1 });

try {
  // Find the migration SQL file
  const drizzleDir = './drizzle';
  const files = readdirSync(drizzleDir).filter(f => f.endsWith('.sql')).sort();

  if (files.length === 0) {
    console.log('[MIGRATE] No migration files found.');
    process.exit(0);
  }

  const migrationSql = readFileSync(join(drizzleDir, files[0]), 'utf8');

  // Split on the drizzle statement breakpoint marker
  const statements = migrationSql
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  let applied = 0;
  let skipped = 0;

  for (const stmt of statements) {
    try {
      // Wrap CREATE TYPE with IF NOT EXISTS via DO block
      if (/^CREATE TYPE/i.test(stmt)) {
        const typeName = stmt.match(/CREATE TYPE\s+"?([^"(\s]+)"?\s*\.\s*"?([^"(\s]+)"?/i)
          || stmt.match(/CREATE TYPE\s+"?([^"(\s]+)"?/i);
        if (typeName) {
          const fullName = typeName[2] ? `${typeName[1]}.${typeName[2]}` : typeName[1];
          const exists = await sql`
            SELECT 1 FROM pg_type WHERE typname = ${fullName.replace(/^.*\./, '')}
          `;
          if (exists.length > 0) {
            skipped++;
            continue;
          }
        }
      }

      // Wrap CREATE TABLE with IF NOT EXISTS
      if (/^CREATE TABLE/i.test(stmt)) {
        const safe = stmt.replace(/CREATE TABLE\b/i, 'CREATE TABLE IF NOT EXISTS');
        await sql.unsafe(safe);
        applied++;
        continue;
      }

      // Wrap CREATE INDEX / CREATE UNIQUE INDEX with IF NOT EXISTS
      if (/^CREATE\s+(UNIQUE\s+)?INDEX/i.test(stmt)) {
        const safe = stmt.replace(/CREATE\s+(UNIQUE\s+)?INDEX\b/i, 'CREATE $1INDEX IF NOT EXISTS');
        await sql.unsafe(safe);
        applied++;
        continue;
      }

      // ALTER TABLE ADD COLUMN - check if column exists first
      if (/^ALTER TABLE.*ADD COLUMN/i.test(stmt)) {
        const safe = stmt.replace(/ADD COLUMN\b/i, 'ADD COLUMN IF NOT EXISTS');
        await sql.unsafe(safe);
        applied++;
        continue;
      }

      // ALTER TABLE ADD CONSTRAINT (foreign key) - skip if exists
      if (/^ALTER TABLE.*ADD CONSTRAINT/i.test(stmt)) {
        const constraintMatch = stmt.match(/ADD CONSTRAINT\s+"?([^"\s]+)"?/i);
        if (constraintMatch) {
          const exists = await sql`
            SELECT 1 FROM pg_constraint WHERE conname = ${constraintMatch[1]}
          `;
          if (exists.length > 0) {
            skipped++;
            continue;
          }
        }
      }

      // Run everything else as-is
      await sql.unsafe(stmt);
      applied++;
    } catch (err) {
      // 42710 = duplicate_object (type/enum already exists)
      // 42P07 = duplicate_table
      // 42701 = duplicate_column
      // 42P16 = duplicate constraint
      if (['42710', '42P07', '42701', '42P16'].includes(err.code)) {
        skipped++;
      } else {
        console.error(`[MIGRATE] Error executing statement: ${err.message}`);
        console.error(`[MIGRATE] Statement: ${stmt.substring(0, 100)}...`);
        throw err;
      }
    }
  }

  console.log(`[MIGRATE] Done. Applied: ${applied}, Skipped (already exists): ${skipped}`);
} catch (err) {
  console.error('[MIGRATE] Migration failed:', err.message);
  process.exit(1);
} finally {
  await sql.end();
}
