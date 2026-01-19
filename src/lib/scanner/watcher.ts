import chokidar, { type FSWatcher } from 'chokidar';
import yauzl from 'yauzl';
import { parseStringPromise } from 'xml2js';
import { db } from '@/db';
import { books, series } from '@/db/schema';
import { eq, sql, count } from 'drizzle-orm';
import { statSync, readdirSync } from 'fs';
import { join } from 'path';
import { AppSettings } from '@/lib/app-settings';
import { extractComicInfo } from '@/lib/metadata/parser';

let watcher: FSWatcher | null = null;
let currentWatchPath: string | null = null;

// --- 1. PARSER UTILS ---
async function extractMetadata(filePath: string) {
  return new Promise<any>((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err) return reject(err);
      
      let comicInfo: any = null;
      let pageCount = 0;
      let pages: any[] = [];
      
      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        // Count images
        if (entry.fileName.match(/\.(jpg|jpeg|png|webp)$/i)) {
          pages.push({ index: pageCount++, name: entry.fileName });
        }
        
        // Find ComicInfo.xml
        if (entry.fileName === 'ComicInfo.xml') {
          zipfile.openReadStream(entry, async (err, stream) => {
             if (stream) {
               const chunks: Buffer[] = [];
               for await (const chunk of stream) chunks.push(chunk);
               const buffer = Buffer.concat(chunks);
               try {
                 const parsed = await parseStringPromise(buffer.toString());
                 comicInfo = parsed.ComicInfo;
               } catch (e) { 
                 console.error("[SCANNER] XML Parse Error", e); 
               }
             }
          });
        }
        zipfile.readEntry();
      });

      zipfile.on('end', () => {
        resolve({ comicInfo, pageCount, pages });
      });
    });
  });
}

// --- 2. DB LOGIC ---
async function handleAdd(path: string) {
  if (!path.match(/\.(cbz|zip)$/i)) return;
  console.log(`[SCANNER] Detected: ${path}`);

  try {
    // 1. EXTRACT METADATA
    // We attempt to read the XML. If it fails, we get null.
    const metadata = await extractComicInfo(path);
    
    // Also extract page count and pages metadata (for backward compatibility)
    const { pageCount, pages } = await extractMetadata(path);
    
    // Extract series name (Folder name as fallback)
    const pathParts = path.split('/');
    const folderName = pathParts[pathParts.length - 2] || 'Unknown';
    const fileName = pathParts[pathParts.length - 1] || 'Unknown';
    
    // 2. DETERMINE SERIES NAME
    // Priority: XML Series Name -> Folder Name -> "Unknown"
    const seriesName = metadata?.series || folderName;
    const pathSource = pathParts.slice(0, -1).join('/'); // Full folder path
    
    // 1. Upsert Series (by name, since we no longer track path_source)
    let seriesId: string;
    const existingSeries = await db.query.series.findFirst({
      where: eq(series.name, seriesName)
    });

    if (existingSeries) {
      seriesId = existingSeries.id;
    } else {
      const [inserted] = await db.insert(series).values({
        name: seriesName,
      }).returning();
      seriesId = inserted.id;
    }

    // 2. Get file size
    let fileSize = 0;
    const stats = statSync(path);
    fileSize = stats.size;

    // 3. DETERMINE AUTHORS
    const authorList = [metadata?.writer, metadata?.penciller].filter(Boolean).join(", ");

    // 4. INSERT BOOK
    const bookTitle = metadata?.title || fileName;
    const bookNumber = metadata?.number?.toString() || '1';
    const bookPageCount = metadata?.pageCount || pageCount || 0;
    const bookSummary = metadata?.summary || null;
    const bookPublisher = metadata?.publisher || null;
    const bookAuthors = authorList || null;
    const bookPublishedDate = metadata?.year 
      ? new Date(metadata.year, (metadata.month || 1) - 1, 1) 
      : null;

    await db.insert(books).values({
      series_id: seriesId,
      // If XML has a title ("Court of Owls"), use it. Otherwise use filename.
      title: bookTitle, 
      number: bookNumber,
      page_count: bookPageCount,
      file_path: path,
      file_size: fileSize,
      
      // NEW FIELDS
      summary: bookSummary,
      publisher: bookPublisher,
      authors: bookAuthors,
      published_date: bookPublishedDate
    }).onConflictDoUpdate({
      target: books.file_path,
      set: {
        // If we re-scan, update the metadata
        title: bookTitle,
        summary: bookSummary,
        authors: bookAuthors,
        publisher: bookPublisher,
        published_date: bookPublishedDate,
        page_count: bookPageCount,
        file_size: fileSize,
        updated_at: new Date()
      }
    });

    console.log(`[SCANNER] Ingested: ${seriesName} #${metadata?.number || 1}`);

  } catch (err) {
    console.error(`[SCANNER] Failed to ingest ${path}`, err);
  }
}

// --- 3. HANDLE FILE DELETION ---
async function handleRemove(path: string) {
  if (!path.match(/\.(cbz|zip)$/i)) return;
  console.log(`[SCANNER] File removed: ${path}`);

  try {
    // Delete the book record
    await db.delete(books).where(eq(books.file_path, path));
    console.log(`[SCANNER] Removed book record: ${path}`);
  } catch (err) {
    console.error(`[SCANNER] Failed to remove book record for ${path}`, err);
  }
}

// --- 4. RECURSIVE FILE SCANNER ---
function getFilesRecursively(dirPath: string, arrayOfFiles: string[] = []): string[] {
  try {
    const files = readdirSync(dirPath);

    files.forEach((file) => {
      const filePath = join(dirPath, file);
      try {
        if (statSync(filePath).isDirectory()) {
          arrayOfFiles = getFilesRecursively(filePath, arrayOfFiles);
        } else {
          arrayOfFiles.push(filePath);
        }
      } catch (e) {
        // Skip files we can't access
        console.warn(`[SCANNER] Cannot access ${filePath}`);
      }
    });
  } catch (e) {
    console.error(`[SCANNER] Cannot read directory ${dirPath}:`, e);
  }

  return arrayOfFiles;
}

// --- 5. FULL SYNC FUNCTION ---
export async function sync(libraryPath: string) {
  console.log(`[SCANNER] Starting full sync of: ${libraryPath}`);

  // 1. Get all files on disk
  const filesOnDisk = getFilesRecursively(libraryPath);

  // SAFETY CHECK: If we found 0 files, but the DB has > 0 books, 
  // assume the mount is broken and ABORT.
  if (filesOnDisk.length === 0) {
    const dbCount = await db.select({ count: count() }).from(books);
    if (dbCount[0].count > 0) {
      console.error("🚨 [SAFETY SHUTDOWN] Scanner found 0 files but DB is populated. Mount likely disconnected. Aborting sync.");
      return; // STOP! Do not delete anything.
    }
  }

  // Filter to only CBZ/ZIP files
  const comicFiles = filesOnDisk.filter(f => /\.(cbz|zip)$/i.test(f));
  console.log(`[SCANNER] Found ${comicFiles.length} comic files on disk`);

  // Get all book paths from DB
  const dbBooks = await db.select({ file_path: books.file_path }).from(books);
  const dbPaths = new Set(dbBooks.map(b => b.file_path));
  const diskPaths = new Set(comicFiles);

  // Find files to add (on disk but not in DB)
  const toAdd = comicFiles.filter(f => !dbPaths.has(f));
  
  // Find files to remove (in DB but not on disk)
  const toRemove = Array.from(dbPaths).filter(p => !diskPaths.has(p));

  console.log(`[SCANNER] Sync plan: +${toAdd.length} to add, -${toRemove.length} to remove`);

  // Process additions
  for (const file of toAdd) {
    await handleAdd(file);
  }

  // Process removals
  for (const file of toRemove) {
    await handleRemove(file);
  }

  console.log(`[SCANNER] Sync complete`);
}

// --- 6. INIT ---
export async function initWatcher(forceRestart: boolean = false) {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    
    // 1. Fetch Path from DB (fallback to ENV, then default)
    const libraryPath = await AppSettings.get(
      'library_path',
      process.env.LIBRARY_ROOT || '/comics'
    );
    
    // 2. Prevent Duplicate Watchers (unless forced)
    if (watcher && currentWatchPath === libraryPath && !forceRestart) {
      console.log(`[SCANNER] Already watching: ${libraryPath}`);
      return; // Already watching the correct path
    }

    // 3. Reset if path changed or forced restart
    if (watcher) {
      if (forceRestart) {
        console.log(`[SCANNER] Force restart requested. Restarting watcher...`);
      } else {
        console.log(`[SCANNER] Path changed from ${currentWatchPath} to ${libraryPath}. Restarting watcher...`);
      }
      await watcher.close();
      watcher = null;
    }

    console.log(`[SCANNER] Initializing watcher on: ${libraryPath}`);
    currentWatchPath = libraryPath;

    watcher = chokidar.watch(libraryPath, {
      ignored: /(^|[\/\\])\../,
      persistent: true,
      depth: 4,
      awaitWriteFinish: { stabilityThreshold: 2000 }
    });

    watcher.on('add', handleAdd);
    watcher.on('unlink', handleRemove); // Handle file deletions
    
    console.log(`[SCANNER] Watcher active and monitoring: ${libraryPath}`);
  }
}

