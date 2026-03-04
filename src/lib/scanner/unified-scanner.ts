import fs from 'fs/promises';
import path from 'path';
import { db } from '@/db';
import { scanJobs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { scannerProgress } from './progress-emitter';
import { processFile, type ProcessResult } from './pipeline';
import { AppSettings } from '@/lib/app-settings';

const ALLOWED_EXTS = ['.cbz', '.zip', '.cbr'];

/**
 * Get the configured library path.
 * Single source of truth: AppSettings DB row, falling back to env var, then '/comics'.
 */
export async function getLibraryPath(): Promise<string> {
  return AppSettings.get('library_path', process.env.LIBRARY_PATH || '/comics');
}

/**
 * Recursively collect all comic files under the given directory.
 */
async function collectFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    console.warn(`[SCANNER] Cannot read directory: ${dir}`);
    return results;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      const nested = await collectFiles(fullPath);
      results.push(...nested);
    } else if (entry.isFile() && ALLOWED_EXTS.includes(path.extname(entry.name).toLowerCase())) {
      results.push(fullPath);
    }
  }

  return results;
}

/**
 * Run a full library scan.
 *
 * 1. Reads library path from AppSettings
 * 2. Collects all comic files recursively
 * 3. Creates a scan_jobs row to track progress
 * 4. Processes each file through the matching pipeline
 * 5. Updates scan_jobs periodically and on completion
 * 6. Emits real-time progress via scannerProgress
 */
export async function runFullScan() {
  const libraryPath = await getLibraryPath();
  console.log(`[SCANNER] Starting full scan on: ${libraryPath}`);
  const startTime = Date.now();

  let matched = 0;
  let triaged = 0;
  let errors = 0;
  let skipped = 0;

  // Verify path is accessible
  try {
    await fs.access(libraryPath);
  } catch {
    const msg = `Library path ${libraryPath} is not accessible`;
    console.error(`[SCANNER] ${msg}`);
    scannerProgress.errorScan(msg);
    return { success: false, count: 0, queued: 0, time: '0', jobId: null };
  }

  // Collect all comic files
  const allFiles = await collectFiles(libraryPath);
  const totalFiles = allFiles.length;
  console.log(`[SCANNER] Found ${totalFiles} comic files to process`);

  if (totalFiles === 0) {
    console.log('[SCANNER] No comic files found. Scan complete.');
    return { success: true, count: 0, queued: 0, time: '0', jobId: null };
  }

  // Create scan_jobs row
  const [job] = await db.insert(scanJobs).values({
    status: 'running',
    total_files: totalFiles,
    processed_files: 0,
    matched: 0,
    needs_review: 0,
    errors: 0,
  }).returning();

  // Start progress tracking
  scannerProgress.startScan(totalFiles);

  try {
    for (let i = 0; i < allFiles.length; i++) {
      const filePath = allFiles[i];
      const fileName = path.basename(filePath);

      // Get file size
      let fileSize = 0;
      try {
        const stats = await fs.stat(filePath);
        fileSize = stats.size;
      } catch {
        console.warn(`[SCANNER] Cannot stat file: ${filePath}`);
        errors++;
        continue;
      }

      // Process through pipeline
      const result: ProcessResult = await processFile(filePath, fileSize, libraryPath, job.id);

      // Tally results
      switch (result.action) {
        case 'linked':
        case 'linked_flagged':
          matched++;
          break;
        case 'triaged':
          triaged++;
          break;
        case 'skipped':
          skipped++;
          break;
        case 'error':
          errors++;
          break;
      }

      // Emit progress for every file
      const processed = i + 1;
      scannerProgress.updateProgress({
        currentFile: fileName,
        processed,
        added: matched,
        queued: triaged,
        errors,
        message: `Processing: ${fileName}`,
      });

      // Update scan_jobs row every 50 files
      if (processed % 50 === 0 || processed === totalFiles) {
        await db.update(scanJobs).set({
          processed_files: processed,
          matched,
          needs_review: triaged,
          errors,
          current_file: fileName,
        }).where(eq(scanJobs.id, job.id));
      }
    }

    // Mark scan complete
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);

    await db.update(scanJobs).set({
      status: 'completed',
      completed_at: new Date(),
      processed_files: allFiles.length,
      matched,
      needs_review: triaged,
      errors,
      current_file: null,
    }).where(eq(scanJobs.id, job.id));

    scannerProgress.completeScan({ added: matched, queued: triaged, errors, time: duration });

    console.log(`[SCANNER] Scan complete in ${duration}s. Matched: ${matched}, Triaged: ${triaged}, Skipped: ${skipped}, Errors: ${errors}`);
    return { success: true, count: matched, queued: triaged, time: duration, jobId: job.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[SCANNER] Critical failure:', message);

    // Mark scan as failed
    await db.update(scanJobs).set({
      status: 'failed',
      completed_at: new Date(),
      current_file: null,
    }).where(eq(scanJobs.id, job.id));

    scannerProgress.errorScan(message);

    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    return { success: false, count: matched, queued: triaged, time: duration, jobId: job.id };
  }
}
