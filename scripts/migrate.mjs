/**
 * Idempotent schema migration.
 * Reads the drizzle migration SQL, applies statements safely for both
 * fresh and existing databases. For existing tables, adds any missing columns.
 */
import postgres from 'postgres';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const connectionString = process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || 'longbox'}:${process.env.DB_PASSWORD || 'longbox_secret'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'longbox'}`;

console.log('[MIGRATE] Running database migration...');

const sql = postgres(connectionString, { max: 1 });

/**
 * Parse column definitions from a CREATE TABLE statement.
 * Returns array of { name, definition } for each column.
 */
function parseColumns(createStmt) {
  // Extract the part between ( and the last )
  const match = createStmt.match(/CREATE TABLE[^(]*\(([\s\S]*)\)/i);
  if (!match) return [];

  const body = match[1];
  const columns = [];

  // Split by commas that are not inside parentheses
  let depth = 0;
  let current = '';
  for (const char of body) {
    if (char === '(') depth++;
    else if (char === ')') depth--;
    else if (char === ',' && depth === 0) {
      columns.push(current.trim());
      current = '';
      continue;
    }
    current += char;
  }
  if (current.trim()) columns.push(current.trim());

  // Parse each column line — skip constraints (PRIMARY KEY, UNIQUE, CONSTRAINT, etc.)
  return columns
    .filter(c => !c.match(/^\s*(PRIMARY KEY|UNIQUE|CONSTRAINT|CHECK|FOREIGN KEY)/i))
    .map(c => {
      const colMatch = c.match(/^"?(\w+)"?\s+(.+)$/s);
      if (!colMatch) return null;
      return { name: colMatch[1], definition: colMatch[2].trim() };
    })
    .filter(Boolean);
}

try {
  const drizzleDir = './drizzle';
  const files = readdirSync(drizzleDir).filter(f => f.endsWith('.sql')).sort();

  if (files.length === 0) {
    console.log('[MIGRATE] No migration files found.');
    process.exit(0);
  }

  const migrationSql = readFileSync(join(drizzleDir, files[0]), 'utf8');

  const statements = migrationSql
    .split('--> statement-breakpoint')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  let applied = 0;
  let skipped = 0;

  for (const stmt of statements) {
    try {
      // CREATE TYPE — skip if exists
      if (/^CREATE TYPE/i.test(stmt)) {
        const typeName = stmt.match(/CREATE TYPE\s+"?([^"(\s]+)"?\s*\.\s*"?([^"(\s]+)"?/i)
          || stmt.match(/CREATE TYPE\s+"?([^"(\s]+)"?/i);
        if (typeName) {
          const name = typeName[2] ? typeName[2] : typeName[1];
          const exists = await sql`SELECT 1 FROM pg_type WHERE typname = ${name}`;
          if (exists.length > 0) { skipped++; continue; }
        }
        await sql.unsafe(stmt);
        applied++;
        continue;
      }

      // CREATE TABLE — use IF NOT EXISTS, then ensure all columns exist
      if (/^CREATE TABLE/i.test(stmt)) {
        const tableMatch = stmt.match(/CREATE TABLE\s+"?(\w+)"?\s*\.\s*"?(\w+)"?/i)
          || stmt.match(/CREATE TABLE\s+"?(\w+)"?/i);
        const tableName = tableMatch?.[2] || tableMatch?.[1];

        // Try creating the table
        const safe = stmt.replace(/CREATE TABLE\b/i, 'CREATE TABLE IF NOT EXISTS');
        await sql.unsafe(safe);

        // Ensure missing columns are added to existing tables
        if (tableName) {
          const existingCols = await sql`
            SELECT column_name FROM information_schema.columns
            WHERE table_schema = 'public' AND table_name = ${tableName}
          `;
          const existingNames = new Set(existingCols.map(r => r.column_name));
          const columns = parseColumns(stmt);

          for (const col of columns) {
            if (!existingNames.has(col.name)) {
              const addCol = `ALTER TABLE "${tableName}" ADD COLUMN IF NOT EXISTS "${col.name}" ${col.definition}`;
              try {
                await sql.unsafe(addCol);
                console.log(`[MIGRATE] Added column "${col.name}" to "${tableName}"`);
              } catch (e) {
                if (e.code !== '42701') throw e; // 42701 = duplicate column
              }
            }
          }
        }

        applied++;
        continue;
      }

      // CREATE INDEX — use IF NOT EXISTS
      if (/^CREATE\s+(UNIQUE\s+)?INDEX/i.test(stmt)) {
        const safe = stmt.replace(/CREATE\s+(UNIQUE\s+)?INDEX\b/i, 'CREATE $1INDEX IF NOT EXISTS');
        await sql.unsafe(safe);
        applied++;
        continue;
      }

      // ALTER TABLE ADD COLUMN — use IF NOT EXISTS
      if (/^ALTER TABLE.*ADD COLUMN/i.test(stmt)) {
        const safe = stmt.replace(/ADD COLUMN\b/i, 'ADD COLUMN IF NOT EXISTS');
        await sql.unsafe(safe);
        applied++;
        continue;
      }

      // ALTER TABLE ADD CONSTRAINT — skip if exists
      if (/^ALTER TABLE.*ADD CONSTRAINT/i.test(stmt)) {
        const constraintMatch = stmt.match(/ADD CONSTRAINT\s+"?([^"\s]+)"?/i);
        if (constraintMatch) {
          const exists = await sql`
            SELECT 1 FROM pg_constraint WHERE conname = ${constraintMatch[1]}
          `;
          if (exists.length > 0) { skipped++; continue; }
        }
        await sql.unsafe(stmt);
        applied++;
        continue;
      }

      // Everything else — run as-is
      await sql.unsafe(stmt);
      applied++;
    } catch (err) {
      if (['42710', '42P07', '42701', '42P16'].includes(err.code)) {
        skipped++;
      } else {
        console.error(`[MIGRATE] Error: ${err.message}`);
        console.error(`[MIGRATE] Statement: ${stmt.substring(0, 120)}...`);
        throw err;
      }
    }
  }

  console.log(`[MIGRATE] Done. Applied: ${applied}, Skipped: ${skipped}`);
} catch (err) {
  console.error('[MIGRATE] Migration failed:', err.message);
  process.exit(1);
} finally {
  await sql.end();
}
