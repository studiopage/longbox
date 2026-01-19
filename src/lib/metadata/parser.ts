import yauzl from 'yauzl';
import { parseStringPromise } from 'xml2js';

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
  return new Promise((resolve) => {
    yauzl.open(filePath, { lazyEntries: true }, (err, zipfile) => {
      if (err || !zipfile) {
        // console.warn(`[METADATA] Failed to open zip: ${filePath}`);
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

                // Map XML fields to our clean interface
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

