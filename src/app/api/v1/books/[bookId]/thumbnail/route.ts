import { NextRequest, NextResponse } from 'next/server';
import yauzl from 'yauzl';
import { db } from '@/db';
import { books } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ bookId: string }> }
) {
  const { bookId } = await params;

  // 1. Get Book Location from DB
  const book = await db.query.books.findFirst({
    where: eq(books.id, bookId),
    columns: { file_path: true }
  });

  if (!book) return new NextResponse("Book not found", { status: 404 });

  // 2. Open Zip & Find First Image
  return new Promise<NextResponse | Response>((resolve) => {
    yauzl.open(book.file_path, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        console.error("Thumbnail Zip Error:", err);
        return resolve(new NextResponse("File Error", { status: 500 }));
      }

      // Start reading entries
      zipfile.readEntry();

      zipfile.on('entry', (entry) => {
        // Is it an image? (jpg, png, webp)
        if (/\.(jpg|jpeg|png|webp)$/i.test(entry.fileName)) {
          
          // Found the cover! Open the stream.
          zipfile.openReadStream(entry, (err, stream) => {
            if (err || !stream) {
              return resolve(new NextResponse("Read Error", { status: 500 }));
            }

            // Return the image stream as the response
            const response = new NextResponse(stream as any, {
              headers: {
                'Content-Type': 'image/jpeg', // Assumption for MVP
                'Cache-Control': 'public, max-age=86400', // Cache for 1 day
              }
            });
            resolve(response);
            
            // Important: Stop reading after finding the first one
            zipfile.close(); 
          });
        } else {
          // Not an image (maybe metadata.xml), keep looking
          zipfile.readEntry();
        }
      });

      zipfile.on('end', () => {
        resolve(new NextResponse("No images found", { status: 404 }));
      });
      
      zipfile.on('error', (e) => {
        resolve(new NextResponse("Zip Error", { status: 500 }));
      });
    });
  });
}

