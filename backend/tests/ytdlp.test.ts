import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'node:events';

// FR-010 regression: downloadAudio must always force MP3 extraction so the
// file matches the `audio/mpeg` MIME the STT request declares (stt.ts).
const { spawnMock } = vi.hoisted(() => ({ spawnMock: vi.fn() }));
vi.mock('node:child_process', () => ({ spawn: spawnMock }));
vi.mock('node:fs/promises', () => ({
  mkdtemp: vi.fn().mockResolvedValue('/tmp/vt-test'),
  readdir: vi.fn().mockResolvedValue(['audio.mp3']),
  rm: vi.fn().mockResolvedValue(undefined),
}));

import { downloadAudio } from '../src/jobs/ytdlp.js';

beforeEach(() => {
  spawnMock.mockReset();
  const stdout = new EventEmitter();
  const stderr = new EventEmitter();
  spawnMock.mockReturnValue({
    stdout,
    stderr,
    on: (ev: string, cb: (code: number) => void) => {
      if (ev === 'close') process.nextTick(() => cb(0));
      return undefined;
    },
  });
});

describe('downloadAudio', () => {
  it('passes yt-dlp args forcing MP3 audio format', async () => {
    await downloadAudio('https://example.com/video');
    const args = spawnMock.mock.calls[0][1] as string[];
    expect(args).toContain('--audio-format');
    expect(args[args.indexOf('--audio-format') + 1]).toBe('mp3');
  });
});