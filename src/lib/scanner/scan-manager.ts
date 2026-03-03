import fs from 'fs/promises';
import path from 'path';
import { db } from '@/db';
import { books, series, triageQueue } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { extractComicInfo } from '@/lib/metadata/parser';
import { scannerProgress } from './progress-emitter';

// Use ENV variable for path
const LIBRARY_PATH = process.env.LIBRARY_PATH || '/comics';
const ALLOWED_EXTS = ['.cbz', '.zip', '.cbr'];

/**
 * Extract issue number from filename
 * Handles patterns like:
 * - "Series Name 001 (2024).cbz" -> 1
 * - "Series Name #5.cbz" -> 5
 * - "Series Name 03 (of 04).cbr" -> 3
 * - "Series Name v2 012.cbz" -> 12
 */
function extractIssueNumberFromFilename(fileName: string): number | null {
  // Remove extension
  const baseName = fileName.replace(/\.[^/.]+$/, '');

  // Pattern 1: "03 (of 04)" or "001 (of 012)" - common for limited series
  const ofPattern = /\b(\d{1,3})\s*\(of\s*\d+\)/i;
  const ofMatch = baseName.match(ofPattern);
  if (ofMatch) {
    return parseInt(ofMatch[1], 10);
  }

  // Pattern 2: "#5" or "# 05"
  const hashPattern = /#\s*(\d+)/;
  const hashMatch = baseName.match(hashPattern);
  if (hashMatch) {
    return parseInt(hashMatch[1], 10);
  }

  // Pattern 3: Last standalone number before parentheses or end
  // "Series Name 001 (2024)" or "Series Name 012"
  // But not year-like numbers (1900-2099)
  const numbers = baseName.match(/\b(\d{1,3})\b(?!\d)/g);
  if (numbers && numbers.length > 0) {
    // Filter out year-like numbers
    const nonYears = numbers.filter(n => {
      const num = parseInt(n, 10);
      return num < 1900 || num > 2099;
    });

    if (nonYears.length > 0) {
      // Take the last non-year number (most likely the issue number)
      return parseInt(nonYears[nonYears.length - 1], 10);
    }
  }

  return null;
}

export async function runFullScan() {
  console.log(`[SCANNER] Smart Scan on ${LIBRARY_PATH}...`);
  const startTime = Date.now();
  let added = 0;
  let queued = 0;
  let errors = 0;
  let allFiles: string[] = [];

  try {
    try {
      await fs.access(LIBRARY_PATH);
    } catch {
      console.error(`[SCANNER] Error: ${LIBRARY_PATH} is not accessible.`);
      scannerProgress.errorScan(`Library path ${LIBRARY_PATH} is not accessible`);
      return { success: false, count: 0, queued: 0, time: "0" };
    }

    // First, collect all files to get total count
    await collectFiles(LIBRARY_PATH);
    const totalFiles = allFiles.length;
    console.log(`[SCANNER] Found ${totalFiles} comic files to process`);

    // Start progress tracking
    scannerProgress.startScan(totalFiles);

    await processDirectory(LIBRARY_PATH);

  } catch (err) {
    console.error(`[SCANNER] Critical Failure:`, err);
    scannerProgress.errorScan(String(err));
    return { success: false, count: 0, queued: 0, time: "0" };
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[SCANNER] Scan complete in ${duration}s. Added: ${added} books. Queued: ${queued} files.`);

  // Complete progress tracking
  scannerProgress.completeScan({ added, queued, errors, time: duration });

  return { success: true, count: added, queued, time: duration };

  // --- COLLECT FILES FUNCTION ---
  async function collectFiles(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await collectFiles(fullPath);
      } else if (entry.isFile() && ALLOWED_EXTS.includes(path.extname(entry.name).toLowerCase())) {
        allFiles.push(fullPath);
      }
    }
  }

  // --- RECURSIVE WALKER ---
  async function processDirectory(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        await processDirectory(fullPath);
      } else if (entry.isFile() && ALLOWED_EXTS.includes(path.extname(entry.name).toLowerCase())) {
        await processFile(fullPath, entry.name, dir);
      }
    }
  }

  // --- FILE PROCESSOR ---
  async function processFile(filePath: string, fileName: string, parentDir: string) {
    let processed = added + queued + errors;

    // Emit progress update
    scannerProgress.updateProgress({
      currentFile: fileName,
      processed,
      added,
      queued,
      errors,
      message: `Processing: ${fileName}`
    });

    try {
      // Check if file already exists in LIBRARY
      const existingBook = await db.select({
        id: books.id,
      })
        .from(books)
        .where(eq(books.file_path, filePath))
        .limit(1);

      if (existingBook.length > 0) {
        return; // Skip - already in library
      }

      // Check if file is already in QUEUE
      const existingQueue = await db.select({
        id: triageQueue.id,
      })
        .from(triageQueue)
        .where(eq(triageQueue.file_path, filePath))
        .limit(1);

      if (existingQueue.length > 0) {
        return; // Skip - already queued
      }

      // 1. Analyze
      const metadata = await extractComicInfo(filePath);
      const stats = await fs.stat(filePath);
      const parentFolderName = path.basename(parentDir);
      const seriesName = metadata?.series || parentFolderName;

      // Extract issue number from metadata, or fallback to filename parsing
      const issueNumber = metadata?.number ?? extractIssueNumberFromFilename(fileName) ?? 1;

      // 2. CHECK: Do we know this series?
      const existingSeries = await db.select({
        id: series.id,
      })
        .from(series)
        .where(eq(series.name, seriesName))
        .limit(1);

      if (existingSeries.length > 0) {
        // ✅ KNOWN SERIES -> AUTO ADD
        await db.insert(books).values({
          title: metadata?.title || fileName.replace(/\.[^/.]+$/, ""),
          number: String(issueNumber),
          series_id: existingSeries[0].id,
          file_path: filePath,
          file_size: stats.size,
          page_count: metadata?.pageCount || 0,
          summary: metadata?.summary,
          publisher: metadata?.publisher,
          authors: [metadata?.writer, metadata?.penciller].filter(Boolean).join(", "),
          published_date: metadata?.year
            ? new Date(metadata.year, (metadata.month || 1) - 1, 1)
            : null
        }).onConflictDoUpdate({
          target: books.file_path,
          set: {
            updated_at: new Date(),
            summary: metadata?.summary,
            authors: [metadata?.writer, metadata?.penciller].filter(Boolean).join(", "),
          }
        });
        added++;
        console.log(`[SCANNER] Added: ${fileName} (Issue #${issueNumber})`);
      } else {
        // ⚠️ UNKNOWN SERIES -> QUEUE IT
        await db.insert(triageQueue).values({
          file_path: filePath,
          file_size: stats.size,
          suggested_series: seriesName,
          suggested_title: metadata?.title || fileName,
          suggested_number: String(issueNumber),
          metadata_xml: JSON.stringify(metadata || {}),
          status: 'pending',
        });
        queued++;
        console.log(`[SCANNER] Queued: ${fileName} (New Series: ${seriesName}, Issue #${issueNumber})`);
      }
    } catch (e) {
      console.warn(`[SCANNER] Failed to process ${fileName}:`, e);
      errors++;
    }
  }
}
