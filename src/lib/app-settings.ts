import { db } from '@/db';
import { appSettings } from '@/db/schema';
import { eq } from 'drizzle-orm';

export const AppSettings = {
  /**
   * Get a setting value, with optional default
   */
  get: async (key: string, defaultValue: string = ''): Promise<string> => {
    try {
      const result = await db.select()
        .from(appSettings)
        .where(eq(appSettings.key, key))
        .limit(1);
      
      return result[0]?.value || defaultValue;
    } catch (e) {
      console.error(`[SETTINGS] Failed to fetch setting "${key}"`, e);
      return defaultValue;
    }
  },

  /**
   * Set a setting value
   */
  set: async (key: string, value: string, description?: string) => {
    await db.insert(appSettings).values({
      key,
      value,
      description,
      updated_at: new Date()
    }).onConflictDoUpdate({
      target: appSettings.key,
      set: {
        value,
        description,
        updated_at: new Date()
      }
    });
  },

  /**
   * Get all settings as a map
   */
  getAll: async (): Promise<Record<string, string>> => {
    try {
      const results = await db.select().from(appSettings);
      return results.reduce((acc, row) => {
        acc[row.key] = row.value;
        return acc;
      }, {} as Record<string, string>);
    } catch (e) {
      console.error('[SETTINGS] Failed to fetch all settings', e);
      return {};
    }
  }
};

