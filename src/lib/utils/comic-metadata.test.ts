import { describe, it, expect } from 'vitest';
import {
  cleanComicTitle,
  parseIssueNumber,
  formatIssueDisplayTitle,
  extractPublisher,
  normalizeSeriesName,
} from './comic-metadata';

describe('cleanComicTitle', () => {
  describe('aggressive cleaning (filename-like titles)', () => {
    it('extracts series + issue from filename pattern', () => {
      expect(cleanComicTitle('Batman 001 (2024)(Digital).cbz')).toBe('Batman #1');
    });

    it('strips multiple parenthetical metadata', () => {
      const result = cleanComicTitle('Saga 054 (2018) (Digital) (Zone-Empire).cbr');
      expect(result).toBe('Saga #54');
    });

    it('strips file extensions', () => {
      expect(cleanComicTitle('Batman.cbz')).toBe('Batman');
      expect(cleanComicTitle('Batman.cbr')).toBe('Batman');
    });
  });

  describe('light cleaning (metadata titles)', () => {
    it('only strips file extensions for non-filename titles', () => {
      expect(cleanComicTitle('The Dark Knight Returns')).toBe('The Dark Knight Returns');
    });

    it('preserves metadata titles unchanged', () => {
      expect(cleanComicTitle('Batman: Year One')).toBe('Batman: Year One');
    });
  });

  describe('matchesFilename behavior', () => {
    it('cleans aggressively when title matches filename', () => {
      const result = cleanComicTitle('Batman 001', 'Batman 001.cbz');
      expect(result).not.toContain('(');
    });
  });
});

describe('parseIssueNumber', () => {
  it('parses #001 pattern', () => {
    expect(parseIssueNumber('Batman #001.cbz')).toBe('1');
  });

  it('parses #01 pattern', () => {
    expect(parseIssueNumber('Batman #01.cbz')).toBe('1');
  });

  it('parses #1 pattern', () => {
    expect(parseIssueNumber('Batman #1.cbz')).toBe('1');
  });

  it('parses "Issue 005" pattern', () => {
    expect(parseIssueNumber('Batman Issue 005.cbz')).toBe('5');
  });

  it('parses "v1 #003" pattern', () => {
    expect(parseIssueNumber('Batman v1 #003.cbz')).toBe('3');
  });

  it('parses standalone 3-digit number', () => {
    expect(parseIssueNumber('Batman 001 (2024).cbz')).toBe('1');
  });

  it('parses trailing number', () => {
    expect(parseIssueNumber('Batman_05.cbz')).toBe('5');
  });

  it('returns null when no issue number found', () => {
    expect(parseIssueNumber('Batman Annual.cbz')).toBeNull();
  });
});

describe('formatIssueDisplayTitle', () => {
  it('returns "Issue #N" for null title', () => {
    expect(formatIssueDisplayTitle(null, 5)).toBe('Issue #5');
  });

  it('returns "Issue #N" for empty title', () => {
    expect(formatIssueDisplayTitle('', 5)).toBe('Issue #5');
    expect(formatIssueDisplayTitle('   ', 5)).toBe('Issue #5');
  });

  it('returns "Issue #N" for too-short cleaned result', () => {
    expect(formatIssueDisplayTitle('ab', 3)).toBe('Issue #3');
  });

  it('returns "Issue #N" for pure digits', () => {
    expect(formatIssueDisplayTitle('123', 3)).toBe('Issue #3');
  });

  it('returns cleaned title for valid title', () => {
    expect(formatIssueDisplayTitle('The Dark Knight', 1)).toBe('The Dark Knight');
  });

  it('defaults issue number to 1 when null', () => {
    expect(formatIssueDisplayTitle(null, null)).toBe('Issue #1');
  });
});

describe('extractPublisher', () => {
  it('extracts Marvel', () => {
    expect(extractPublisher('Published by Marvel Comics')).toBe('Marvel');
  });

  it('extracts DC Comics', () => {
    expect(extractPublisher('DC Comics presents')).toBe('DC Comics');
  });

  it('extracts Image Comics', () => {
    expect(extractPublisher('Image Comics')).toBe('Image Comics');
  });

  it('extracts Dark Horse', () => {
    expect(extractPublisher('Dark Horse Comics')).toBe('Dark Horse');
  });

  it('is case insensitive', () => {
    expect(extractPublisher('published by marvel')).toBe('Marvel');
  });

  it('returns null for unknown text', () => {
    expect(extractPublisher('Some random text')).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(extractPublisher('')).toBeNull();
  });
});

describe('normalizeSeriesName', () => {
  it('lowercases and removes special chars', () => {
    expect(normalizeSeriesName('BATMAN!')).toBe('batman');
  });

  it('collapses whitespace', () => {
    expect(normalizeSeriesName('The  Walking   Dead')).toBe('the walking dead');
  });

  it('trims', () => {
    expect(normalizeSeriesName('  Batman  ')).toBe('batman');
  });
});
