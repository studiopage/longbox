import { NextRequest, NextResponse } from 'next/server';
import yauzl from 'yauzl';
import { db } from '@/db'; 
import { books } from '@/db/schema'; 
import { eq } from 'drizzle-orm';

export async function GET(
  req: NextRequest, 
  { params }: { params: Promise<{ bookId: string, page: string }> } // Next.js 15+ params are Promises
) {
  // Await params in case you are on Next.js 15 (safe for 14 too usually)
  const { bookId, page } = await params;

  const bookResults = await db.select()
    .from(books)
    .where(eq(books.id, bookId))
    .limit(1);

  if (bookResults.length === 0) {
    return new NextResponse("Not Found", { status: 404 });
  }

  const book = bookResults[0];
  const targetIndex = parseInt(page) - 1;

  // STRICT TYPING FIX: Explicitly tell TS this Promise returns a Response
  return new Promise<NextResponse | Response>((resolve, reject) => {
    yauzl.open(book.file_path, { lazyEntries: true }, (err, zipfile) => {
      if (err) {
        console.error("Zip Error:", err);
        return resolve(new NextResponse("File Error", { status: 500 }));
      }

      if (!zipfile) {
        return resolve(new NextResponse("File Error", { status: 500 }));
      }

      let currentIndex = 0;
      zipfile.readEntry();

      zipfile.on('entry', (entry) => {
        if (!/\.(jpg|jpeg|png|webp)$/i.test(entry.fileName)) {
          zipfile.readEntry();
          return;
        }

        if (currentIndex === targetIndex) {
          zipfile.openReadStream(entry, (err, stream) => {
            if (err || !stream) {
               return resolve(new NextResponse("Read Error", { status: 500 }));
            }
            
            // Determine content type from extension
            const ext = entry.fileName.toLowerCase().split('.').pop();
            let contentType = 'image/jpeg';
            if (ext === 'png') contentType = 'image/png';
            else if (ext === 'webp') contentType = 'image/webp';
            
            // @ts-ignore: ReadableStream type mismatch workaround
            const response = new NextResponse(stream, {
              headers: { 
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000'
              }
            });
            resolve(response);
          });
        } else {
          currentIndex++;
          zipfile.readEntry();
        }
      });
      
      zipfile.on('end', () => {
        resolve(new NextResponse("Page OOB", { status: 404 }));
      });
      
      // Safety: ensure we don't hang if zip is weird
      zipfile.on('error', (e) => {
         console.error("Zip Stream Error:", e);
         resolve(new NextResponse("Stream Failure", { status: 500 }));
      });
    });
  });
}

