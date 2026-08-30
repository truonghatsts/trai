import { apiFetch } from '../background/api.js';

export interface VideoInfo {
  sourceUrl: string;
  durationSeconds: number | null;
}

export type StartJobResult =
  | { page: 'job'; jobId: string; view?: 'transcript' }
  | { page: 'notice'; code: string; message: string };

// POST /api/jobs with US2 lookup semantics (contracts/api.md). Shared by the
// background action handler and the sign-in page's pending-action continuation.
export async function startJobForVideo(video: VideoInfo): Promise<StartJobResult> {
  const { status, body } = await apiFetch<{
    kind?: string;
    job?: { id: string };
    transcript?: { id: string };
    error?: { code: string; message: string };
  }>('/api/jobs', {
    method: 'POST',
    body: { source_url: video.sourceUrl, duration_seconds: video.durationSeconds },
  });

  if (status === 201 || (status === 200 && body.kind === 'job')) {
    if (body.job) return { page: 'job', jobId: body.job.id };
  }
  if (status === 200 && body.kind === 'transcript' && body.transcript) {
    return { page: 'job', jobId: body.transcript.id, view: 'transcript' }; // US2-AC1
  }
  const code = body.error?.code ?? 'unknown';
  const message = body.error?.message ?? 'Something went wrong.';
  return { page: 'notice', code, message };
}
