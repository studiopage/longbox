import { db } from '@/db';
import { books } from '@/db/schema';
import { eq } from 'drizzle-orm';
import yauzl from 'yauzl';
import { NextRequest, NextResponse } from 'next/server';
import { Readable } from 'stream';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; page: string }> }
) {
  const { id, page } = await params;
  const pageNum = parseInt(page) - 1; // 0-indexed logic

  // 1. Get File Path from DB
  const bookResult = await db
    .select({
      id: books.id,
      file_path: books.file_path,
    })
    .from(books)
    .where(eq(books.id, id))
    .limit(1);

  if (!bookResult || bookResult.length === 0) {
    return new NextResponse("Book not found", { status: 404 });
  }

  const book = bookResult[0];

  // 2. Open ZIP and Stream specific page
  try {
    const stream = await extractImageFromZip(book.file_path, pageNum);
    
    // Return the image stream with correct headers
    // @ts-ignore - Next.js Response supports Node streams but types can be finicky
    return new NextResponse(stream as any, {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error("Stream Error:", error);
    return new NextResponse("Error reading comic file", { status: 500 });
  }
}

// --- HELPER: THE YAUZL WRAPPER ---
function extractImageFromZip(filePath: string, targetIndex: number): Promise<Readable> {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) return reject(err);

      const entries: string[] = [];
      const entryMap: Record<string, any> = {};

      zipfile.readEntry();

      zipfile.on("entry", (entry) => {
        // Only look for images
        if (/\.(jpg|jpeg|png|webp|gif)$/i.test(entry.fileName)) {
            // We store the entry object to read later
            entries.push(entry.fileName);
            entryMap[entry.fileName] = entry;
        }
        zipfile.readEntry();
      });

      zipfile.on("end", () => {
        if (entries.length === 0) return reject(new Error("No images found in zip"));

        // SORT: Critical because Zips are not ordered. 
        // We use "Natural Sort" (Page 1, Page 2, Page 10)
        entries.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

        const targetFileName = entries[targetIndex];
        const targetEntry = entryMap[targetFileName];

        if (!targetEntry) return reject(new Error("Page out of bounds"));

        // OPEN STREAM
        zipfile.openReadStream(targetEntry, (err, readStream) => {
          if (err || !readStream) return reject(err);
          resolve(readStream);
        });
      });

      zipfile.on("error", (err) => reject(err));
    });
  });
}
