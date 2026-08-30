import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Explicit Transcribe start on the job page (oracle review fix): pendingVideo
// is retained until a successful job/transcript result — a 401 keeps it and
// shows the sign-in path, email_not_verified keeps it and shows verification
// guidance, so the flow can restart after auth.
const mocks = vi.hoisted(() => {
  const getUser = vi.fn();
  const resend = vi.fn();
  return {
    startJobForVideo: vi.fn(),
    getUser,
    resend,
    createClient: vi.fn(() => ({ auth: { getUser, resend } })),
  };
});

vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('../src/shared/start.js', () => ({ startJobForVideo: mocks.startJobForVideo }));

type El = {
  hidden: boolean;
  textContent: string;
  href: string;
  disabled: boolean;
  addEventListener: ReturnType<typeof vi.fn>;
  listeners: Record<string, (e?: unknown) => void | Promise<void>>;
};

function makeEl(): El {
  const listeners: Record<string, (e?: unknown) => void | Promise<void>> = {};
  return {
    hidden: false,
    textContent: '',
    href: '',
    disabled: false,
    addEventListener: vi.fn((type: string, cb: (e?: unknown) => void | Promise<void>) => {
      listeners[type] = cb;
    }),
    listeners,
  };
}

let els: Record<string, El>;
let storage: {
  get: ReturnType<typeof vi.fn>;
  set: ReturnType<typeof vi.fn>;
  remove: ReturnType<typeof vi.fn>;
};
let locationMock: { search: string; href: string };

const VIDEO = { sourceUrl: 'https://youtu.be/abc123', durationSeconds: 60 };

beforeEach(() => {
  vi.clearAllMocks();
  vi.resetModules();
  els = {
    status: makeEl(),
    content: makeEl(),
    'error-box': makeEl(),
    'error-message': makeEl(),
    retry: makeEl(),
    'verify-resend': makeEl(),
    'signin-link': makeEl(),
    'start-box': makeEl(),
    'start-message': makeEl(),
    'start-transcribe': makeEl(),
    'transcript-actions': makeEl(),
    'copy-transcript': makeEl(),
    'source-link': makeEl(),
    'copy-feedback': makeEl(),
  };
  vi.stubGlobal('document', { getElementById: vi.fn((id: string) => els[id] ?? null) });
  locationMock = { search: '', href: '' };
  vi.stubGlobal('location', locationMock);
  storage = {
    get: vi.fn(async (key: string) =>
      key === 'pendingVideo' ? { pendingVideo: VIDEO } : key === 'vtToken' ? { vtToken: 'tok' } : {},
    ),
    set: vi.fn().mockResolvedValue(undefined),
    remove: vi.fn().mockResolvedValue(undefined),
  };
  vi.stubGlobal('chrome', { storage: { local: storage }, runtime: { sendMessage: vi.fn() } });
  mocks.getUser.mockResolvedValue({
    data: { user: { email: 'a@b.com', email_confirmed_at: '2026-01-01' } },
    error: null,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// Load the page (pendingVideo + no job id -> explicit Transcribe start mode)
// and wait for the start box to render.
async function loadStartMode(): Promise<void> {
  await import('../src/pages/job.js');
  await vi.waitFor(() => expect(els['start-box'].hidden).toBe(false));
}

describe('explicit Transcribe start retains pendingVideo on failure', () => {
  it('success consumes the pending video and opens the job view', async () => {
    mocks.startJobForVideo.mockResolvedValue({ page: 'job', jobId: 'j1' });
    await loadStartMode();

    await els['start-transcribe'].listeners.click!();

    expect(storage.remove).toHaveBeenCalledWith('pendingVideo');
    expect(locationMock.href).toBe('job.html?job=j1');
  });

  it('401 after start: pendingVideo retained, sign-in prompt shown with a job-page resume link', async () => {
    mocks.startJobForVideo.mockResolvedValue({
      page: 'notice',
      code: 'unauthorized',
      message: 'You must sign in first.',
    });
    await loadStartMode();

    await els['start-transcribe'].listeners.click!();

    expect(storage.remove).not.toHaveBeenCalled(); // context retained
    expect(els['signin-link'].hidden).toBe(false);
    expect(els['signin-link'].href).toBe('signin.html?next=job.html');
    expect(els['error-message'].textContent).toBe('Your session expired. Sign in again to continue.');
  });

  it('email_not_verified after start: pendingVideo retained, verification guidance shown', async () => {
    mocks.startJobForVideo.mockResolvedValue({
      page: 'notice',
      code: 'email_not_verified',
      message: 'Confirm your email to start transcription.',
    });
    await loadStartMode();

    await els['start-transcribe'].listeners.click!();

    expect(storage.remove).not.toHaveBeenCalled(); // context retained
    expect(els['verify-resend'].hidden).toBe(false);
    expect(els['error-message'].textContent).toContain('Confirm your email');
    // userEmail populated so the resend button can act.
    expect(mocks.getUser).toHaveBeenCalled();
  });

  it('backend validation error: pendingVideo retained, notice page shows the error', async () => {
    mocks.startJobForVideo.mockResolvedValue({
      page: 'notice',
      code: 'duration_too_long',
      message: 'This video is longer than 5 minutes.',
    });
    await loadStartMode();

    await els['start-transcribe'].listeners.click!();

    expect(storage.remove).not.toHaveBeenCalled();
    expect(locationMock.href).toBe(
      'notice.html?code=duration_too_long&message=This%20video%20is%20longer%20than%205%20minutes.',
    );
  });
});