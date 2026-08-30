import { rm } from 'node:fs/promises';
import { getJobById, updateJob } from '../db/jobs.js';
import { createTranscript } from '../db/transcripts.js';
import { probeDuration, downloadAudio } from './ytdlp.js';
import { transcribe } from './stt.js';
import { config } from '../config.js';

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

// FR-003 also applies to jobs created without a page-provided duration: the
// probe happens before any download; a too-long video fails before media moves.
async function resolveDuration(
  jobId: string,
  sourceUrl: string,
  known: number | null,
): Promise<number> {
  if (known != null) return known;
  const probed = await probeDuration(sourceUrl);
  if (probed == null) throw new Error('Could not determine video duration');
  if (probed > config.maxDurationSeconds) throw new Error('This video is longer than 5 minutes');
  await updateJob(jobId, { duration_seconds: probed });
  return probed;
}

// A deleted/cancelled job must never resurrect (US3-AC3 edge case): finalize
// only when the row still exists and is not already terminal.
async function finalize(
  jobId: string,
  userId: string,
  sourceUrl: string,
  content: string,
): Promise<void> {
  const current = await getJobById(jobId);
  if (!current || current.status === 'error' || current.status === 'ready') return;
  const transcript = await createTranscript({ userId, jobId, sourceUrl, content });
  await updateJob(jobId, { status: 'ready', transcript_id: transcript.id });
}

export async function runJob(jobId: string): Promise<void> {
  const job = await getJobById(jobId);
  if (!job || job.status === 'ready' || job.status === 'error') return;

  try {
    await resolveDuration(jobId, job.source_url, job.duration_seconds);
    await updateJob(jobId, { status: 'downloading' });

    const { filePath, dir } = await downloadAudio(job.source_url);
    try {
      await updateJob(jobId, { status: 'transcribing' });
      const content = await transcribe(filePath);
      // FR-010: transient audio deleted immediately after STT returns, on
      // every path (success or failure) — nothing ever reaches storage.
      await finalize(jobId, job.user_id, job.source_url, content);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  } catch (err) {
    // FR-013: best-effort error reason; retry available (FR-006).
    await updateJob(jobId, { status: 'error', error_reason: errorMessage(err) });
  }
}
