import { describe, it, expect } from 'vitest';
import { parseSourceUrl } from '../src/api/routes/jobs.js';

describe('parseSourceUrl', () => {
  it('accepts a YouTube watch URL unchanged (exact-URL semantics)', () => {
    const url = 'https://www.youtube.com/watch?v=abc123&feature=youtu.be';
    const result = parseSourceUrl(url);
    expect('url' in result).toBe(true);
    if ('url' in result) expect(result.url.href).toBe(url);
  });

  it('accepts a bare-path URL like youtu.be', () => {
    const result = parseSourceUrl('https://youtu.be/abc123');
    expect('url' in result).toBe(true);
  });

  it('rejects malformed URLs as invalid_url', () => {
    expect(parseSourceUrl('not a url')).toEqual({ code: 'invalid_url' });
    expect(parseSourceUrl('')).toEqual({ code: 'invalid_url' });
  });

  it('rejects non-http schemes as invalid_url', () => {
    expect(parseSourceUrl('file:///tmp/video.mp4')).toEqual({ code: 'invalid_url' });
    expect(parseSourceUrl('javascript:alert(1)')).toEqual({ code: 'invalid_url' });
  });

  it('rejects a bare domain as not_a_video_page', () => {
    expect(parseSourceUrl('https://example.com')).toEqual({ code: 'not_a_video_page' });
  });
});
