import yauzl from 'yauzl';
import { createExtractorFromData } from 'node-unrar-js';
import { parseStringPromise } from 'xml2js';
import fs from 'fs/promises';

export interface ComicMetadata {
  series?: string;
  number?: number;
  title?: string;
  summary?: string;
  year?: number;
  month?: number;
  writer?: string;
  penciller?: string;
  inker?: string;
  publisher?: string;
  pageCount?: number;
}

export async function extractComicInfo(filePath: string): Promise<ComicMetadata | null> {
  const lowerPath = filePath.toLowerCase();

  let metadata: ComicMetadata | null;
  if (lowerPath.endsWith('.cbr') || lowerPath.endsWith('.rar')) {
    metadata = await extractComicInfoFromRar(filePath);
  } else {
    // Default to ZIP handling (CBZ, ZIP)
    metadata = await extractComicInfoFromZip(filePath);
  }

  // If no pageCount from ComicInfo.xml, count images directly
  if (!metadata?.pageCount) {
    const pageCount = await countPagesInArchive(filePath);
    if (metadata) {
      metadata.pageCount = pageCount;
    } else {
      metadata = { pageCount };
    }
  }

  return metadata;
}

/**
 * Count image files in a comic archive (CBZ/CBR)
 */
export async function countPagesInArchive(filePath: string): Promise<number> {
  const lowerPath = filePath.toLowerCase();

  if (lowerPath.endsWith('.cbr') || lowerPath.endsWith('.rar')) {
    return countPagesInRar(filePath);
  } else {
    return countPagesInZip(filePath);
  }
}

function isImageFile(fileName: string): boolean {
  return /\.(jpg|jpeg|png|webp|gif)$/i.test(fileName);
}

function isJunkFile(fileName: string): boolean {
  const baseName = fileName.split(/[\\/]/).pop() || fileName;
  return fileName.includes('__MACOSX') || baseName.startsWith('.');
}

async function countPagesInZip(filePath: string): Promise<number> {
  return new Promise((resolve) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        return resolve(0);
      }

      let count = 0;
      zipfile.readEntry();

      zipfile.on('entry', (entry) => {
        if (isImageFile(entry.fileName) && !isJunkFile(entry.fileName)) {
          count++;
        }
        zipfile.readEntry();
      });

      zipfile.on('end', () => {
        zipfile.close();
        resolve(count);
      });

      zipfile.on('error', () => {
        zipfile.close();
        resolve(0);
      });
    });
  });
}

async function countPagesInRar(filePath: string): Promise<number> {
  try {
    const fileBuffer = await fs.readFile(filePath);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    const extractor = await createExtractorFromData({ data: arrayBuffer });
    const list = extractor.getFileList();

    let count = 0;
    for (const header of list.fileHeaders) {
      if (isImageFile(header.name) && !isJunkFile(header.name)) {
        count++;
      }
    }

    return count;
  } catch (error) {
    console.error(`[METADATA] Failed to count pages in RAR: ${filePath}`, error);
    return 0;
  }
}

async function extractComicInfoFromZip(filePath: string): Promise<ComicMetadata | null> {
  return new Promise((resolve) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        return resolve(null);
      }

      let foundXml = false;
      zipfile.readEntry();

      zipfile.on('entry', (entry) => {
        // Look specifically for ComicInfo.xml (case insensitive)
        if (/ComicInfo\.xml$/i.test(entry.fileName)) {
          foundXml = true;

          zipfile.openReadStream(entry, (err, stream) => {
            if (err || !stream) {
              zipfile.close();
              return resolve(null);
            }

            const chunks: any[] = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            stream.on('end', async () => {
              const xmlContent = Buffer.concat(chunks).toString();
              try {
                const result = await parseStringPromise(xmlContent, { explicitArray: false });
                const ci = result.ComicInfo || {};

                const metadata: ComicMetadata = {
                  series: ci.Series,
                  number: ci.Number ? parseFloat(ci.Number) : undefined,
                  title: ci.Title,
                  summary: ci.Summary,
                  year: ci.Year ? parseInt(ci.Year) : undefined,
                  month: ci.Month ? parseInt(ci.Month) : undefined,
                  writer: ci.Writer,
                  penciller: ci.Penciller,
                  inker: ci.Inker,
                  publisher: ci.Publisher,
                  pageCount: ci.PageCount ? parseInt(ci.PageCount) : undefined
                };

                zipfile.close();
                resolve(metadata);
              } catch (parseErr) {
                console.error(`[METADATA] XML Parse error in ${filePath}`, parseErr);
                zipfile.close();
                resolve(null);
              }
            });
          });
        } else {
          zipfile.readEntry();
        }
      });

      zipfile.on('end', () => {
        if (!foundXml) resolve(null);
      });

      zipfile.on('error', () => resolve(null));
    });
  });
}

async function extractComicInfoFromRar(filePath: string): Promise<ComicMetadata | null> {
  try {
    // Read file into memory for node-unrar-js
    const fileBuffer = await fs.readFile(filePath);
    const arrayBuffer = fileBuffer.buffer.slice(
      fileBuffer.byteOffset,
      fileBuffer.byteOffset + fileBuffer.byteLength
    );

    // First pass: get file list to find ComicInfo.xml
    const listExtractor = await createExtractorFromData({ data: arrayBuffer });
    const list = listExtractor.getFileList();

    // Find ComicInfo.xml
    let comicInfoEntry: string | null = null;
    for (const header of list.fileHeaders) {
      if (/ComicInfo\.xml$/i.test(header.name)) {
        comicInfoEntry = header.name;
        break;
      }
    }

    if (!comicInfoEntry) {
      return null;
    }

    // Second pass: create new extractor to extract the file
    // (getFileList closes the archive, so we need a fresh extractor)
    const extractExtractor = await createExtractorFromData({ data: arrayBuffer });
    const extracted = extractExtractor.extract({ files: [comicInfoEntry] });

    for (const file of extracted.files) {
      if (file.fileHeader.name === comicInfoEntry) {
        const extraction = (file as any).extraction;
        if (extraction) {
          const xmlContent = Buffer.from(extraction).toString('utf-8');

          try {
            const result = await parseStringPromise(xmlContent, { explicitArray: false });
            const ci = result.ComicInfo || {};

            const metadata: ComicMetadata = {
              series: ci.Series,
              number: ci.Number ? parseFloat(ci.Number) : undefined,
              title: ci.Title,
              summary: ci.Summary,
              year: ci.Year ? parseInt(ci.Year) : undefined,
              month: ci.Month ? parseInt(ci.Month) : undefined,
              writer: ci.Writer,
              penciller: ci.Penciller,
              inker: ci.Inker,
              publisher: ci.Publisher,
              pageCount: ci.PageCount ? parseInt(ci.PageCount) : undefined
            };

            return metadata;
          } catch (parseErr) {
            console.error(`[METADATA] XML Parse error in ${filePath}`, parseErr);
            return null;
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error(`[METADATA] Failed to read RAR file: ${filePath}`, error);
    return null;
  }
}
