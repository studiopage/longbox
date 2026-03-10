import { describe, it, expect } from 'vitest';
import { scoreConfidence } from './confidence';
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

describe('scoreConfidence', () => {
  describe('signal-vs-candidate matching', () => {
    it('ComicInfo match gives +40', () => {
      const signals = makeSignals({
        comicInfo: {
          seriesName: 'Batman',
          issueNumber: '1',
          title: null, publisher: null, year: null,
          writer: null, penciller: null, pageCount: null, summary: null,
        },
      });
      const result = scoreConfidence(signals, 'Batman');
      expect(result.score).toBeGreaterThanOrEqual(40);
      expect(result.reasons).toContain('ComicInfo series matches candidate');
    });

    it('folder match gives +25', () => {
      const signals = makeSignals({
        folder: { folderName: 'Batman', normalizedName: 'batman', depth: 1 },
      });
      const result = scoreConfidence(signals, 'Batman');
      expect(result.score).toBeGreaterThanOrEqual(25);
      expect(result.reasons).toContain('Folder name matches candidate');
    });

    it('filename match gives +15', () => {
      const signals = makeSignals({
        filename: { seriesName: 'Batman', normalizedName: 'batman', issueNumber: '1', year: null },
      });
      const result = scoreConfidence(signals, 'Batman');
      expect(result.score).toBeGreaterThanOrEqual(15);
      expect(result.reasons).toContain('Filename series matches candidate');
    });
  });

  describe('metadata bonuses', () => {
    it('publisher metadata gives +5', () => {
      const signals = makeSignals({
        comicInfo: {
          seriesName: 'Batman', issueNumber: '1', title: null,
          publisher: 'DC Comics', year: null,
          writer: null, penciller: null, pageCount: null, summary: null,
        },
      });
      const result = scoreConfidence(signals, 'Batman');
      expect(result.reasons).toContain('Has publisher metadata');
    });

    it('issue number gives +5', () => {
      const signals = makeSignals({
        filename: { seriesName: 'Batman', normalizedName: 'batman', issueNumber: '5', year: null },
      });
      const result = scoreConfidence(signals, 'Batman');
      expect(result.reasons).toContain('Has issue number');
    });
  });

  describe('cross-signal agreement', () => {
    it('multiple signals agreeing on name gives +5', () => {
      const signals = makeSignals({
        folder: { folderName: 'Batman', normalizedName: 'batman', depth: 1 },
        filename: { seriesName: 'Batman', normalizedName: 'batman', issueNumber: '1', year: null },
      });
      const result = scoreConfidence(signals, 'Batman');
      expect(result.reasons).toContain('Multiple signals agree on series name');
    });

    it('year signals agreeing gives +5', () => {
      const signals = makeSignals({
        comicInfo: {
          seriesName: 'Batman', issueNumber: '1', title: null,
          publisher: null, year: 2024,
          writer: null, penciller: null, pageCount: null, summary: null,
        },
        filename: { seriesName: 'Batman', normalizedName: 'batman', issueNumber: '1', year: 2024 },
      });
      const result = scoreConfidence(signals, 'Batman');
      expect(result.reasons).toContain('Year signals agree');
    });
  });

  describe('full scoring scenarios', () => {
    it('all signals match candidate = high confidence', () => {
      const signals = makeSignals({
        comicInfo: {
          seriesName: 'Batman', issueNumber: '1', title: null,
          publisher: 'DC Comics', year: 2024,
          writer: null, penciller: null, pageCount: null, summary: null,
        },
        folder: { folderName: 'Batman', normalizedName: 'batman', depth: 1 },
        filename: { seriesName: 'Batman', normalizedName: 'batman', issueNumber: '1', year: 2024 },
      });
      const result = scoreConfidence(signals, 'Batman');
      // 40 + 25 + 15 + 5(publisher) + 5(issue) + 5(agreement) + 5(year) = 100
      expect(result.score).toBe(100);
      expect(result.tier).toBe('high');
    });

    it('comicinfo + folder + issue = medium-high', () => {
      const signals = makeSignals({
        comicInfo: {
          seriesName: 'Saga', issueNumber: '54', title: null,
          publisher: null, year: null,
          writer: null, penciller: null, pageCount: null, summary: null,
        },
        folder: { folderName: 'Saga', normalizedName: 'saga', depth: 1 },
      });
      const result = scoreConfidence(signals, 'Saga');
      // 40 + 25 + 5(issue) + 5(agreement) = 75
      expect(result.score).toBe(75);
      expect(result.tier).toBe('medium');
    });
  });

  describe('tier boundaries', () => {
    it('score 90 is high', () => {
      const signals = makeSignals({
        comicInfo: {
          seriesName: 'Batman', issueNumber: '1', title: null,
          publisher: 'DC', year: null,
          writer: null, penciller: null, pageCount: null, summary: null,
        },
        folder: { folderName: 'Batman', normalizedName: 'batman', depth: 1 },
        filename: { seriesName: 'Batman', normalizedName: 'batman', issueNumber: '1', year: null },
      });
      const result = scoreConfidence(signals, 'Batman');
      // 40+25+15+5(pub)+5(issue)+5(agree) = 95
      expect(result.tier).toBe('high');
    });

    it('score below 60 is low', () => {
      const signals = makeSignals({
        folder: { folderName: 'Batman', normalizedName: 'batman', depth: 1 },
      });
      const result = scoreConfidence(signals, 'Batman');
      // 25 only
      expect(result.score).toBe(25);
      expect(result.tier).toBe('low');
    });
  });

  describe('no candidate', () => {
    it('caps score at 55 without candidate', () => {
      const signals = makeSignals({
        comicInfo: {
          seriesName: 'Batman', issueNumber: '1', title: null,
          publisher: 'DC', year: 2024,
          writer: null, penciller: null, pageCount: null, summary: null,
        },
        folder: { folderName: 'Batman', normalizedName: 'batman', depth: 1 },
        filename: { seriesName: 'Batman', normalizedName: 'batman', issueNumber: '1', year: 2024 },
      });
      const result = scoreConfidence(signals, null);
      expect(result.score).toBeLessThanOrEqual(55);
      expect(result.reasons).toContain('Score capped (no candidate series)');
    });

    it('empty signals with no candidate = 0', () => {
      const signals = makeSignals();
      const result = scoreConfidence(signals, null);
      expect(result.score).toBe(0);
      expect(result.tier).toBe('low');
    });
  });
});
