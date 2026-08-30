// Job page. Two modes:
// - default: poll GET /api/jobs/{id} every ~3 s (research #8), render status;
//   fully reconstructible from that endpoint alone, so tab close/reopen is
//   safe at any state (FR-012 / US4).
// - view=transcript: render a stored transcript from GET /api/transcripts/{id}
//   (US2-AC1, ui.md action flow step 4).
import { apiFetch } from '../background/api.js';

const STATUS_TEXT: Record<string, string> = {
  queued: 'Queued — waiting to start',
  downloading: 'Downloading audio…',
  transcribing: 'Transcribing…',
};

const params = new URLSearchParams(location.search);
const jobId = params.get('job');
const view = params.get('view');

const statusEl = document.getElementById('status') as HTMLElement;
const contentEl = document.getElementById('content') as HTMLElement;
const errorBox = document.getElementById('error-box') as HTMLElement;
const errorMessageEl = document.getElementById('error-message') as HTMLElement;
const retryBtn = document.getElementById('retry') as HTMLButtonElement;
const signinLink = document.getElementById('signin-link') as HTMLAnchorElement;

function renderTranscript(content: string): void {
  statusEl.hidden = true;
  contentEl.hidden = false;
  contentEl.textContent = content.length > 0 ? content : '(No speech detected in this video.)';
}

function renderError(message: string, { retry = false, signIn = false } = {}): void {
  statusEl.hidden = true;
  errorBox.hidden = false;
  errorMessageEl.textContent = message;
  retryBtn.hidden = !retry;
  signinLink.hidden = !signIn;
}

async function loadTranscript(id: string): Promise<void> {
  const { status, body } = await apiFetch<{
    transcript?: { content: string };
    error?: { message: string };
  }>(`/api/transcripts/${id}`);
  if (status === 200 && body.transcript) renderTranscript(body.transcript.content);
  else renderError(body.error?.message ?? 'Could not load transcript.');
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pollJob(id: string): Promise<void> {
  while (true) {
    const { status, body } = await apiFetch<{
      job?: { status: string; error_reason: string | null; transcript_id: string | null };
      error?: { code: string; message: string };
    }>(`/api/jobs/${id}`);

    if (status === 401) {
      renderError('Your session expired. Sign in again to continue.', { signIn: true });
      return;
    }
    if (status === 404 || !body.job) {
      renderError(body.error?.message ?? 'Job not found.');
      return;
    }

    const job = body.job;
    if (job.status === 'ready' && job.transcript_id) {
      await loadTranscript(job.transcript_id);
      return;
    }
    if (job.status === 'error') {
      renderError(job.error_reason ?? 'Transcription failed.', { retry: true });
      return;
    }
    statusEl.textContent = STATUS_TEXT[job.status] ?? job.status;
    await sleep(3000);
  }
}

retryBtn.addEventListener('click', async () => {
  retryBtn.disabled = true;
  const { status, body } = await apiFetch<{ error?: { code: string; message: string } }>(
    `/api/jobs/${jobId}/retry`,
    { method: 'POST' },
  );
  if (status === 401) {
    renderError('Your session expired. Sign in again to continue.', { signIn: true });
    return;
  }
  if (status === 200) {
    statusEl.hidden = false;
    errorBox.hidden = true;
    statusEl.textContent = 'Queued — waiting to start';
    void pollJob(jobId!);
    return;
  }
  retryBtn.disabled = false;
  errorMessageEl.textContent = body.error?.message ?? 'Retry failed.';
});

if (!jobId) {
  renderError('Missing job id.');
} else if (view === 'transcript') {
  void loadTranscript(jobId);
} else {
  void pollJob(jobId);
}
