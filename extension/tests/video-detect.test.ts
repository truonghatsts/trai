import { describe, it, expect } from 'vitest';
import { parseIso8601Duration, detectVideoPage } from '../src/content/video-detect.js';

describe('parseIso8601Duration', () => {
  it('parses YouTube meta durations', () => {
    expect(parseIso8601Duration('PT4M7S')).toBe(247);
    expect(parseIso8601Duration('PT1H2M3S')).toBe(3723);
    expect(parseIso8601Duration('PT0S')).toBe(0);
    expect(parseIso8601Duration('PT1.5S')).toBe(2);
  });

  it('returns null for garbage', () => {
    expect(parseIso8601Duration('garbage')).toBeNull();
    expect(parseIso8601Duration('')).toBeNull();
  });
});

describe('detectVideoPage', () => {
  const doc = { querySelector: () => null } as unknown as Document;

  it('detects a YouTube watch page with exact URL', () => {
    const url = new URL('https://www.youtube.com/watch?v=abc123&feature=share');
    expect(detectVideoPage(url, doc)).toEqual({ sourceUrl: url.href, durationSeconds: null });
  });

  it('reads duration from page metadata when present', () => {
    const meta = { getAttribute: () => 'PT4M7S' };
    const withMeta = { querySelector: () => meta } as unknown as Document;
    const url = new URL('https://www.youtube.com/watch?v=abc123');
    expect(detectVideoPage(url, withMeta)).toEqual({ sourceUrl: url.href, durationSeconds: 247 });
  });

  it('rejects non-watch YouTube pages (channel/home)', () => {
    expect(detectVideoPage(new URL('https://www.youtube.com/@somechannel'), doc)).toBeNull();
  });

  it('accepts youtu.be short links', () => {
    const url = new URL('https://youtu.be/abc123?t=10');
    expect(detectVideoPage(url, doc)).toEqual({ sourceUrl: url.href, durationSeconds: null });
  });

  it('returns null for a plain website', () => {
    expect(detectVideoPage(new URL('https://example.com/article'), doc)).toBeNull();
  });
});
