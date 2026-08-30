import { describe, expect, it } from 'vitest';
import { isSafeWebUrl } from '../src/shared/actions.js';

describe('isSafeWebUrl', () => {
  it('accepts http/https URLs with host and path/query/hash', () => {
    const safe = [
      'https://example.com/watch?v=abc123',
      'http://example.com/video',
      'https://sub.example.com:8443/path?q=1#frag',
      'https://example.com',
      'http://example.com/',
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=42s',
      'https://example.com/a/b/c?x=1&y=2#z',
    ];
    for (const url of safe) expect(isSafeWebUrl(url)).toBe(true);
  });

  it('rejects non-web and malformed URLs', () => {
    const unsafe = [
      'javascript:alert(1)',
      'data:text/html,<script>alert(1)</script>',
      'ftp://example.com/file',
      'mailto:user@example.com',
      'file:///etc/passwd',
      'not a url',
      'example.com',
      'http:///path',
      '//example.com',
      'https://',
      '',
    ];
    for (const url of unsafe) expect(isSafeWebUrl(url)).toBe(false);
  });
});