'use server';

import { z } from 'zod';

/**
 * OCLC WorldCat API Client
 * Phase 3: Authority record matching for series and books
 * 
 * OCLC = Online Computer Library Center
 * Provides standardized library metadata and cataloging
 */

const WORLDCAT_BASE = 'https://www.worldcat.org/webservices/catalog/search/opensearch';

// Schema for WorldCat search result
const WorldCatRecordSchema = z.object({
  title: z.string(),
  author: z.string().optional(),
  year: z.number().optional(),
  isbn: z.array(z.string()).optional(),
  issn: z.string().optional(),
  oclcNumber: z.string().optional(),
  lccn: z.string().optional(),
  publisher: z.string().optional(),
  format: z.string().optional(),
  language: z.string().optional(),
  url: z.string().optional(),
}).passthrough();

export type WorldCatRecord = z.infer<typeof WorldCatRecordSchema>;

/**
 * Search WorldCat by title and author
 * Returns OCLC number and authority data
 */
export async function searchWorldCat(
  title: string,
  author?: string
): Promise<WorldCatRecord | null> {
  try {
    const params = new URLSearchParams();
    params.set('q', title);
    if (author) params.append('q', author);
    params.set('format', 'json');
    params.set('maximumRecords', '1');

    const url = `${WORLDCAT_BASE}?${params}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Vidiai-Longbox/1.0' },
      cache: 'no-store',
    });

    if (!res.ok) {
      console.warn(`WorldCat search failed: ${res.status}`);
      return null;
    }

    const data = await res.json();

    // WorldCat returns results in different structures depending on query
    // Look for 'searchResults' field
    if (!data.searchResults || !Array.isArray(data.searchResults) || data.searchResults.length === 0) {
      return null;
    }

    const record = data.searchResults[0];
    
    // Parse OCLC number from URL if present
    let oclcNumber: string | undefined;
    if (record.url) {
      const match = record.url.match(/\/oclc\/(\d+)/);
      if (match) oclcNumber = match[1];
    }

    return {
      title: record.title || title,
      author: record.author,
      year: record.year ? parseInt(record.year) : undefined,
      oclcNumber,
      publisher: record.publisher,
      format: record.format,
      url: record.url,
    };
  } catch (error) {
    console.error('WorldCat search error:', error);
    return null;
  }
}

/**
 * Search WorldCat by ISBN
 * More reliable than title search
 */
export async function searchWorldCatByISBN(
  isbn: string
): Promise<WorldCatRecord | null> {
  try {
    const cleanISBN = isbn.replace(/[\s\-]/g, '');

    const params = new URLSearchParams();
    params.set('q', `isbn:${cleanISBN}`);
    params.set('format', 'json');
    params.set('maximumRecords', '1');

    const url = `${WORLDCAT_BASE}?${params}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Vidiai-Longbox/1.0' },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.searchResults || data.searchResults.length === 0) return null;

    const record = data.searchResults[0];

    let oclcNumber: string | undefined;
    if (record.url) {
      const match = record.url.match(/\/oclc\/(\d+)/);
      if (match) oclcNumber = match[1];
    }

    return {
      title: record.title,
      author: record.author,
      isbn: record.isbn,
      oclcNumber,
      url: record.url,
    };
  } catch (error) {
    console.error('WorldCat ISBN search error:', error);
    return null;
  }
}

/**
 * Search WorldCat by ISSN (for series)
 * Comics often have ISSNs for ongoing series
 */
export async function searchWorldCatByISSN(
  issn: string
): Promise<WorldCatRecord | null> {
  try {
    const cleanISSN = issn.replace(/[\s\-]/g, '');

    const params = new URLSearchParams();
    params.set('q', `issn:${cleanISSN}`);
    params.set('format', 'json');
    params.set('maximumRecords', '1');

    const url = `${WORLDCAT_BASE}?${params}`;

    const res = await fetch(url, {
      headers: { 'User-Agent': 'Vidiai-Longbox/1.0' },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (!data.searchResults || data.searchResults.length === 0) return null;

    const record = data.searchResults[0];

    let oclcNumber: string | undefined;
    if (record.url) {
      const match = record.url.match(/\/oclc\/(\d+)/);
      if (match) oclcNumber = match[1];
    }

    return {
      title: record.title,
      author: record.author,
      issn: record.issn,
      oclcNumber,
      url: record.url,
    };
  } catch (error) {
    console.error('WorldCat ISSN search error:', error);
    return null;
  }
}

/**
 * Get detailed OCLC record by OCLC number
 * Requires WorldCat API key for detailed access
 * Free tier returns basic search results
 */
export async function getOCLCRecord(
  oclcNumber: string,
  apiKey?: string
): Promise<WorldCatRecord | null> {
  try {
    if (apiKey) {
      // Use API key for more detailed data
      const url = `https://worldcat.org/webservices/catalog/content/isbn?oclcNumber=${oclcNumber}&format=json&wskey=${apiKey}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const data = await res.json();
      // Parse response
      return data as WorldCatRecord;
    } else {
      // Fallback to public search
      return searchWorldCat(`oclc:${oclcNumber}`);
    }
  } catch (error) {
    console.error('OCLC record fetch error:', error);
    return null;
  }
}

/**
 * Summary: WorldCat Integration
 * 
 * OCLC numbers provide:
 * - Standardized library metadata
 * - Authority control (verified publisher, year, format)
 * - Cross-reference to other library systems
 * - ISBN/ISSN validation
 * - Dewey Decimal classification
 * 
 * Use cases in Longbox:
 * 1. Verify series metadata against library standards
 * 2. Resolve publication year ambiguities
 * 3. Distinguish variant editions/formats
 * 4. Provide normalized publisher names
 * 
 * Note: Free WorldCat API has limits (~50 req/hr)
 * Use sparingly or cache results
 */
