import chokidar, { type FSWatcher } from 'chokidar';
import { db } from '@/db';
import { books } from '@/db/schema';
import { eq, count } from 'drizzle-orm';
import { statSync, readdirSync } from 'fs';
import { join } from 'path';
import { AppSettings } from '@/lib/app-settings';
import { processFile } from './pipeline';

const ALLOWED_EXTS_RE = /\.(cbz|zip|cbr)$/i;

let watcher: FSWatcher | null = null;
let currentWatchPath: string | null = null;

// --- HANDLE FILE ADDITION ---
async function handleAdd(filePath: string) {
  if (!ALLOWED_EXTS_RE.test(filePath)) return;
  console.log(`[WATCHER] Detected: ${filePath}`);

  try {
    const stats = statSync(filePath);
    const libraryRoot = currentWatchPath || '/comics';
    const result = await processFile(filePath, stats.size, libraryRoot);

    switch (result.action) {
      case 'linked':
        console.log(`[WATCHER] Linked: ${filePath} → ${result.seriesName} (${(result.confidence! * 100).toFixed(0)}%)`);
        break;
      case 'linked_flagged':
        console.log(`[WATCHER] Linked (flagged): ${filePath} → ${result.seriesName} (${(result.confidence! * 100).toFixed(0)}%)`);
        break;
      case 'triaged':
        console.log(`[WATCHER] Triaged: ${filePath} → ${result.seriesName} (${(result.confidence! * 100).toFixed(0)}%)`);
        break;
      case 'skipped':
        console.log(`[WATCHER] Skipped (already exists): ${filePath}`);
        break;
      case 'error':
        console.error(`[WATCHER] Error processing ${filePath}: ${result.error}`);
        break;
    }
  } catch (err) {
    console.error(`[WATCHER] Failed to process ${filePath}`, err);
  }
}

// --- HANDLE FILE DELETION ---
async function handleRemove(filePath: string) {
  if (!ALLOWED_EXTS_RE.test(filePath)) return;
  console.log(`[WATCHER] File removed: ${filePath}`);

  try {
    await db.delete(books).where(eq(books.file_path, filePath));
    console.log(`[WATCHER] Removed book record: ${filePath}`);
  } catch (err) {
    console.error(`[WATCHER] Failed to remove book record for ${filePath}`, err);
  }
}

// --- RECURSIVE FILE SCANNER ---
function getFilesRecursively(dirPath: string, arrayOfFiles: string[] = []): string[] {
  try {
    const files = readdirSync(dirPath);

    files.forEach((file) => {
      const fullPath = join(dirPath, file);
      try {
        if (statSync(fullPath).isDirectory()) {
          arrayOfFiles = getFilesRecursively(fullPath, arrayOfFiles);
        } else {
          arrayOfFiles.push(fullPath);
        }
      } catch {
        console.warn(`[WATCHER] Cannot access ${fullPath}`);
      }
    });
  } catch {
    console.error(`[WATCHER] Cannot read directory ${dirPath}`);
  }

  return arrayOfFiles;
}

// --- FULL SYNC FUNCTION ---
export async function sync(libraryPath: string) {
  console.log(`[WATCHER] Starting full sync of: ${libraryPath}`);

  // Get all files on disk
  const filesOnDisk = getFilesRecursively(libraryPath);

  // Safety check: if 0 files on disk but DB has books, abort (mount likely disconnected)
  if (filesOnDisk.length === 0) {
    const dbCount = await db.select({ count: count() }).from(books);
    if (dbCount[0].count > 0) {
      console.error('[WATCHER] Found 0 files but DB is populated. Mount likely disconnected. Aborting sync.');
      return;
    }
  }

  // Filter to comic files only
  const comicFiles = filesOnDisk.filter(f => ALLOWED_EXTS_RE.test(f));
  console.log(`[WATCHER] Found ${comicFiles.length} comic files on disk`);

  // Get all book paths from DB
  const dbBooks = await db.select({ file_path: books.file_path }).from(books);
  const dbPaths = new Set(dbBooks.map(b => b.file_path));
  const diskPaths = new Set(comicFiles);

  // Files to add (on disk but not in DB)
  const toAdd = comicFiles.filter(f => !dbPaths.has(f));

  // Files to remove (in DB but not on disk)
  const toRemove = Array.from(dbPaths).filter(p => !diskPaths.has(p));

  console.log(`[WATCHER] Sync plan: +${toAdd.length} to add, -${toRemove.length} to remove`);

  // Process additions through pipeline
  for (const file of toAdd) {
    await handleAdd(file);
  }

  // Process removals
  for (const file of toRemove) {
    await handleRemove(file);
  }

  console.log('[WATCHER] Sync complete');
}

// --- INIT ---
export async function initWatcher(forceRestart: boolean = false) {
  if (process.env.NEXT_RUNTIME === 'nodejs') {

    // Fetch path from DB (fallback to env, then default)
    const libraryPath = await AppSettings.get(
      'library_path',
      process.env.LIBRARY_ROOT || '/comics'
    );

    // Prevent duplicate watchers (unless forced)
    if (watcher && currentWatchPath === libraryPath && !forceRestart) {
      console.log(`[WATCHER] Already watching: ${libraryPath}`);
      return;
    }

    // Reset if path changed or forced restart
    if (watcher) {
      if (forceRestart) {
        console.log('[WATCHER] Force restart requested. Restarting watcher...');
      } else {
        console.log(`[WATCHER] Path changed from ${currentWatchPath} to ${libraryPath}. Restarting watcher...`);
      }
      await watcher.close();
      watcher = null;
    }

    console.log(`[WATCHER] Initializing watcher on: ${libraryPath}`);
    currentWatchPath = libraryPath;

    watcher = chokidar.watch(libraryPath, {
      ignored: /(^|[/\\])\../,
      persistent: true,
      depth: 4,
      awaitWriteFinish: { stabilityThreshold: 2000 },
    });

    watcher.on('add', handleAdd);
    watcher.on('unlink', handleRemove);

    console.log(`[WATCHER] Watcher active and monitoring: ${libraryPath}`);
  }
}
