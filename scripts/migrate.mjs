import { pushSchema } from 'drizzle-kit/api';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

const connectionString = process.env.DATABASE_URL ||
  `postgresql://${process.env.DB_USER || 'longbox'}:${process.env.DB_PASSWORD || 'longbox_secret'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'longbox'}`;

console.log('[MIGRATE] Running schema push...');

const sql = postgres(connectionString, { max: 1 });
const db = drizzle(sql);

try {
  // Import the pre-bundled schema (built via esbuild in Dockerfile)
  const schema = await import('../dist/schema.mjs');

  const result = await pushSchema(schema, db);

  if (result.statementsToExecute.length === 0) {
    console.log('[MIGRATE] Schema is up to date.');
  } else {
    if (result.warnings.length > 0) {
      console.log('[MIGRATE] Warnings:', result.warnings.join('\n'));
    }
    console.log(`[MIGRATE] Applying ${result.statementsToExecute.length} statements...`);
    await result.apply();
    console.log('[MIGRATE] Schema push complete.');
  }
} catch (err) {
  console.error('[MIGRATE] Schema push failed:', err.message);
  process.exit(1);
} finally {
  await sql.end();
}
