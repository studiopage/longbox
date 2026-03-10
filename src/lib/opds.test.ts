import { describe, it, expect } from 'vitest';
import {
  buildNavigationFeed,
  buildAcquisitionFeed,
  buildSearchDescription,
  getMimeType,
} from './opds';

describe('getMimeType', () => {
  it('returns application/x-cbz for .cbz', () => {
    expect(getMimeType('file.cbz')).toBe('application/x-cbz');
  });

  it('returns application/x-cbr for .cbr', () => {
    expect(getMimeType('file.cbr')).toBe('application/x-cbr');
  });

  it('is case insensitive', () => {
    expect(getMimeType('file.CBZ')).toBe('application/x-cbz');
    expect(getMimeType('file.CBR')).toBe('application/x-cbr');
  });

  it('returns application/x-cbz for .zip', () => {
    expect(getMimeType('file.zip')).toBe('application/x-cbz');
  });

  it('returns application/x-cbr for .rar', () => {
    expect(getMimeType('file.rar')).toBe('application/x-cbr');
  });

  it('returns octet-stream for unknown extensions', () => {
    expect(getMimeType('file.pdf')).toBe('application/octet-stream');
    expect(getMimeType('file.txt')).toBe('application/octet-stream');
  });

  it('handles paths with directories', () => {
    expect(getMimeType('/library/comics/Batman 001.cbz')).toBe('application/x-cbz');
  });
});

describe('buildNavigationFeed', () => {
  const feed = buildNavigationFeed('Test Catalog', '/api/opds/v1.2/catalog', [
    { title: 'All Series', href: '/api/opds/v1.2/series', content: 'Browse all series', count: 42 },
    { title: 'New', href: '/api/opds/v1.2/new' },
  ]);

  it('starts with XML declaration', () => {
    expect(feed).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
  });

  it('contains Atom namespace', () => {
    expect(feed).toContain('xmlns="http://www.w3.org/2005/Atom"');
  });

  it('contains OPDS namespace', () => {
    expect(feed).toContain('xmlns:opds="http://opds-spec.org/2010/catalog"');
  });

  it('has correct self link', () => {
    expect(feed).toContain('rel="self" href="/api/opds/v1.2/catalog"');
  });

  it('has start link to catalog', () => {
    expect(feed).toContain('rel="start" href="/api/opds/v1.2/catalog"');
  });

  it('has search link', () => {
    expect(feed).toContain('rel="search" href="/api/opds/v1.2/search"');
  });

  it('contains entry with title', () => {
    expect(feed).toContain('<title>All Series</title>');
  });

  it('contains entry with subsection link', () => {
    expect(feed).toContain('rel="subsection" href="/api/opds/v1.2/series"');
  });

  it('includes content with count', () => {
    expect(feed).toContain('Browse all series (42)');
  });

  it('omits content element when not provided', () => {
    // The "New" entry has no content
    expect(feed).toContain('<title>New</title>');
  });

  it('handles empty entries', () => {
    const emptyFeed = buildNavigationFeed('Empty', '/empty', []);
    expect(emptyFeed).toContain('<title>Empty</title>');
    expect(emptyFeed).not.toContain('<entry>');
  });

  it('escapes XML special characters in title', () => {
    const specialFeed = buildNavigationFeed('Tom & Jerry <3', '/test', []);
    expect(specialFeed).toContain('Tom &amp; Jerry &lt;3');
  });
});

describe('buildAcquisitionFeed', () => {
  const entries = [
    {
      id: 'abc-123',
      title: 'Batman #1',
      authors: 'Tom King',
      summary: 'The Dark Knight returns.',
      updated: '2024-01-01T00:00:00.000Z',
      coverUrl: '/api/cover/abc-123',
      downloadUrl: '/api/read/abc-123/download',
      downloadType: 'application/x-cbz',
    },
    {
      id: 'def-456',
      title: 'Saga #54',
      updated: '2024-06-01T00:00:00.000Z',
      downloadUrl: '/api/read/def-456/download',
      downloadType: 'application/x-cbr',
    },
  ];

  const feed = buildAcquisitionFeed('Test Feed', '/api/opds/v1.2/test', entries);

  it('uses urn:longbox:book: prefix for entry IDs', () => {
    expect(feed).toContain('urn:longbox:book:abc-123');
  });

  it('includes author when provided', () => {
    expect(feed).toContain('<author><name>Tom King</name></author>');
  });

  it('includes summary when provided', () => {
    expect(feed).toContain('<summary type="text">The Dark Knight returns.</summary>');
  });

  it('omits author when not provided', () => {
    // Saga entry has no authors
    const sagaEntry = feed.split('urn:longbox:book:def-456')[1]?.split('</entry>')[0] ?? '';
    expect(sagaEntry).not.toContain('<author>');
  });

  it('omits summary when not provided', () => {
    const sagaEntry = feed.split('urn:longbox:book:def-456')[1]?.split('</entry>')[0] ?? '';
    expect(sagaEntry).not.toContain('<summary');
  });

  it('includes thumbnail link when coverUrl provided', () => {
    expect(feed).toContain('rel="http://opds-spec.org/image/thumbnail" href="/api/cover/abc-123"');
  });

  it('includes acquisition link', () => {
    expect(feed).toContain('rel="http://opds-spec.org/acquisition" href="/api/read/abc-123/download"');
  });

  it('has acquisition kind in self link', () => {
    expect(feed).toContain('kind=acquisition');
  });

  it('escapes special characters in entry fields', () => {
    const specialFeed = buildAcquisitionFeed('Test', '/test', [{
      id: '1',
      title: 'Tom & Jerry <issue>',
      authors: 'Hanna & Barbera',
      updated: '2024-01-01T00:00:00.000Z',
      downloadUrl: '/download/1',
      downloadType: 'application/x-cbz',
    }]);
    expect(specialFeed).toContain('Tom &amp; Jerry &lt;issue&gt;');
    expect(specialFeed).toContain('Hanna &amp; Barbera');
  });
});

describe('buildSearchDescription', () => {
  const desc = buildSearchDescription('https://comics.example.com');

  it('starts with XML declaration', () => {
    expect(desc).toMatch(/^<\?xml version="1.0" encoding="UTF-8"\?>/);
  });

  it('contains OpenSearchDescription root element', () => {
    expect(desc).toContain('<OpenSearchDescription');
  });

  it('contains OpenSearch namespace', () => {
    expect(desc).toContain('http://a9.com/-/spec/opensearch/1.1/');
  });

  it('has ShortName', () => {
    expect(desc).toContain('<ShortName>Longbox</ShortName>');
  });

  it('contains searchTerms template variable', () => {
    expect(desc).toContain('{searchTerms}');
  });

  it('uses baseUrl in template', () => {
    expect(desc).toContain('https://comics.example.com/api/opds/v1.2/search?q={searchTerms}');
  });
});
