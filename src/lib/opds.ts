/**
 * OPDS 1.2 Atom XML Feed Builder
 *
 * Builds Atom XML feeds for OPDS 1.2 catalog serving.
 * Uses template literals — no XML library needed.
 *
 * OPDS spec: https://specs.opds.io/opds-1.2
 */

const ATOM_NS = 'http://www.w3.org/2005/Atom';
const OPDS_NS = 'http://opds-spec.org/2010/catalog';
const OPENSEARCH_NS = 'http://a9.com/-/spec/opensearch/1.1/';

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function formatDate(date: Date | null): string {
  return (date ?? new Date()).toISOString();
}

export interface NavigationEntry {
  title: string;
  href: string;
  content?: string;
  count?: number;
}

export interface AcquisitionEntry {
  id: string;
  title: string;
  authors?: string;
  summary?: string;
  updated: string;
  coverUrl?: string;
  downloadUrl: string;
  downloadType: string;
}

/**
 * Build an OPDS Navigation Feed (lists other feeds)
 */
export function buildNavigationFeed(
  title: string,
  selfUrl: string,
  entries: NavigationEntry[]
): string {
  const entryXml = entries.map(e => `
    <entry>
      <title>${escapeXml(e.title)}</title>
      <id>${escapeXml(e.href)}</id>
      <updated>${formatDate(null)}</updated>
      <link rel="subsection" href="${escapeXml(e.href)}" type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
      ${e.content ? `<content type="text">${escapeXml(e.content)}${e.count != null ? ` (${e.count})` : ''}</content>` : ''}
    </entry>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="${ATOM_NS}" xmlns:opds="${OPDS_NS}">
  <id>${escapeXml(selfUrl)}</id>
  <title>${escapeXml(title)}</title>
  <updated>${formatDate(null)}</updated>
  <link rel="self" href="${escapeXml(selfUrl)}" type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
  <link rel="start" href="/api/opds/v1.2/catalog" type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
  <link rel="search" href="/api/opds/v1.2/search" type="application/opensearchdescription+xml"/>
  ${entryXml}
</feed>`;
}

/**
 * Build an OPDS Acquisition Feed (lists downloadable books)
 */
export function buildAcquisitionFeed(
  title: string,
  selfUrl: string,
  entries: AcquisitionEntry[]
): string {
  const entryXml = entries.map(e => `
    <entry>
      <title>${escapeXml(e.title)}</title>
      <id>urn:longbox:book:${escapeXml(e.id)}</id>
      <updated>${e.updated}</updated>
      ${e.authors ? `<author><name>${escapeXml(e.authors)}</name></author>` : ''}
      ${e.summary ? `<summary type="text">${escapeXml(e.summary)}</summary>` : ''}
      ${e.coverUrl ? `<link rel="http://opds-spec.org/image/thumbnail" href="${escapeXml(e.coverUrl)}" type="image/jpeg"/>` : ''}
      <link rel="http://opds-spec.org/acquisition" href="${escapeXml(e.downloadUrl)}" type="${escapeXml(e.downloadType)}"/>
    </entry>`).join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns="${ATOM_NS}" xmlns:opds="${OPDS_NS}">
  <id>${escapeXml(selfUrl)}</id>
  <title>${escapeXml(title)}</title>
  <updated>${formatDate(null)}</updated>
  <link rel="self" href="${escapeXml(selfUrl)}" type="application/atom+xml;profile=opds-catalog;kind=acquisition"/>
  <link rel="start" href="/api/opds/v1.2/catalog" type="application/atom+xml;profile=opds-catalog;kind=navigation"/>
  <link rel="search" href="/api/opds/v1.2/search" type="application/opensearchdescription+xml"/>
  ${entryXml}
</feed>`;
}

/**
 * Build OpenSearch description document
 */
export function buildSearchDescription(baseUrl: string): string {
  return `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="${OPENSEARCH_NS}">
  <ShortName>Longbox</ShortName>
  <Description>Search your Longbox comic library</Description>
  <Url type="application/atom+xml;profile=opds-catalog;kind=acquisition" template="${escapeXml(baseUrl)}/api/opds/v1.2/search?q={searchTerms}"/>
</OpenSearchDescription>`;
}

/**
 * Helper: determine MIME type from file path extension
 */
export function getMimeType(filePath: string): string {
  const ext = filePath.toLowerCase().split('.').pop();
  switch (ext) {
    case 'cbz':
    case 'zip':
      return 'application/x-cbz';
    case 'cbr':
    case 'rar':
      return 'application/x-cbr';
    default:
      return 'application/octet-stream';
  }
}

/** Standard OPDS response headers */
export const OPDS_HEADERS = {
  'Content-Type': 'application/atom+xml; charset=utf-8',
} as const;
