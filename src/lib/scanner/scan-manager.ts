import fs from 'fs/promises';
import path from 'path';
import { db } from '@/db';
import { books, series, importQueue } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { extractComicInfo } from '@/lib/metadata/parser'; 

// Use ENV variable for path
const LIBRARY_PATH = process.env.LIBRARY_PATH || '/comics'; 
const ALLOWED_EXTS = ['.cbz', '.zip', '.cbr'];

export async function runFullScan() {
  console.log(`[SCANNER] Smart Scan on ${LIBRARY_PATH}...`);
  const startTime = Date.now();
  let added = 0;
  let queued = 0;

  try {
    try {
      await fs.access(LIBRARY_PATH);
    } catch {
      console.error(`[SCANNER] Error: ${LIBRARY_PATH} is not accessible.`);
      return { success: false, count: 0, queued: 0, time: "0" };
    }

    await processDirectory(LIBRARY_PATH);
  
  } catch (err) {
    console.error(`[SCANNER] Critical Failure:`, err);
    return { success: false, count: 0, queued: 0, time: "0" };
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`[SCANNER] Scan complete in ${duration}s. Added: ${added} books. Queued: ${queued} files.`);
  return { success: true, count: added, queued, time: duration };

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
        id: importQueue.id,
      })
        .from(importQueue)
        .where(eq(importQueue.file_path, filePath))
        .limit(1);
      
      if (existingQueue.length > 0) {
        return; // Skip - already queued
      }

      // 1. Analyze
      const metadata = await extractComicInfo(filePath);
      const stats = await fs.stat(filePath);
      const parentFolderName = path.basename(parentDir); 
      const seriesName = metadata?.series || parentFolderName;

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
          number: metadata?.number || "1",
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
        console.log(`[SCANNER] Added: ${fileName}`);
      } else {
        // ⚠️ UNKNOWN SERIES -> QUEUE IT
        await db.insert(importQueue).values({
          file_path: filePath,
          file_size: stats.size,
          suggested_series: seriesName,
          suggested_title: metadata?.title || fileName,
          suggested_number: metadata?.number,
          metadata_xml: JSON.stringify(metadata || {}),
        });
        queued++;
        console.log(`[SCANNER] Queued: ${fileName} (New Series: ${seriesName})`);
      }
    } catch (e) {
      console.warn(`[SCANNER] Failed to process ${fileName}:`, e);
    }
  }
}
