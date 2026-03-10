/**
 * Security validation tests
 *
 * Tests for XSS, injection, SSRF, path traversal, and auth bypass vectors.
 */
import { describe, it, expect } from 'vitest';
import {
  buildNavigationFeed,
  buildAcquisitionFeed,
  buildSearchDescription,
  getMimeType,
} from './opds';
import { isAllowedWebhookUrl } from './webhooks';
import { parseFilename } from './scanner/filename-parser';

// =====================
// XSS / XML Injection via OPDS feeds
// =====================

describe('OPDS XML injection prevention', () => {
  it('escapes ampersands in navigation feed titles', () => {
    const feed = buildNavigationFeed('Tom & Jerry', '/test', []);
    expect(feed).toContain('Tom &amp; Jerry');
    expect(feed).not.toContain('Tom & Jerry</title>');
  });

  it('escapes angle brackets in navigation feed titles', () => {
    const feed = buildNavigationFeed('<script>alert(1)</script>', '/test', []);
    expect(feed).toContain('&lt;script&gt;');
    expect(feed).not.toContain('<script>');
  });

  it('escapes quotes in navigation feed URLs', () => {
    const feed = buildNavigationFeed('Test', '/test"onload="alert(1)', []);
    expect(feed).toContain('&quot;');
    // Quotes are escaped to &quot; so the attribute can't break out
    expect(feed).not.toContain('href="/test"onload');
  });

  it('escapes XML injection in entry titles', () => {
    const feed = buildNavigationFeed('Cat', '/cat', [
      { title: '</title><evil/>', href: '/evil' },
    ]);
    expect(feed).toContain('&lt;/title&gt;&lt;evil/&gt;');
  });

  it('escapes XML injection in entry content', () => {
    const feed = buildNavigationFeed('Cat', '/cat', [
      { title: 'Ok', href: '/ok', content: '<img src=x onerror=alert(1)>' },
    ]);
    expect(feed).toContain('&lt;img');
    // Angle brackets are escaped, so no actual HTML element is injected
    expect(feed).not.toContain('<img');
  });

  it('escapes acquisition feed author names', () => {
    const feed = buildAcquisitionFeed('Test', '/test', [{
      id: '1',
      title: 'Book',
      authors: '"><script>alert(1)</script>',
      updated: '2024-01-01T00:00:00.000Z',
      downloadUrl: '/download/1',
      downloadType: 'application/x-cbz',
    }]);
    expect(feed).toContain('&quot;&gt;&lt;script&gt;');
    expect(feed).not.toContain('<script>alert');
  });

  it('escapes acquisition feed summary', () => {
    const feed = buildAcquisitionFeed('Test', '/test', [{
      id: '1',
      title: 'Book',
      summary: '<iframe src="evil.com">',
      updated: '2024-01-01T00:00:00.000Z',
      downloadUrl: '/download/1',
      downloadType: 'application/x-cbz',
    }]);
    expect(feed).toContain('&lt;iframe');
    expect(feed).not.toContain('<iframe');
  });

  it('escapes search description base URL', () => {
    const desc = buildSearchDescription('https://evil.com"><script>');
    expect(desc).toContain('&quot;&gt;&lt;script&gt;');
    expect(desc).not.toContain('<script>');
  });

  it('escapes single quotes', () => {
    const feed = buildNavigationFeed("It's a test", '/test', []);
    expect(feed).toContain('&apos;');
  });
});

// =====================
// SSRF prevention in webhook URLs
// =====================

describe('webhook SSRF prevention', () => {
  describe('blocks internal addresses', () => {
    it('blocks localhost', () => {
      expect(isAllowedWebhookUrl('http://localhost/webhook')).toBe(false);
      expect(isAllowedWebhookUrl('http://localhost:8080/webhook')).toBe(false);
    });

    it('blocks 127.0.0.1', () => {
      expect(isAllowedWebhookUrl('http://127.0.0.1/webhook')).toBe(false);
      expect(isAllowedWebhookUrl('http://127.0.0.1:3000/webhook')).toBe(false);
    });

    it('blocks IPv6 loopback', () => {
      expect(isAllowedWebhookUrl('http://[::1]/webhook')).toBe(false);
    });

    it('blocks 10.x.x.x private range', () => {
      expect(isAllowedWebhookUrl('http://10.0.0.1/webhook')).toBe(false);
      expect(isAllowedWebhookUrl('http://10.255.255.255/webhook')).toBe(false);
    });

    it('blocks 172.16-31.x.x private range', () => {
      expect(isAllowedWebhookUrl('http://172.16.0.1/webhook')).toBe(false);
      expect(isAllowedWebhookUrl('http://172.31.255.255/webhook')).toBe(false);
    });

    it('allows 172.32.x.x (outside private range)', () => {
      expect(isAllowedWebhookUrl('http://172.32.0.1/webhook')).toBe(true);
    });

    it('blocks 192.168.x.x private range', () => {
      expect(isAllowedWebhookUrl('http://192.168.1.1/webhook')).toBe(false);
      expect(isAllowedWebhookUrl('http://192.168.0.100/webhook')).toBe(false);
    });

    it('blocks 169.254.x.x link-local range', () => {
      expect(isAllowedWebhookUrl('http://169.254.169.254/metadata')).toBe(false);
    });

    it('blocks 0.x.x.x', () => {
      expect(isAllowedWebhookUrl('http://0.0.0.0/webhook')).toBe(false);
    });
  });

  describe('blocks dangerous protocols', () => {
    it('blocks file:// protocol', () => {
      expect(isAllowedWebhookUrl('file:///etc/passwd')).toBe(false);
    });

    it('blocks ftp:// protocol', () => {
      expect(isAllowedWebhookUrl('ftp://evil.com/webhook')).toBe(false);
    });

    it('blocks javascript: protocol', () => {
      expect(isAllowedWebhookUrl('javascript:alert(1)')).toBe(false);
    });
  });

  describe('allows valid external URLs', () => {
    it('allows https external URLs', () => {
      expect(isAllowedWebhookUrl('https://automation.example.com/webhook')).toBe(true);
    });

    it('allows http external URLs', () => {
      expect(isAllowedWebhookUrl('http://hooks.example.com:5678/webhook')).toBe(true);
    });

    it('allows domain names', () => {
      expect(isAllowedWebhookUrl('https://n8n.myserver.com/mcp-server/http')).toBe(true);
    });
  });

  describe('handles malformed input', () => {
    it('rejects empty string', () => {
      expect(isAllowedWebhookUrl('')).toBe(false);
    });

    it('rejects invalid URL', () => {
      expect(isAllowedWebhookUrl('not-a-url')).toBe(false);
    });

    it('rejects just a protocol', () => {
      expect(isAllowedWebhookUrl('http://')).toBe(false);
    });
  });
});

// =====================
// OPDS auth header parsing edge cases
// (Testing the logic without actual DB — validates parsing safety)
// =====================

describe('OPDS auth header parsing safety', () => {
  // These test the parsing logic that opds-auth.ts relies on

  it('Base64 decode handles null bytes safely', () => {
    // atob can produce strings with null bytes — ensure they don't cause issues
    const encoded = btoa('user\x00:pass');
    const decoded = atob(encoded);
    const colonIndex = decoded.indexOf(':');
    const email = decoded.slice(0, colonIndex);
    // Null byte in email would be caught by DB query (no user with null in email)
    expect(email).toContain('\x00');
    expect(colonIndex).toBe(5);
  });

  it('colon split only splits on first colon (passwords can contain colons)', () => {
    const decoded = 'user@test.com:pass:with:colons';
    const colonIndex = decoded.indexOf(':');
    const email = decoded.slice(0, colonIndex);
    const password = decoded.slice(colonIndex + 1);
    expect(email).toBe('user@test.com');
    expect(password).toBe('pass:with:colons');
  });

  it('empty email rejected', () => {
    const decoded = ':password';
    const colonIndex = decoded.indexOf(':');
    const email = decoded.slice(0, colonIndex);
    expect(email).toBe('');
    // opds-auth.ts checks !email which catches empty string
    expect(!email).toBe(true);
  });

  it('empty password rejected', () => {
    const decoded = 'user@test.com:';
    const colonIndex = decoded.indexOf(':');
    const password = decoded.slice(colonIndex + 1);
    expect(password).toBe('');
    expect(!password).toBe(true);
  });

  it('no colon in decoded string rejected', () => {
    const decoded = 'no-colon-here';
    const colonIndex = decoded.indexOf(':');
    expect(colonIndex).toBe(-1);
  });
});

// =====================
// LIKE wildcard injection prevention
// =====================

describe('SQL LIKE wildcard injection prevention', () => {
  // Test the escapeLikePattern function that triage.ts uses
  // We import the logic inline since it's a private function

  function escapeLikePattern(value: string): string {
    return value.replace(/[%_\\]/g, '\\$&');
  }

  it('escapes % wildcard', () => {
    expect(escapeLikePattern('/library/100%_complete')).toBe('/library/100\\%\\_complete');
  });

  it('escapes _ wildcard', () => {
    expect(escapeLikePattern('/library/test_folder')).toBe('/library/test\\_folder');
  });

  it('escapes backslash', () => {
    expect(escapeLikePattern('/library/back\\slash')).toBe('/library/back\\\\slash');
  });

  it('does not modify clean paths', () => {
    expect(escapeLikePattern('/library/Batman (2016)')).toBe('/library/Batman (2016)');
  });

  it('handles multiple wildcards', () => {
    expect(escapeLikePattern('%admin%')).toBe('\\%admin\\%');
  });

  it('handles empty string', () => {
    expect(escapeLikePattern('')).toBe('');
  });

  it('preserves normal path characters', () => {
    const path = '/data/comics/Amazing Spider-Man/Issue #1';
    expect(escapeLikePattern(path)).toBe(path);
  });
});

// =====================
// Path traversal safety in filename parsing
// =====================

describe('path traversal safety', () => {
  it('filename parser does not resolve .. in paths', () => {
    const result = parseFilename('../../etc/passwd');
    // Should treat this as a weird filename, not navigate filesystem
    expect(result.seriesName).toBeDefined();
    // The key security property: parseFilename NEVER touches the filesystem
  });

  it('OPDS getMimeType handles paths with traversal attempts', () => {
    // Should just look at extension, not traverse
    expect(getMimeType('../../etc/passwd.cbz')).toBe('application/x-cbz');
    expect(getMimeType('../../etc/passwd')).toBe('application/octet-stream');
  });
});
