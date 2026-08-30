// Job page. Modes:
// - default: poll GET /api/jobs/{id} every ~3 s (research #8), render status;
//   fully reconstructible from that endpoint alone, so tab close/reopen is
//   safe at any state (FR-012 / US4).
// - view=transcript: render a stored transcript from GET /api/transcripts/{id}
//   (US2-AC1, ui.md action flow step 4).
// - pendingVideo + no job id: explicit Transcribe start (FR-007/SC-005) — no
//   job is created without this click.
// - unverified user (getUser email_confirmed_at null or 403 email_not_verified
//   on retry): verification guidance + resend (FR-004, contracts/auth.md).
import { createClient } from '@supabase/supabase-js';
import { CONFIG } from '../config.js';
import { apiFetch } from '../background/api.js';
import { splitIntoLines } from '../shared/reading-layout.js';
import { isSafeWebUrl } from '../shared/actions.js';
import { getToken } from '../shared/session.js';
import { startJobForVideo } from '../shared/start.js';

const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

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
const verifyResendBtn = document.getElementById('verify-resend') as HTMLButtonElement;
const signinLink = document.getElementById('signin-link') as HTMLAnchorElement;
const startBox = document.getElementById('start-box') as HTMLElement;
const startMessageEl = document.getElementById('start-message') as HTMLElement;
const startBtn = document.getElementById('start-transcribe') as HTMLButtonElement;
const actionsRow = document.getElementById('transcript-actions') as HTMLElement;
const copyBtn = document.getElementById('copy-transcript') as HTMLButtonElement;
const sourceLink = document.getElementById('source-link') as HTMLAnchorElement;
const copyFeedback = document.getElementById('copy-feedback') as HTMLElement;

let userEmail: string | null = null;
// Raw stored transcript text (contracts/actions.md §1): copy payload is this
// string, never contentEl.textContent — 003 layout line breaks must not leak.
let currentContent = '';
let feedbackTimer: ReturnType<typeof setTimeout> | undefined;

function renderTranscript(content: string, sourceUrl: string | null): void {
  statusEl.hidden = true;
  contentEl.hidden = false;
  actionsRow.hidden = false;
  contentEl.textContent = content.length > 0 ? splitIntoLines(content) : '(No speech detected in this video.)';
  // FR-005: link shown only when a stored source_url exists AND is a safe web URL.
  const safe = sourceUrl !== null && isSafeWebUrl(sourceUrl);
  sourceLink.hidden = !safe;
  if (safe) sourceLink.href = sourceUrl;
}

function renderError(message: string, { retry = false, signIn = false } = {}): void {
  statusEl.hidden = true;
  errorBox.hidden = false;
  errorMessageEl.textContent = message;
  retryBtn.hidden = !retry;
  verifyResendBtn.hidden = true;
  signinLink.hidden = !signIn;
}

// FR-004 guidance: unverified account — inbox + spam, resend, sign-in link.
function renderVerifyGuidance(): void {
  statusEl.hidden = true;
  contentEl.hidden = true;
  errorBox.hidden = false;
  errorMessageEl.textContent = 'Confirm your email to start transcription — check your inbox and spam';
  retryBtn.hidden = true;
  verifyResendBtn.hidden = false;
  signinLink.hidden = false;
  signinLink.href = 'signin.html';
}

// Proactive gate (contracts/auth.md § Verification guidance): same state when
// getUser reports email_confirmed_at null at job-view load.
async function currentUserUnverified(): Promise<boolean> {
  const token = await getToken();
  if (!token) return false;
  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return false;
  userEmail = data.user.email ?? null;
  return data.user.email_confirmed_at == null;
}

// Session expired: prompt sign-in; the job view is preserved for resumption
// (US4 edge case) — signin.html?s next param routes back after sign-in. With
// no job id (pending-video start mode) the resume target is the bare job page,
// which re-offers the explicit Transcribe click.
function showSignInPrompt(): void {
  const resume = jobId
    ? view === 'transcript'
      ? `job.html?job=${jobId}&view=transcript`
      : `job.html?job=${jobId}`
    : 'job.html';
  signinLink.href = `signin.html?next=${encodeURIComponent(resume)}`;
  renderError('Your session expired. Sign in again to continue.', { signIn: true });
}

async function loadTranscript(id: string): Promise<void> {
  const { status, body } = await apiFetch<{
    transcript?: { content: string; source_url: string | null };
    error?: { message: string };
  }>(`/api/transcripts/${id}`);
  if (status === 200 && body.transcript) {
    currentContent = body.transcript.content;
    renderTranscript(currentContent, body.transcript.source_url ?? null);
  } else if (status === 401) showSignInPrompt();
  else renderError(body.error?.message ?? 'Could not load transcript.');
}

// FR-003: every click = fresh writeText + exactly one visible, temporary,
// AT-announced outcome (role="status"); failure is never silent.
copyBtn.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(currentContent);
    copyFeedback.textContent = 'Copied — transcript text is on your clipboard.';
  } catch {
    copyFeedback.textContent = 'Copy failed — your browser blocked clipboard access. Try again.';
  }
  if (feedbackTimer) clearTimeout(feedbackTimer);
  feedbackTimer = setTimeout(() => {
    copyFeedback.textContent = '';
  }, 4000);
});

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function pollJob(id: string): Promise<void> {
  while (true) {
    const { status, body } = await apiFetch<{
      job?: { status: string; error_reason: string | null; transcript_id: string | null };
      error?: { code: string; message: string };
    }>(`/api/jobs/${id}`);

    if (status === 401) {
      showSignInPrompt();
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
    showSignInPrompt();
    return;
  }
  if (status === 403 && body.error?.code === 'email_not_verified') {
    renderVerifyGuidance();
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

verifyResendBtn.addEventListener('click', async () => {
  if (!userEmail) return;
  verifyResendBtn.disabled = true;
  const { error } = await supabase.auth.resend({
    type: 'signup',
    email: userEmail,
    options: { emailRedirectTo: CONFIG.BACKEND_URL + '/auth/confirm' },
  });
  verifyResendBtn.disabled = false;
  errorMessageEl.textContent = error
    ? error.message
    : 'Confirmation email sent — check your inbox and spam';
});

async function main(): Promise<void> {
  // FR-007: pendingVideo without a job id -> explicit Transcribe start mode.
  const { pendingVideo } = await chrome.storage.local.get('pendingVideo');

  if (!jobId) {
    if (!pendingVideo) {
      renderError('Missing job id.');
      return;
    }
    if (await currentUserUnverified()) {
      renderVerifyGuidance();
      return;
    }
    startBox.hidden = false;
    startMessageEl.textContent = pendingVideo.sourceUrl;
    startBtn.addEventListener('click', async () => {
      startBtn.disabled = true;
      const result = await startJobForVideo(pendingVideo);
      if (result.page === 'job') {
        // Only a successful job/transcript result consumes the pending video
        // (oracle review fix); any failure keeps it so the flow can restart.
        await chrome.storage.local.remove('pendingVideo');
        location.href = `job.html?job=${result.jobId}${result.view ? '&view=transcript' : ''}`;
        return;
      }
      if (result.code === 'unauthorized') {
        // 401 (the one silent refresh failed): sign-in path; pendingVideo is
        // retained — after sign-in the job page offers Transcribe again.
        showSignInPrompt();
        return;
      }
      if (result.code === 'email_not_verified') {
        // Retained too: after confirming, the user returns and clicks again.
        await currentUserUnverified(); // populate userEmail for the resend button
        renderVerifyGuidance();
        return;
      }
      // 400 / 409: pendingVideo kept; surface the backend error via notice.
      location.href = `notice.html?code=${encodeURIComponent(result.code)}&message=${encodeURIComponent(result.message)}`;
    });
    return;
  }

  if (await currentUserUnverified()) {
    renderVerifyGuidance();
    return;
  }
  if (view === 'transcript') void loadTranscript(jobId);
  else void pollJob(jobId);
}

void main();
