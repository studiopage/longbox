import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { books } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { getMimeType } from '@/lib/opds';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Support both session auth and OPDS Basic Auth
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const [book] = await db
    .select({ file_path: books.file_path, title: books.title, number: books.number })
    .from(books)
    .where(eq(books.id, id))
    .limit(1);

  if (!book) {
    return new NextResponse('Not Found', { status: 404 });
  }

  // Check file exists
  if (!fs.existsSync(book.file_path)) {
    return new NextResponse('File not found on disk', { status: 404 });
  }

  const stat = fs.statSync(book.file_path);
  const fileName = path.basename(book.file_path);
  const mimeType = getMimeType(book.file_path);

  // Stream the file
  const fileStream = fs.createReadStream(book.file_path);
  const readableStream = new ReadableStream({
    start(controller) {
      fileStream.on('data', (chunk) => {
        controller.enqueue(new Uint8Array(chunk as Buffer));
      });
      fileStream.on('end', () => {
        controller.close();
      });
      fileStream.on('error', (err) => {
        controller.error(err);
      });
    },
    cancel() {
      fileStream.destroy();
    },
  });

  return new NextResponse(readableStream, {
    headers: {
      'Content-Type': mimeType,
      'Content-Length': stat.size.toString(),
      'Content-Disposition': `attachment; filename="${encodeURIComponent(fileName)}"`,
    },
  });
}
