import { spawn } from 'node:child_process';
import { mkdtemp, rm, readdir } from 'node:fs/promises';
import path from 'node:path';
import { config } from '../config.js';

function run(args: string[]): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = spawn(config.ytdlpPath, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));
    child.on('error', reject);
    child.on('close', (code) =>
      code === 0
        ? resolve({ stdout, stderr })
        : reject(new Error(`yt-dlp exited ${code}: ${stderr.trim()}`)),
    );
  });
}

// FR-003: duration probe is metadata only (`-J` dumps info, no media download).
export async function probeDuration(url: string): Promise<number | null> {
  const { stdout } = await run(['--no-playlist', '-J', url]);
  const info = JSON.parse(stdout) as { duration?: number };
  return typeof info.duration === 'number' && info.duration > 0 ? Math.round(info.duration) : null;
}

// FR-010: audio lives only in a per-job temp dir, deleted by the caller's finally.
export async function downloadAudio(url: string): Promise<{ filePath: string; dir: string }> {
  const dir = await mkdtemp(path.join(config.tempDir, 'vt-'));
  try {
    await run([
      '--no-playlist',
      '-f',
      'bestaudio',
      '-x',
      '-o',
      path.join(dir, 'audio.%(ext)s'),
      url,
    ]);
    const files = await readdir(dir);
    if (files.length === 0) throw new Error('yt-dlp produced no audio file');
    return { filePath: path.join(dir, files[0]), dir };
  } catch (err) {
    await rm(dir, { recursive: true, force: true });
    throw err;
  }
}
