import { defineConfig } from 'drizzle-kit';

// Parse DATABASE_URL or use individual vars
const url = process.env.DATABASE_URL;
let host, port, user, password, database;

if (url) {
  const parsed = new URL(url);
  host = parsed.hostname;
  port = parseInt(parsed.port || '5432');
  user = decodeURIComponent(parsed.username);
  password = decodeURIComponent(parsed.password);
  database = parsed.pathname.slice(1);
} else {
  host = process.env.DB_HOST || 'localhost';
  port = parseInt(process.env.DB_PORT || '5432');
  user = process.env.DB_USER || 'longbox';
  password = process.env.DB_PASSWORD || 'longbox_secret';
  database = process.env.DB_NAME || 'longbox';
}

export default defineConfig({
  schema: './schema.mjs',
  dialect: 'postgresql',
  dbCredentials: { host, port, user, password, database },
});
