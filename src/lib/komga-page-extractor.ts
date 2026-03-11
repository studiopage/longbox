/**
 * Shared page extraction logic for Komga API endpoints.
 * Extracts a single page image from CBZ/CBR archives.
 */

import yauzl from 'yauzl';
import { createExtractorFromData } from 'node-unrar-js';
import fs from 'fs/promises';

export async function extractPage(filePath: string, pageIndex: number): Promise<Buffer> {
  const lowerPath = filePath.toLowerCase();
  if (lowerPath.endsWith('.cbr') || lowerPath.endsWith('.rar')) {
    return extractImageFromRar(filePath, pageIndex);
  }
  return extractImageFromZip(filePath, pageIndex);
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
