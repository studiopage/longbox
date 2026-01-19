import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const connectionString = process.env.DATABASE_URL || 
  `postgresql://${process.env.DB_USER || 'longbox'}:${process.env.DB_PASSWORD || 'longbox_secret'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${process.env.DB_NAME || 'longbox'}`;

// 🛑 GLOBAL SINGLETON PATTERN
// This prevents Next.js from creating 100s of connections during hot-reloads
const globalQueryClient = global as unknown as { queryClient: postgres.Sql | undefined };

const queryClient = globalQueryClient.queryClient || postgres(connectionString, { 
    max: 10, // Limit pool size to 10 connections
    idle_timeout: 20, // Close idle connections fast
});

if (!globalQueryClient.queryClient) {
    globalQueryClient.queryClient = queryClient;
}

export const db = drizzle(queryClient, { schema });

