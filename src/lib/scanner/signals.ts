import path from 'path';
import { extractComicInfo, type ComicMetadata } from '@/lib/metadata/parser';
import { parseFilename, normalizeSeriesName } from './filename-parser';

// =====================
// Signal Extractors
// =====================
// Each signal source (ComicInfo.xml, folder structure, filename) produces
// a typed signal object. These are combined for confidence scoring and matching.

export interface ComicInfoSignal {
  seriesName: string | null;
  issueNumber: string | null;
  title: string | null;
  publisher: string | null;
  year: number | null;
  writer: string | null;
  penciller: string | null;
  pageCount: number | null;
  summary: string | null;
}

export interface FolderSignal {
  folderName: string;
  normalizedName: string;
  depth: number;
}

export interface FilenameSignal {
  seriesName: string | null;
  normalizedName: string | null;
  issueNumber: string | null;
  year: number | null;
}

export interface ExtractedSignals {
  comicInfo: ComicInfoSignal | null;
  folder: FolderSignal;
  filename: FilenameSignal;
  filePath: string;
  fileSize: number;
}

/**
 * Extract ComicInfo.xml metadata from a comic archive and map it to a signal.
 * Returns null if no ComicInfo.xml is found or extraction fails.
 */
export async function extractComicInfoSignal(filePath: string): Promise<ComicInfoSignal | null> {
  try {
    const metadata: ComicMetadata | null = await extractComicInfo(filePath);
    if (!metadata) return null;

    // Only return a signal if we got at least a series name
    // (pageCount alone isn't useful as a matching signal)
    const hasMeaningfulData = metadata.series || metadata.title || metadata.publisher;
    if (!hasMeaningfulData) return null;

    return {
      seriesName: metadata.series ?? null,
      issueNumber: metadata.number != null ? String(metadata.number) : null,
      title: metadata.title ?? null,
      publisher: metadata.publisher ?? null,
      year: metadata.year ?? null,
      writer: metadata.writer ?? null,
      penciller: metadata.penciller ?? null,
      pageCount: metadata.pageCount ?? null,
      summary: metadata.summary ?? null,
    };
  } catch (error) {
    console.error(`[SIGNALS] Failed to extract ComicInfo from ${filePath}:`, error);
    return null;
  }
}

/**
 * Extract series signal from the parent folder name.
 * The folder closest to the file is most likely the series name.
 * Depth is measured from the library root.
 */
export function extractFolderSignal(filePath: string, libraryRoot: string): FolderSignal {
  const parentDir = path.dirname(filePath);
  const folderName = path.basename(parentDir);

  // Calculate depth from library root
  const relativePath = path.relative(libraryRoot, parentDir);
  const depth = relativePath === '' ? 0 : relativePath.split(path.sep).length;

  return {
    folderName,
    normalizedName: normalizeSeriesName(folderName),
    depth,
  };
}

/**
 * Extract series signal from the filename using the filename parser.
 */
export function extractFilenameSignal(filePath: string): FilenameSignal {
  const fileName = path.basename(filePath);
  const parsed = parseFilename(fileName);

  return {
    seriesName: parsed.seriesName,
    normalizedName: parsed.seriesName ? normalizeSeriesName(parsed.seriesName) : null,
    issueNumber: parsed.issueNumber,
    year: parsed.year,
  };
}

/**
 * Run all signal extractors for a given file.
 * ComicInfo extraction is async (reads archive); folder and filename are sync.
 */
export async function extractAllSignals(
  filePath: string,
  fileSize: number,
  libraryRoot: string
): Promise<ExtractedSignals> {
  const [comicInfo, folder, filename] = await Promise.all([
    extractComicInfoSignal(filePath),
    Promise.resolve(extractFolderSignal(filePath, libraryRoot)),
    Promise.resolve(extractFilenameSignal(filePath)),
  ]);

  return {
    comicInfo,
    folder,
    filename,
    filePath,
    fileSize,
  };
}

/**
 * Derive the best series name from extracted signals.
 * Priority: ComicInfo > Folder > Filename.
 * Returns the name, its normalized form, and which source it came from.
 */
export function deriveSeriesName(
  signals: ExtractedSignals
): { name: string; normalized: string; source: 'comicinfo' | 'folder' | 'filename' } {
  // Priority 1: ComicInfo.xml series name (most authoritative)
  if (signals.comicInfo?.seriesName) {
    return {
      name: signals.comicInfo.seriesName,
      normalized: normalizeSeriesName(signals.comicInfo.seriesName),
      source: 'comicinfo',
    };
  }

  // Priority 2: Parent folder name (strong organizational signal)
  if (signals.folder.folderName && signals.folder.depth > 0) {
    return {
      name: signals.folder.folderName,
      normalized: signals.folder.normalizedName,
      source: 'folder',
    };
  }

  // Priority 3: Filename-derived series name
  if (signals.filename.seriesName) {
    return {
      name: signals.filename.seriesName,
      normalized: signals.filename.normalizedName ?? normalizeSeriesName(signals.filename.seriesName),
      source: 'filename',
    };
  }

  // Fallback: use the filename without extension
  const fallbackName = path.basename(signals.filePath, path.extname(signals.filePath));
  return {
    name: fallbackName,
    normalized: normalizeSeriesName(fallbackName),
    source: 'filename',
  };
}

/**
 * Derive the best issue number from extracted signals.
 * Priority: ComicInfo > Filename. Fallback: "1".
 */
export function deriveIssueNumber(signals: ExtractedSignals): string {
  // Priority 1: ComicInfo.xml issue number
  if (signals.comicInfo?.issueNumber) {
    return signals.comicInfo.issueNumber;
  }

  // Priority 2: Filename-derived issue number
  if (signals.filename.issueNumber) {
    return signals.filename.issueNumber;
  }

  // Fallback
  return '1';
}
