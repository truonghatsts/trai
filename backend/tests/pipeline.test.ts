import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs/promises';

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof fs>();
  return { ...actual, rm: vi.fn(actual.rm) };
});
vi.mock('../src/db/jobs.js', () => ({
  getJobById: vi.fn(),
  updateJob: vi.fn(),
}));
vi.mock('../src/db/transcripts.js', () => ({
  createTranscript: vi.fn(),
}));
vi.mock('../src/jobs/ytdlp.js', () => ({
  probeDuration: vi.fn(),
  downloadAudio: vi.fn(),
}));
vi.mock('../src/jobs/stt.js', () => ({
  transcribe: vi.fn(),
}));

import { runJob } from '../src/jobs/pipeline.js';
import { getJobById, updateJob } from '../src/db/jobs.js';
import { createTranscript } from '../src/db/transcripts.js';
import { downloadAudio, probeDuration } from '../src/jobs/ytdlp.js';
import { transcribe } from '../src/jobs/stt.js';

const mocked = {
  getJobById: vi.mocked(getJobById),
  updateJob: vi.mocked(updateJob),
  createTranscript: vi.mocked(createTranscript),
  downloadAudio: vi.mocked(downloadAudio),
  probeDuration: vi.mocked(probeDuration),
  transcribe: vi.mocked(transcribe),
};

const job = {
  id: 'job-1',
  user_id: 'user-1',
  source_url: 'https://example.com/video',
  status: 'queued',
  duration_seconds: 60,
  created_at: '2026-01-01T00:00:00Z',
  error_reason: null,
  retry_count: 0,
  transcript_id: null,
};

beforeEach(() => {
  vi.clearAllMocks();
  mocked.getJobById.mockResolvedValue(job);
  mocked.updateJob.mockImplementation(async (_id, patch) => ({ ...job, ...patch }) as never);
  mocked.createTranscript.mockResolvedValue({
    id: 't-1',
    user_id: 'user-1',
    job_id: 'job-1',
    source_url: 'https://example.com/video',
    content: 'hello world',
    completed_at: '2026-01-01T00:00:01Z',
  });
  mocked.downloadAudio.mockResolvedValue({ filePath: '/tmp/vt-x/audio.mp3', dir: '/tmp/vt-x' });
  mocked.probeDuration.mockResolvedValue(60);
  mocked.transcribe.mockResolvedValue('hello world');
});

describe('runJob', () => {
  it('runs probe -> download -> transcribe -> ready, deletes audio in finally (FR-010)', async () => {
    const rmSpy = vi.spyOn(fs, 'rm').mockResolvedValue(undefined);
    await runJob('job-1');

    expect(mocked.updateJob).toHaveBeenCalledWith('job-1', { status: 'downloading' });
    expect(mocked.updateJob).toHaveBeenCalledWith('job-1', { status: 'transcribing' });
    expect(mocked.updateJob).toHaveBeenCalledWith('job-1', {
      status: 'ready',
      transcript_id: 't-1',
    });
    expect(mocked.createTranscript).toHaveBeenCalledWith({
      userId: 'user-1',
      jobId: 'job-1',
      sourceUrl: 'https://example.com/video',
      content: 'hello world',
    });
    expect(rmSpy).toHaveBeenCalledWith('/tmp/vt-x', { recursive: true, force: true });
    rmSpy.mockRestore();
  });

  it('probes duration when the page did not provide it and rejects >5 min before download (FR-003)', async () => {
    mocked.getJobById.mockResolvedValue({ ...job, duration_seconds: null });
    mocked.probeDuration.mockResolvedValue(400);
    await runJob('job-1');

    expect(mocked.downloadAudio).not.toHaveBeenCalled();
    expect(mocked.updateJob).toHaveBeenCalledWith('job-1', {
      status: 'error',
      error_reason: 'This video is longer than 5 minutes',
    });
  });

  it('does not resurrect a job deleted while processing (US3 edge case)', async () => {
    mocked.getJobById.mockResolvedValueOnce(job).mockResolvedValueOnce(null); // gone by finalize time
    await runJob('job-1');

    expect(mocked.createTranscript).not.toHaveBeenCalled();
    expect(mocked.updateJob).not.toHaveBeenCalledWith('job-1', {
      status: 'ready',
      transcript_id: expect.anything(),
    });
  });

  it('marks the job error with a best-effort reason on pipeline failure (FR-013)', async () => {
    mocked.downloadAudio.mockRejectedValue(new Error('The source is not available'));
    await runJob('job-1');

    expect(mocked.updateJob).toHaveBeenCalledWith('job-1', {
      status: 'error',
      error_reason: 'The source is not available',
    });
  });

  it('ignores jobs already terminal (deleted/cancelled)', async () => {
    mocked.getJobById.mockResolvedValue({ ...job, status: 'error' });
    await runJob('job-1');
    expect(mocked.downloadAudio).not.toHaveBeenCalled();
    expect(mocked.updateJob).not.toHaveBeenCalled();
  });
});
