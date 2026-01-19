'use server'

import { AppSettings } from '@/lib/app-settings';
import { revalidatePath } from 'next/cache';
import { initWatcher } from '@/lib/scanner/watcher';

export async function getLibraryPath(): Promise<string> {
  return await AppSettings.get('library_path', '/comics');
}

export async function updateLibraryPath(path: string) {
  if (!path || path.trim().length === 0) {
    return { error: 'Path cannot be empty' };
  }

  try {
    // 1. Update Database
    await AppSettings.set(
      'library_path',
      path.trim(),
      'Root directory inside the container to scan for books'
    );

    // 2. Hot-Swap the Watcher (No restart needed!)
    // This calls the logic we wrote earlier: "If path changed, close old watcher, start new one."
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      await initWatcher();
    }

    revalidatePath('/settings');
    return { success: true, message: `Library root moved to ${path}` };
  } catch (err) {
    console.error('[SETTINGS] Failed to update library path:', err);
    return { error: 'Database update failed', details: String(err) };
  }
}

export async function updateLibraryPathAction(formData: FormData) {
  const newPath = formData.get('path') as string;
  return await updateLibraryPath(newPath);
}

export async function triggerManualScan() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    console.log('[UI] Manual Rescan Requested');
    // Pass 'true' to force a restart/re-indexing
    await initWatcher(true);
    return { success: true, message: 'Scanner has been restarted.' };
  }
  return { error: 'Scanner not available in this runtime.' };
}

