/**
 * Komga-compatible API helpers
 *
 * Formats Longbox data into Komga API response shapes so the
 * Komga extension in Mihon/Tachiyomi can browse and read comics.
 */

const LIBRARY_ID = '1';
const LIBRARY_NAME = 'Longbox';

/** Komga-style paginated response wrapper */
export function paginated<T>(items: T[], page: number, size: number, totalElements: number) {
  const totalPages = Math.ceil(totalElements / size);
  return {
    content: items,
    pageable: {
      sort: { sorted: false, unsorted: true, empty: true },
      offset: page * size,
      pageNumber: page,
      pageSize: size,
      paged: true,
      unpaged: false,
    },
    totalElements,
    totalPages,
    last: page >= totalPages - 1,
    numberOfElements: items.length,
    first: page === 0,
    size,
    number: page,
    sort: { sorted: false, unsorted: true, empty: true },
    empty: items.length === 0,
  };
}

/** Book-level metadata used to enrich series when series table fields are empty */
export interface BookMetadataFallback {
  publisher?: string | null;
  summary?: string | null;
  authors?: string | null;
  published_date?: Date | null;
}

/** Format a Longbox series row into a Komga series object */
export function formatSeries(s: {
  id: string;
  name: string;
  description?: string | null;
  publisher?: string | null;
  year?: number | string | null;
  status?: string | null;
  thumbnail_url?: string | null;
  created_at?: Date | null;
  updated_at?: Date | null;
}, counts?: { total: number; read: number; inProgress: number }, bookFallback?: BookMetadataFallback) {
  const now = new Date().toISOString();
  const created = s.created_at?.toISOString() ?? now;
  const modified = s.updated_at?.toISOString() ?? created;
  const booksCount = counts?.total ?? 0;
  const booksReadCount = counts?.read ?? 0;
  const booksInProgressCount = counts?.inProgress ?? 0;

  // Use series-level data first, fall back to book-level
  const publisher = s.publisher || bookFallback?.publisher || '';
  const summary = s.description || bookFallback?.summary || '';
  const year = s.year || (bookFallback?.published_date ? bookFallback.published_date.getFullYear() : null);

  // Parse authors from book fallback
  const authors: { name: string; role: string }[] = [];
  if (bookFallback?.authors) {
    for (const name of bookFallback.authors.split(',')) {
      const trimmed = name.trim();
      if (trimmed) authors.push({ name: trimmed, role: 'writer' });
    }
  }

  return {
    id: s.id,
    libraryId: LIBRARY_ID,
    name: s.name,
    url: '',
    created,
    lastModified: modified,
    fileLastModified: modified,
    booksCount,
    booksReadCount,
    booksUnreadCount: booksCount - booksReadCount - booksInProgressCount,
    booksInProgressCount,
    metadata: {
      status: mapSeriesStatus(s.status),
      statusLock: false,
      created,
      lastModified: modified,
      title: s.name,
      titleLock: false,
      titleSort: s.name,
      titleSortLock: false,
      summary,
      summaryLock: false,
      readingDirection: 'LEFT_TO_RIGHT',
      readingDirectionLock: false,
      publisher,
      publisherLock: false,
      ageRating: null,
      ageRatingLock: false,
      language: '',
      languageLock: false,
      genres: [] as string[],
      genresLock: false,
      tags: [] as string[],
      tagsLock: false,
      totalBookCount: null,
      sharingLabels: [] as string[],
      sharingLabelsLock: false,
      links: [] as { label: string; url: string }[],
      linksLock: false,
      alternateTitles: [] as { label: string; title: string }[],
      alternateTitlesLock: false,
    },
    booksMetadata: {
      created,
      lastModified: modified,
      authors,
      tags: [] as string[],
      releaseDate: year ? `${year}-01-01` : null,
      summary: '',
      summaryNumber: '',
    },
    deleted: false,
  };
}

/** Format a Longbox book row into a Komga book object */
export function formatBook(b: {
  id: string;
  title?: string | null;
  number?: string | null;
  file_path: string;
  file_size?: number | null;
  page_count?: number | null;
  summary?: string | null;
  authors?: string | null;
  credits?: unknown;
  published_date?: Date | null;
  created_at?: Date | null;
  updated_at?: Date | null;
  series_id?: string | null;
}, seriesTitle: string, readProgress?: { page: number; is_completed: boolean | null; updated_at: Date | null } | null) {
  const now = new Date().toISOString();
  const created = b.created_at?.toISOString() ?? now;
  const modified = b.updated_at?.toISOString() ?? created;
  const numStr = b.number ?? '0';
  const numSort = parseFloat(numStr) || 0;
  const ext = b.file_path.toLowerCase();
  const mediaType = ext.endsWith('.cbr') || ext.endsWith('.rar')
    ? 'application/x-rar-compressed'
    : 'application/zip';
  const sizeBytes = b.file_size ?? 0;
  const displayName = b.title || `${seriesTitle} #${numStr}`;

  // Parse credits for authors
  const authors: { name: string; role: string }[] = [];
  if (Array.isArray(b.credits)) {
    for (const c of b.credits as { creator: string; role: string[] }[]) {
      for (const role of c.role) {
        authors.push({ name: c.creator, role });
      }
    }
  } else if (b.authors) {
    for (const name of b.authors.split(',')) {
      authors.push({ name: name.trim(), role: 'writer' });
    }
  }

  return {
    id: b.id,
    seriesId: b.series_id ?? '',
    seriesTitle,
    libraryId: LIBRARY_ID,
    name: displayName,
    url: '',
    number: numSort,
    numberSort: numSort,
    created,
    lastModified: modified,
    fileLastModified: modified,
    sizeBytes,
    size: formatSize(sizeBytes),
    media: {
      status: 'READY',
      mediaType,
      pagesCount: b.page_count ?? 0,
      comment: '',
    },
    metadata: {
      title: displayName,
      titleLock: false,
      summary: b.summary ?? '',
      summaryLock: false,
      number: numStr,
      numberLock: false,
      numberSort: numSort,
      numberSortLock: false,
      releaseDate: b.published_date?.toISOString()?.slice(0, 10) ?? null,
      releaseDateLock: false,
      authors,
      authorsLock: false,
      tags: [] as string[],
      tagsLock: false,
      isbn: '',
      isbnLock: false,
      links: [] as { label: string; url: string }[],
      linksLock: false,
      created,
      lastModified: modified,
    },
    readProgress: readProgress ? {
      page: readProgress.page,
      completed: readProgress.is_completed ?? false,
      readDate: readProgress.updated_at?.toISOString() ?? null,
      created: readProgress.updated_at?.toISOString() ?? created,
      lastModified: readProgress.updated_at?.toISOString() ?? modified,
      deviceId: '',
      deviceName: '',
    } : {
      page: 0,
      completed: false,
      readDate: null,
      created,
      lastModified: modified,
      deviceId: '',
      deviceName: '',
    },
    deleted: false,
  };
}

/** Format a Komga library object */
export function formatLibrary(rootPath: string) {
  return {
    id: LIBRARY_ID,
    name: LIBRARY_NAME,
    root: rootPath,
    importDirectories: [],
    deletedBooks: [],
    scanForceModifiedTime: false,
    scanDeep: false,
    repairExtensions: false,
    convertToCbz: false,
    emptyTrashAfterScan: false,
    seriesCover: 'FIRST',
    hashFiles: 0,
    hashPages: 0,
    analyzeDimensions: true,
    unavailable: false,
  };
}

function mapSeriesStatus(status?: string | null): string {
  switch (status) {
    case 'ongoing': return 'ONGOING';
    case 'ended': return 'ENDED';
    case 'canceled': return 'ABANDONED';
    default: return 'ONGOING';
  }
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KiB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GiB`;
}
