import { describe, it, expect } from 'vitest';
import {
  extractFolderSignal,
  extractFilenameSignal,
  deriveSeriesName,
  deriveIssueNumber,
} from './signals';
import type { ExtractedSignals } from './signals';

function makeSignals(overrides: Partial<ExtractedSignals> = {}): ExtractedSignals {
  return {
    comicInfo: null,
    folder: { folderName: '', normalizedName: '', depth: 0 },
    filename: { seriesName: null, normalizedName: null, issueNumber: null, year: null },
    filePath: '/library/test.cbz',
    fileSize: 1024,
    ...overrides,
  };
}

describe('extractFolderSignal', () => {
  it('extracts folder name and depth from nested path', () => {
    const signal = extractFolderSignal('/library/Batman/Batman 001.cbz', '/library');
    expect(signal.folderName).toBe('Batman');
    expect(signal.normalizedName).toBe('batman');
    expect(signal.depth).toBe(1);
  });

  it('handles deeper nesting', () => {
    const signal = extractFolderSignal('/library/DC/Batman/file.cbz', '/library');
    expect(signal.folderName).toBe('Batman');
    expect(signal.depth).toBe(2);
  });

  it('returns depth 0 for file at library root', () => {
    const signal = extractFolderSignal('/library/file.cbz', '/library');
    expect(signal.folderName).toBe('library');
    expect(signal.depth).toBe(0);
  });

  it('normalizes folder name', () => {
    const signal = extractFolderSignal('/library/Amazing Spider-Man/file.cbz', '/library');
    expect(signal.normalizedName).toBe('amazing spider man');
  });
});

describe('extractFilenameSignal', () => {
  it('extracts series name and issue number', () => {
    const signal = extractFilenameSignal('/library/Batman/Batman 001.cbz');
    expect(signal.seriesName).toBe('Batman');
    expect(signal.normalizedName).toBe('batman');
    expect(signal.issueNumber).toBe('001');
  });

  it('extracts year from filename', () => {
    const signal = extractFilenameSignal('/library/Saga 054 (2018).cbr');
    expect(signal.seriesName).toBe('Saga');
    expect(signal.issueNumber).toBe('054');
    expect(signal.year).toBe(2018);
  });

  it('handles dot-prefixed hidden files', () => {
    // path.extname('.cbz') returns '' — treated as hidden file
    const signal = extractFilenameSignal('/library/.cbz');
    expect(signal.seriesName).toBe('cbz');
  });
});

describe('deriveSeriesName', () => {
  it('prefers ComicInfo series name', () => {
    const signals = makeSignals({
      comicInfo: {
        seriesName: 'Batman', issueNumber: '1', title: null,
        publisher: null, year: null, writer: null, penciller: null,
        pageCount: null, summary: null,
      },
      folder: { folderName: 'Dark Knight', normalizedName: 'dark knight', depth: 1 },
      filename: { seriesName: 'Bats', normalizedName: 'bats', issueNumber: '1', year: null },
    });
    const result = deriveSeriesName(signals);
    expect(result.name).toBe('Batman');
    expect(result.source).toBe('comicinfo');
  });

  it('falls back to folder when no ComicInfo', () => {
    const signals = makeSignals({
      folder: { folderName: 'Batman', normalizedName: 'batman', depth: 1 },
      filename: { seriesName: 'Bats', normalizedName: 'bats', issueNumber: '1', year: null },
    });
    const result = deriveSeriesName(signals);
    expect(result.name).toBe('Batman');
    expect(result.source).toBe('folder');
  });

  it('skips folder at depth 0 (library root)', () => {
    const signals = makeSignals({
      folder: { folderName: 'library', normalizedName: 'library', depth: 0 },
      filename: { seriesName: 'Batman', normalizedName: 'batman', issueNumber: '1', year: null },
    });
    const result = deriveSeriesName(signals);
    expect(result.name).toBe('Batman');
    expect(result.source).toBe('filename');
  });

  it('falls back to filename basename when no signals', () => {
    const signals = makeSignals({
      filePath: '/library/mystery-file.cbz',
      folder: { folderName: 'library', normalizedName: 'library', depth: 0 },
    });
    const result = deriveSeriesName(signals);
    expect(result.name).toBe('mystery-file');
    expect(result.source).toBe('filename');
  });
});

describe('deriveIssueNumber', () => {
  it('prefers ComicInfo issue number', () => {
    const signals = makeSignals({
      comicInfo: {
        seriesName: 'Batman', issueNumber: '42', title: null,
        publisher: null, year: null, writer: null, penciller: null,
        pageCount: null, summary: null,
      },
      filename: { seriesName: 'Batman', normalizedName: 'batman', issueNumber: '1', year: null },
    });
    expect(deriveIssueNumber(signals)).toBe('42');
  });

  it('falls back to filename issue number', () => {
    const signals = makeSignals({
      filename: { seriesName: 'Batman', normalizedName: 'batman', issueNumber: '5', year: null },
    });
    expect(deriveIssueNumber(signals)).toBe('5');
  });

  it('returns "1" as fallback', () => {
    const signals = makeSignals();
    expect(deriveIssueNumber(signals)).toBe('1');
  });
});
