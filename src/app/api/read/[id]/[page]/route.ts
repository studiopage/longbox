import { db } from '@/db';
import { books } from '@/db/schema';
import { eq } from 'drizzle-orm';
import yauzl from 'yauzl';
import { createExtractorFromData } from 'node-unrar-js';
import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; page: string }> }
) {
  const { id, page } = await params;
  const pageNum = parseInt(page) - 1; // 0-indexed logic

  console.log(`[STREAMER] Requesting Book: ${id}, Page: ${pageNum + 1}`);

  // 1. Get File Path from DB
  const book = await db.query.books.findFirst({
    where: eq(books.id, id),
  });

  if (!book) {
    console.error("[STREAMER] Book not found in DB");
    return new NextResponse("Book not found", { status: 404 });
  }
  console.log(`[STREAMER] File Path: ${book.file_path}`);

  // 2. Determine file type and extract page
  try {
    const filePath = book.file_path.toLowerCase();
    let buffer: Buffer;

    if (filePath.endsWith('.cbr') || filePath.endsWith('.rar')) {
      buffer = await extractImageFromRar(book.file_path, pageNum);
    } else {
      // Default to ZIP handling (CBZ, ZIP)
      buffer = await extractImageFromZip(book.file_path, pageNum);
    }

    // Convert Buffer to Uint8Array for Next.js Response compatibility
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error("[STREAMER] Critical Error:", error);
    return new NextResponse("Error reading comic file", { status: 500 });
  }
}

// --- ZIP/CBZ HELPER ---
function extractImageFromZip(filePath: string, targetIndex: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true, autoClose: false }, (err, zipfile) => {
      if (err || !zipfile) return reject(err);

      const entries: string[] = [];
      const entryMap: Record<string, any> = {};

      zipfile.readEntry();

      zipfile.on("entry", (entry) => {
        const fileName = entry.fileName;

        // Filter garbage files
        const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);
        const isMacJunk = fileName.includes("__MACOSX") || pathBasename(fileName).startsWith(".");

        if (isImage && !isMacJunk) {
            entries.push(fileName);
            entryMap[fileName] = entry;
        }
        zipfile.readEntry();
      });

      zipfile.on("end", () => {
        if (entries.length === 0) {
          zipfile.close();
          return reject(new Error("No valid images found in zip"));
        }

        // Natural sort (Page 1, Page 2, Page 10)
        entries.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        console.log(`[STREAMER] Found ${entries.length} pages. Serving index ${targetIndex}: ${entries[targetIndex]}`);

        const targetFileName = entries[targetIndex];
        const targetEntry = entryMap[targetFileName];

        if (!targetEntry) {
          zipfile.close();
          return reject(new Error(`Page ${targetIndex + 1} out of bounds (Total: ${entries.length})`));
        }

        // Open stream and convert to buffer
        zipfile.openReadStream(targetEntry, (err, readStream) => {
          if (err || !readStream) {
            zipfile.close();
            return reject(err);
          }

          const chunks: Buffer[] = [];
          readStream.on('data', (chunk: Buffer) => chunks.push(chunk));
          readStream.on('end', () => {
            const buffer = Buffer.concat(chunks);
            console.log(`[STREAMER] Buffer size: ${buffer.length} bytes`);
            zipfile.close();
            resolve(buffer);
          });
          readStream.on('error', (error) => {
            zipfile.close();
            reject(error);
          });
        });
      });

      zipfile.on("error", (err) => {
        zipfile.close();
        reject(err);
      });
    });
  });
}

// --- RAR/CBR HELPER ---
async function extractImageFromRar(filePath: string, targetIndex: number): Promise<Buffer> {
  try {
    // Read the file into memory for node-unrar-js
    console.log(`[STREAMER] Reading RAR file: ${filePath}`);
    const fileBuffer = await fs.readFile(filePath);
    console.log(`[STREAMER] RAR file size: ${fileBuffer.length} bytes`);

    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );
    console.log(`[STREAMER] ArrayBuffer size: ${arrayBuffer.byteLength} bytes`);

    // First pass: get file list to determine which image to extract
    console.log(`[STREAMER] Creating list extractor...`);
    const listExtractor = await createExtractorFromData({ data: arrayBuffer });
    console.log(`[STREAMER] List extractor created, getting file list...`);
    const list = listExtractor.getFileList();
    console.log(`[STREAMER] RAR archive header:`, list.arcHeader);

    // Get all image entries
    const imageEntries: string[] = [];
    console.log(`[STREAMER] Iterating file headers...`);
    for (const header of list.fileHeaders) {
      const fileName = header.name;
      const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);
      const isMacJunk = fileName.includes("__MACOSX") || pathBasename(fileName).startsWith(".");

      console.log(`[STREAMER] File: ${fileName}, isImage: ${isImage}, isMacJunk: ${isMacJunk}`);
      if (isImage && !isMacJunk) {
        imageEntries.push(fileName);
      }
    }
    console.log(`[STREAMER] Done iterating, found ${imageEntries.length} images`);

    if (imageEntries.length === 0) {
      throw new Error("No valid images found in RAR archive");
    }

    // Natural sort
    imageEntries.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

    console.log(`[STREAMER] Found ${imageEntries.length} pages in RAR. Serving index ${targetIndex}: ${imageEntries[targetIndex]}`);

    const targetFileName = imageEntries[targetIndex];
    if (!targetFileName) {
      throw new Error(`Page ${targetIndex + 1} out of bounds (Total: ${imageEntries.length})`);
    }

    // Second pass: create a new extractor to extract the specific file
    // (getFileList closes the archive, so we need a fresh extractor)
    console.log(`[STREAMER] Creating extract extractor...`);
    const extractExtractor = await createExtractorFromData({ data: arrayBuffer });
    console.log(`[STREAMER] Extract extractor created, extracting ${targetFileName}...`);
    const extracted = extractExtractor.extract({ files: [targetFileName] });

    console.log(`[STREAMER] Iterating extracted files...`);
    for (const file of extracted.files) {
      console.log(`[STREAMER] Extracted file: ${file.fileHeader.name}`);
      if (file.fileHeader.name === targetFileName) {
        // The extraction data is available after iterating
        const extraction = (file as any).extraction;
        console.log(`[STREAMER] Extraction data present: ${!!extraction}`);
        if (extraction) {
          const buffer = Buffer.from(extraction);
          console.log(`[STREAMER] RAR Buffer size: ${buffer.length} bytes`);
          return buffer;
        }
      }
    }

    throw new Error(`Failed to extract page ${targetIndex + 1} from RAR`);
  } catch (error) {
    console.error(`[STREAMER] RAR extraction error:`, error);
    throw error;
  }
}

// Simple helper to get filename from path
function pathBasename(pathStr: string) {
    return pathStr.split(/[\\/]/).pop() || pathStr;
}
