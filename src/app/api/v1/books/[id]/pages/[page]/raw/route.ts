import { NextRequest, NextResponse } from 'next/server';
import { validateOPDSAuth } from '@/lib/opds-auth';
import { db } from '@/db';
import { books } from '@/db/schema';
import { eq } from 'drizzle-orm';
import yauzl from 'yauzl';
import { createExtractorFromData } from 'node-unrar-js';
import fs from 'fs/promises';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; page: string }> }
) {
  const auth = await validateOPDSAuth(request);
  if (auth instanceof NextResponse) return auth;

  const { id, page } = await params;
  const pageIndex = parseInt(page) - 1; // Komga uses 1-indexed pages

  const book = await db.query.books.findFirst({
    where: eq(books.id, id),
    columns: { file_path: true },
  });

  if (!book) {
    return new NextResponse('Book not found', { status: 404 });
  }

  try {
    const filePath = book.file_path.toLowerCase();
    let buffer: Buffer;

    if (filePath.endsWith('.cbr') || filePath.endsWith('.rar')) {
      buffer = await extractImageFromRar(book.file_path, pageIndex);
    } else {
      buffer = await extractImageFromZip(book.file_path, pageIndex);
    }

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=31536000, immutable',
      },
    });
  } catch (error) {
    console.error('[Komga] Page extraction error:', error);
    return new NextResponse('Error reading page', { status: 500 });
  }
}

function extractImageFromZip(filePath: string, targetIndex: number): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    yauzl.open(filePath, { lazyEntries: true, autoClose: false }, (err, zipfile) => {
      if (err || !zipfile) return reject(err);

      const entries: string[] = [];
      const entryMap: Record<string, any> = {};

      zipfile.readEntry();
      zipfile.on('entry', (entry) => {
        const fileName = entry.fileName;
        const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);
        const isMacJunk = fileName.includes('__MACOSX') || basename(fileName).startsWith('.');
        if (isImage && !isMacJunk) {
          entries.push(fileName);
          entryMap[fileName] = entry;
        }
        zipfile.readEntry();
      });

      zipfile.on('end', () => {
        entries.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));
        const targetEntry = entryMap[entries[targetIndex]];
        if (!targetEntry) {
          zipfile.close();
          return reject(new Error(`Page ${targetIndex + 1} not found`));
        }
        zipfile.openReadStream(targetEntry, (err, stream) => {
          if (err || !stream) { zipfile.close(); return reject(err); }
          const chunks: Buffer[] = [];
          stream.on('data', (chunk: Buffer) => chunks.push(chunk));
          stream.on('end', () => { zipfile.close(); resolve(Buffer.concat(chunks)); });
          stream.on('error', (e) => { zipfile.close(); reject(e); });
        });
      });

      zipfile.on('error', (e) => { zipfile.close(); reject(e); });
    });
  });
}

async function extractImageFromRar(filePath: string, targetIndex: number): Promise<Buffer> {
  const fileBuffer = await fs.readFile(filePath);
  const arrayBuffer = fileBuffer.buffer.slice(fileBuffer.byteOffset, fileBuffer.byteOffset + fileBuffer.byteLength);

  const listExtractor = await createExtractorFromData({ data: arrayBuffer });
  const list = listExtractor.getFileList();

  const imageEntries: string[] = [];
  for (const header of list.fileHeaders) {
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(header.name);
    const isMacJunk = header.name.includes('__MACOSX') || basename(header.name).startsWith('.');
    if (isImage && !isMacJunk) imageEntries.push(header.name);
  }

  imageEntries.sort((a, b) => a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }));

  const targetFileName = imageEntries[targetIndex];
  if (!targetFileName) throw new Error(`Page ${targetIndex + 1} not found`);

  const extractExtractor = await createExtractorFromData({ data: arrayBuffer });
  const extracted = extractExtractor.extract({ files: [targetFileName] });

  for (const file of extracted.files) {
    if (file.fileHeader.name === targetFileName) {
      const extraction = (file as any).extraction;
      if (extraction) return Buffer.from(extraction);
    }
  }

  throw new Error(`Failed to extract page ${targetIndex + 1}`);
}

function basename(p: string) {
  return p.split(/[\\/]/).pop() || p;
}
