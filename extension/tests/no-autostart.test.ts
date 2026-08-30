import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createSigninController } from '../src/pages/signin.js';

vi.mock('../src/shared/start.js', () => ({ startJobForVideo: vi.fn() }));

import { startJobForVideo } from '../src/shared/start.js';

function makeSupabase() {
  return {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resend: vi.fn(),
      resetPasswordForEmail: vi.fn(),
    },
  };
}

function makeView() {
  return {
    showError: vi.fn(),
    showInboxState: vi.fn(),
    showResetSentState: vi.fn(),
    switchToSignInMode: vi.fn(),
    navigate: vi.fn(),
  };
}

let storage: { get: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };

beforeEach(() => {
  vi.clearAllMocks();
  storage = { get: vi.fn().mockResolvedValue({}), remove: vi.fn() };
  vi.stubGlobal('chrome', {
    storage: { local: { get: storage.get, set: vi.fn(), remove: storage.remove } },
  });
});

// FR-007 / SC-005 (contracts/auth.md § Explicit Transcribe): after sign-in no
// job starts automatically — pendingVideo is preserved for the explicit click.
describe('no auto-start after sign-in', () => {
  it('sign-in with pendingVideo navigates to the job view without startJobForVideo', async () => {
    const supabase = makeSupabase();
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: 't', refresh_token: 'r' } },
      error: null,
    });
    storage.get.mockResolvedValue({
      pendingVideo: { sourceUrl: 'https://youtu.be/abc123', durationSeconds: 60 },
    });
    const view = makeView();
    const ctrl = createSigninController({ supabase: supabase as never, view: view as never });

    await ctrl.signIn('a@b.com', 'password123');

    expect(startJobForVideo).not.toHaveBeenCalled();
    expect(view.navigate).toHaveBeenCalledWith('job.html');
    // Context preserved for the job page's explicit Transcribe button.
    expect(storage.remove).not.toHaveBeenCalled();
  });

  it('sign-in without pendingVideo goes to history', async () => {
    const supabase = makeSupabase();
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: { access_token: 't', refresh_token: 'r' } },
      error: null,
    });
    const view = makeView();
    const ctrl = createSigninController({ supabase: supabase as never, view: view as never });

    await ctrl.signIn('a@b.com', 'password123');

    expect(startJobForVideo).not.toHaveBeenCalled();
    expect(view.navigate).toHaveBeenCalledWith('history.html');
  });

  it('sign-in failure shows the error and starts nothing', async () => {
    const supabase = makeSupabase();
    supabase.auth.signInWithPassword.mockResolvedValue({
      data: { session: null },
      error: { message: 'Invalid login credentials' },
    });
    const view = makeView();
    const ctrl = createSigninController({ supabase: supabase as never, view: view as never });

    await ctrl.signIn('a@b.com', 'wrong');

    expect(startJobForVideo).not.toHaveBeenCalled();
    expect(view.showError).toHaveBeenCalledWith('Invalid login credentials');
    expect(view.navigate).not.toHaveBeenCalled();
  });
});