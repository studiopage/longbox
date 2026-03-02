/**
 * Comic Cover Extractor
 *
 * Extracts the first page from CBZ/CBR files to use as cover thumbnails
 */

import yauzl from 'yauzl';
import { createExtractorFromData } from 'node-unrar-js';
import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';

interface CoverOptions {
  width?: number;
  height?: number;
  quality?: number;
}

const DEFAULT_COVER_OPTIONS: CoverOptions = {
  width: 400,
  height: 600,
  quality: 80,
};

/**
 * Extracts the first image from a comic file and generates a thumbnail
 *
 * @param comicFilePath - Path to the CBZ/CBR file
 * @param outputPath - Path where the thumbnail should be saved
 * @param options - Optional thumbnail generation options
 * @returns Promise that resolves when thumbnail is created
 */
export async function extractCoverThumbnail(
  comicFilePath: string,
  outputPath: string,
  options: CoverOptions = {}
): Promise<void> {
  const opts = { ...DEFAULT_COVER_OPTIONS, ...options };

  // Ensure the output directory exists
  const outputDir = path.dirname(outputPath);
  await fs.mkdir(outputDir, { recursive: true });

  const lowerPath = comicFilePath.toLowerCase();

  if (lowerPath.endsWith('.cbz') || lowerPath.endsWith('.zip')) {
    await extractCoverFromCBZ(comicFilePath, outputPath, opts);
  } else if (lowerPath.endsWith('.cbr') || lowerPath.endsWith('.rar')) {
    await extractCoverFromCBR(comicFilePath, outputPath, opts);
  } else {
    throw new Error('Unsupported comic file format');
  }
}

/**
 * Extracts the first image from a CBZ (zip) file
 * Sorts images alphabetically to ensure we get the cover (first page)
 */
async function extractCoverFromCBZ(
  zipPath: string,
  outputPath: string,
  options: CoverOptions
): Promise<void> {
  return new Promise((resolve, reject) => {
    yauzl.open(zipPath, { lazyEntries: true, autoClose: false }, (err, zipfile) => {
      if (err || !zipfile) {
        return reject(err || new Error('Failed to open zip file'));
      }

      const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
      const imageEntries: yauzl.Entry[] = [];

      // First pass: collect all image entries
      zipfile.on('entry', (entry: yauzl.Entry) => {
        // Skip directories
        if (/\/$/.test(entry.fileName)) {
          zipfile.readEntry();
          return;
        }

        // Check if this is an image file
        const ext = path.extname(entry.fileName).toLowerCase();
        const baseName = path.basename(entry.fileName);

        // Filter out junk files
        if (imageExtensions.includes(ext) && !entry.fileName.includes('__MACOSX') && !baseName.startsWith('.')) {
          imageEntries.push(entry);
        }

        zipfile.readEntry();
      });

      zipfile.on('end', async () => {
        if (imageEntries.length === 0) {
          zipfile.close();
          return reject(new Error('No image found in comic file'));
        }

        // Sort entries by full path for proper ordering
        // Use natural sort (numeric: true) to handle page numbers correctly
        imageEntries.sort((a, b) => {
          return a.fileName.localeCompare(b.fileName, undefined, { numeric: true, sensitivity: 'base' });
        });

        // Log first few entries for debugging
        console.log('[COVER] CBZ files (first 5):', imageEntries.slice(0, 5).map(e => e.fileName));

        const firstEntry = imageEntries[0];
        console.log('[COVER] Selected cover from CBZ:', firstEntry.fileName);

        // Extract the first image
        try {
          zipfile.openReadStream(firstEntry, (err, readStream) => {
            if (err || !readStream) {
              zipfile.close();
              return reject(err || new Error('Failed to open image stream'));
            }

            // Collect the image data
            const chunks: Buffer[] = [];
            readStream.on('data', (chunk: Buffer) => chunks.push(chunk));
            readStream.on('end', async () => {
              try {
                const imageBuffer = Buffer.concat(chunks);

                // Generate thumbnail using sharp
                await sharp(imageBuffer)
                  .resize(options.width, options.height, {
                    fit: 'cover',
                    position: 'top',
                  })
                  .jpeg({ quality: options.quality })
                  .toFile(outputPath);

                zipfile.close();
                resolve();
              } catch (error) {
                zipfile.close();
                reject(error);
              }
            });

            readStream.on('error', (error) => {
              zipfile.close();
              reject(error);
            });
          });
        } catch (error) {
          zipfile.close();
          reject(error);
        }
      });

      zipfile.on('error', (error) => {
        zipfile.close();
        reject(error);
      });

      zipfile.readEntry();
    });
  });
}

/**
 * Extracts the first image from a CBR (RAR) file
 * Sorts images alphabetically to ensure we get the cover (first page)
 */
async function extractCoverFromCBR(
  rarPath: string,
  outputPath: string,
  options: CoverOptions
): Promise<void> {
  const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];

  // Read file into memory for node-unrar-js
  const fileBuffer = await fs.readFile(rarPath);
  const arrayBuffer = fileBuffer.buffer.slice(
    fileBuffer.byteOffset,
    fileBuffer.byteOffset + fileBuffer.byteLength
  );

  // First pass: get file list
  const listExtractor = await createExtractorFromData({ data: arrayBuffer });
  const list = listExtractor.getFileList();

  // Get all image entries
  const imageEntries: string[] = [];
  for (const header of list.fileHeaders) {
    const fileName = header.name;
    const ext = path.extname(fileName).toLowerCase();
    const baseName = path.basename(fileName);

    // Filter out junk files
    if (imageExtensions.includes(ext) && !fileName.includes('__MACOSX') && !baseName.startsWith('.')) {
      imageEntries.push(fileName);
    }
  }

  if (imageEntries.length === 0) {
    throw new Error('No image found in CBR file');
  }

  // Sort to get cover (first page)
  imageEntries.sort((a, b) => {
    const nameA = path.basename(a).toLowerCase();
    const nameB = path.basename(b).toLowerCase();
    return nameA.localeCompare(nameB, undefined, { numeric: true, sensitivity: 'base' });
  });

  const firstEntry = imageEntries[0];
  console.log('[COVER] Selected cover from CBR:', firstEntry);

  // Second pass: create new extractor to extract the image
  // (getFileList closes the archive, so we need a fresh extractor)
  const extractExtractor = await createExtractorFromData({ data: arrayBuffer });
  const extracted = extractExtractor.extract({ files: [firstEntry] });

  for (const file of extracted.files) {
    if (file.fileHeader.name === firstEntry) {
      const extraction = (file as any).extraction;
      if (extraction) {
        const imageBuffer = Buffer.from(extraction);

        // Generate thumbnail using sharp
        await sharp(imageBuffer)
          .resize(options.width, options.height, {
            fit: 'cover',
            position: 'top',
          })
          .jpeg({ quality: options.quality })
          .toFile(outputPath);

        return;
      }
    }
  }

  throw new Error('Failed to extract cover from CBR file');
}

/**
 * Generates a cache key for a comic file
 *
 * @param bookId - The book ID
 * @returns Cache filename
 */
export function getCoverCacheFilename(bookId: string): string {
  return `${bookId}.jpg`;
}

/**
 * Gets the full path to a cached cover
 *
 * @param bookId - The book ID
 * @param cacheDir - Cache directory path (default: public/cache/covers)
 * @returns Full path to cached cover
 */
export function getCoverCachePath(bookId: string, cacheDir: string = 'public/cache/covers'): string {
  return path.join(process.cwd(), cacheDir, getCoverCacheFilename(bookId));
}

/**
 * Checks if a cover thumbnail already exists in cache
 *
 * @param bookId - The book ID
 * @returns Promise<boolean> - true if cache exists
 */
export async function coverCacheExists(bookId: string): Promise<boolean> {
  try {
    const cachePath = getCoverCachePath(bookId);
    await fs.access(cachePath);
    return true;
  } catch {
    return false;
  }
}
