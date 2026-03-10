import { describe, it, expect } from 'vitest';
import { parseFilename, normalizeSeriesName } from './filename-parser';

describe('normalizeSeriesName', () => {
  it('lowercases input', () => {
    expect(normalizeSeriesName('BATMAN')).toBe('batman');
  });

  it('removes possessives', () => {
    expect(normalizeSeriesName("Harley Quinn's")).toBe('harley quinns');
  });

  it('removes punctuation except hyphens', () => {
    expect(normalizeSeriesName('Dr. Strange!')).toBe('dr strange');
  });

  it('collapses whitespace', () => {
    expect(normalizeSeriesName('The  Walking   Dead')).toBe('the walking dead');
  });

  it('trims whitespace', () => {
    expect(normalizeSeriesName('  Batman  ')).toBe('batman');
  });

  it('collapses hyphens into spaces', () => {
    expect(normalizeSeriesName('Spider-Man')).toBe('spider man');
  });

  it('handles mixed punctuation and whitespace', () => {
    expect(normalizeSeriesName("  The Amazing Spider-Man's Web!  ")).toBe('the amazing spider mans web');
  });
});

describe('parseFilename', () => {
  describe('standard patterns', () => {
    it('parses "Batman (2016) 001 (2024).cbz"', () => {
      const result = parseFilename('Batman (2016) 001 (2024).cbz');
      expect(result.seriesName).toBe('Batman (2016)');
      expect(result.issueNumber).toBe('001');
      expect(result.year).toBe(2024);
    });

    it('parses "Amazing Spider-Man #5.cbz"', () => {
      const result = parseFilename('Amazing Spider-Man #5.cbz');
      expect(result.seriesName).toBe('Amazing Spider-Man');
      expect(result.issueNumber).toBe('5');
    });

    it('parses "Saga 054 (2018) (Digital) (Zone-Empire).cbr"', () => {
      const result = parseFilename('Saga 054 (2018) (Digital) (Zone-Empire).cbr');
      expect(result.seriesName).toBe('Saga');
      expect(result.issueNumber).toBe('054');
      expect(result.year).toBe(2018);
    });

    it('parses "Series Name v2 012.cbz"', () => {
      const result = parseFilename('Series Name v2 012.cbz');
      expect(result.seriesName).toBe('Series Name');
      expect(result.issueNumber).toBe('012');
    });

    it('parses "Series Name 03 (of 04).cbr"', () => {
      const result = parseFilename('Series Name 03 (of 04).cbr');
      expect(result.seriesName).toBe('Series Name');
      expect(result.issueNumber).toBe('03');
    });

    it('parses "The Walking Dead 100 (2012).cbz"', () => {
      const result = parseFilename('The Walking Dead 100 (2012).cbz');
      expect(result.seriesName).toBe('The Walking Dead');
      expect(result.issueNumber).toBe('100');
      expect(result.year).toBe(2012);
    });
  });

  describe('noise tag stripping', () => {
    it('strips (Digital) tag', () => {
      const result = parseFilename('Batman 001 (Digital).cbz');
      expect(result.seriesName).toBe('Batman');
      expect(result.issueNumber).toBe('001');
    });

    it('strips (Zone-Empire) tag', () => {
      const result = parseFilename('Batman 001 (Zone-Empire).cbz');
      expect(result.seriesName).toBe('Batman');
      expect(result.issueNumber).toBe('001');
    });

    it('strips (c2c) tag', () => {
      const result = parseFilename('Batman 001 (c2c).cbz');
      expect(result.seriesName).toBe('Batman');
      expect(result.issueNumber).toBe('001');
    });

    it('strips (Minutemen-Midas) tag', () => {
      const result = parseFilename('Batman 001 (Minutemen-Midas).cbz');
      expect(result.seriesName).toBe('Batman');
    });

    it('strips multiple noise tags', () => {
      const result = parseFilename('Saga 054 (2018) (Digital) (Zone-Empire) (c2c).cbr');
      expect(result.seriesName).toBe('Saga');
      expect(result.issueNumber).toBe('054');
    });
  });

  describe('year handling', () => {
    it('single year after series name kept as series year', () => {
      const result = parseFilename('Batman (2016) 001.cbz');
      expect(result.seriesName).toBe('Batman (2016)');
      expect(result.year).toBe(2016);
    });

    it('two years: first=series, second=release', () => {
      const result = parseFilename('Batman (2016) 001 (2024).cbz');
      expect(result.seriesName).toBe('Batman (2016)');
      expect(result.year).toBe(2024);
    });

    it('single year after issue number is release year', () => {
      const result = parseFilename('Saga 054 (2018).cbr');
      expect(result.seriesName).toBe('Saga');
      expect(result.issueNumber).toBe('054');
      expect(result.year).toBe(2018);
    });

    it('no years returns null', () => {
      const result = parseFilename('Batman 001.cbz');
      expect(result.year).toBeNull();
    });
  });

  describe('issue number patterns', () => {
    it('hash pattern: #5', () => {
      const result = parseFilename('Amazing Spider-Man #5.cbz');
      expect(result.issueNumber).toBe('5');
    });

    it('hash pattern with decimal: #5.1', () => {
      const result = parseFilename('Amazing Spider-Man #5.1.cbz');
      expect(result.issueNumber).toBe('5.1');
    });

    it('volume+issue pattern: v2 012', () => {
      const result = parseFilename('Series Name v2 012.cbz');
      expect(result.issueNumber).toBe('012');
    });

    it('"of N" pattern: 03 (of 04)', () => {
      const result = parseFilename('Series Name 03 (of 04).cbr');
      expect(result.issueNumber).toBe('03');
    });

    it('standalone number: 001', () => {
      const result = parseFilename('Batman 001.cbz');
      expect(result.issueNumber).toBe('001');
    });
  });

  describe('edge cases', () => {
    it('filename with no issue number', () => {
      const result = parseFilename('Batman Annual.cbz');
      expect(result.seriesName).toBe('Batman Annual');
      expect(result.issueNumber).toBeNull();
    });

    it('handles hyphens in series name', () => {
      const result = parseFilename('Spider-Man 001.cbz');
      expect(result.seriesName).toBe('Spider-Man');
      expect(result.issueNumber).toBe('001');
    });

    it('handles periods in series name', () => {
      const result = parseFilename('Dr. Strange 001.cbz');
      expect(result.seriesName).toBe('Dr. Strange');
      expect(result.issueNumber).toBe('001');
    });

    it('dot-prefixed file treated as hidden file (no extension)', () => {
      // path.extname('.cbz') returns '' — it's a hidden file, not extension-only
      const result = parseFilename('.cbz');
      expect(result.seriesName).toBe('cbz');
    });

    it('no extension still parses', () => {
      const result = parseFilename('Batman 001');
      expect(result.seriesName).toBe('Batman');
      expect(result.issueNumber).toBe('001');
    });

    it('bracket noise tags also stripped', () => {
      const result = parseFilename('Batman 001 [Digital] [c2c].cbz');
      expect(result.seriesName).toBe('Batman');
      expect(result.issueNumber).toBe('001');
    });
  });
});
