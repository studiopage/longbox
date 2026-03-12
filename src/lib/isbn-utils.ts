'use server';

import type { MetronIssue } from '@/lib/metron';

/**
 * Phase 2: ISBN/UPC extraction from metadata sources
 * ComicVine and Metron both provide UPC/ISBN data
 */

/**
 * Extract ISBN/UPC from Metron issue data
 * Metron provides UPC directly, not ISBN for individual issues
 * (ISBNs are typically for collected editions/TPBs)
 */
export function extractIsbnFromMetron(issue: MetronIssue): {
  upc?: string;
  isbn?: string;
} {
  const result: { upc?: string; isbn?: string } = {};

  // UPC is commonly available for individual comic issues
  if (issue.upc) {
    result.upc = normalizeUpc(issue.upc);
  }

  // ISBN is more common for collections/graphics novels
  // Some Metron issues have ISBNs - would appear as extra field
  // For now, UPC is what we extract from individual issues

  return result;
}

/**
 * Normalize UPC to standard 12-digit format
 * Removes checksums, leading zeros, common prefixes
 */
export function normalizeUpc(upc: string): string {
  if (!upc) return '';

  // Remove spaces and hyphens
  let normalized = upc.replace(/[\s\-]/g, '');

  // If it's only 11 digits, it might need a check digit, but return as-is
  // Standard UPC-A is 12 digits, UPC-E is 6 digits
  if (normalized.length === 12 && normalized.startsWith('0')) {
    return normalized;
  }

  // If longer than 12, might include EAN prefix or extras
  if (normalized.length > 12) {
    // Try to extract 12-digit UPC from longer string
    const match = normalized.match(/(\d{12})/);
    if (match) return match[1];
  }

  return normalized;
}

/**
 * Validate ISBN-10 or ISBN-13 format
 */
export function isValidISBN(isbn: string): boolean {
  const cleaned = isbn.replace(/[\s\-]/g, '');

  if (cleaned.length === 10) {
    // ISBN-10 checksum validation
    let sum = 0;
    for (let i = 0; i < 9; i++) {
      const digit = parseInt(cleaned[i]);
      if (isNaN(digit)) return false;
      sum += digit * (10 - i);
    }
    const checkDigit = cleaned[9];
    const expectedCheck = (11 - (sum % 11)) % 11;
    return (
      checkDigit === String(expectedCheck) ||
      (expectedCheck === 10 && checkDigit === 'X')
    );
  } else if (cleaned.length === 13) {
    // ISBN-13 checksum validation
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(cleaned[i]);
      if (isNaN(digit)) return false;
      sum += digit * (i % 2 === 0 ? 1 : 3);
    }
    const checkDigit = parseInt(cleaned[12]);
    const expectedCheck = (10 - (sum % 10)) % 10;
    return checkDigit === expectedCheck;
  }

  return false;
}

/**
 * Convert ISBN-10 to ISBN-13
 * Used when only ISBN-10 is available
 */
export function convertISBN10to13(isbn10: string): string {
  const cleaned = isbn10.replace(/[\s\-]/g, '');
  if (cleaned.length !== 10) return '';

  // ISBN-13 always starts with 978 or 979
  const isbn13base = '978' + cleaned.substring(0, 9);

  // Recalculate check digit
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(isbn13base[i]);
    sum += digit * (i % 2 === 0 ? 1 : 3);
  }
  const checkDigit = (10 - (sum % 10)) % 10;

  return isbn13base + checkDigit;
}

/**
 * Extract UPC from ComicVine response
 * ComicVine API sometimes returns UPC in cover/issue details
 */
export function extractUpcFromComicVine(cvData: any): string | undefined {
  if (!cvData) return undefined;

  // ComicVine might have UPC in various fields
  const possibleFields = ['upc', 'UPC', 'barcode', 'sku'];
  for (const field of possibleFields) {
    if (cvData[field]) {
      return normalizeUpc(String(cvData[field]));
    }
  }

  return undefined;
}

/**
 * Search for ISBN using UPC via ISBNdb
 * Can find ISBN if UPC is available
 * (Requires ISBNdb API key - requires configuration)
 */
export async function lookupISBNfromUPC(
  upc: string,
  isbndbKey?: string
): Promise<string | undefined> {
  if (!isbndbKey || !upc) return undefined;

  try {
    const res = await fetch(`https://api2.isbndb.com/book/${upc}`, {
      headers: {
        'Authorization': isbndbKey,
        'User-Agent': 'Vidiai-Longbox/1.0',
      },
    });

    if (!res.ok) return undefined;

    const data = await res.json();
    return data.isbn || data.isbn13;
  } catch (err) {
    console.debug('ISBN lookup error:', err);
    return undefined;
  }
}

/**
 * Summary: ISBN/UPC Strategy
 * 
 * Phase 2 Approach:
 * 1. Extract UPC/ISBN from Metron issues (when available via API)
 * 2. Store both in books table
 * 3. Use ISBNdb integration for cross-reference lookups (optional, requires API key)
 * 4. OpenLibrary can search by ISBN for ratings
 * 
 * Priority Order:
 * 1. Extract from ComicInfo.xml if present
 * 2. Fetch from Metron issue API
 * 3. Extract from ComicVine cover data
 * 4. Look up via ISBNdb if needed
 */
