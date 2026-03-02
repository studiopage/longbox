import { z } from 'zod';

const envSchema = z.object({
  // Database - Either DATABASE_URL or individual DB connection vars
  DATABASE_URL: z.string().optional(),
  DB_HOST: z.string().optional().default('localhost'),
  DB_PORT: z.string().optional().default('5432'),
  DB_USER: z.string().optional().default('longbox'),
  DB_PASSWORD: z.string().optional().default('longbox_secret'),
  DB_NAME: z.string().optional().default('longbox'),

  // Node Environment
  NODE_ENV: z.enum(['development', 'production', 'test']).optional().default('development'),

  // Library Paths
  LIBRARY_PATH: z.string().optional().default('/comics'),
  LIBRARY_ROOT: z.string().optional().default('/comics'),
  NEXT_PUBLIC_LIBRARY_PATH: z.string().optional(),

  // ComicVine API (optional - may not be configured yet)
  COMICVINE_API_KEY: z.string().optional(),

  // Next.js Runtime
  NEXT_RUNTIME: z.string().optional(),

  // Next.js Public Variables
  NEXT_PUBLIC_APP_URL: z.string().optional(),
});

export type Env = z.infer<typeof envSchema>;

/**
 * Validates environment variables at startup.
 * Logs warnings for missing optional variables but allows the app to continue.
 */
export function validateEnv(): Env {
  try {
    const parsed = envSchema.parse(process.env);

    // Log successful validation in development
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Environment variables validated successfully');
    }

    return parsed;
  } catch (error) {
    if (error instanceof z.ZodError) {
      const issues = error.issues.map((issue) => {
        return `  - ${issue.path.join('.')}: ${issue.message}`;
      });

      console.warn('⚠️  Environment variable validation issues:');
      console.warn(issues.join('\n'));
      console.warn('\nUsing default values where possible. Check your .env file for optimal configuration.');

      // Return parsed values with defaults rather than throwing
      return envSchema.parse(process.env);
    }
    throw error;
  }
}

/**
 * Validated and typed environment variables.
 * Automatically validated on import.
 */
let env: Env;

try {
  env = validateEnv();
} catch (error) {
  // Fallback to minimal defaults if validation completely fails
  console.error('❌ Critical environment validation error:', error);
  env = envSchema.parse({});
}

export { env };
