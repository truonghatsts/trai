import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CONFIG } from '../src/config.js';
import { createSigninController } from '../src/pages/signin.js';

function makeSupabase(overrides: Record<string, unknown> = {}) {
  return {
    auth: {
      signInWithPassword: vi.fn(),
      signUp: vi.fn(),
      resend: vi.fn(),
      resetPasswordForEmail: vi.fn(),
      ...overrides,
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

beforeEach(() => {
  vi.stubGlobal('chrome', {
    storage: { local: { get: vi.fn().mockResolvedValue({}), set: vi.fn(), remove: vi.fn() } },
  });
});

// FR-005 forgot-password flow (contracts/auth.md § Forgot password).
describe('forgot password', () => {
  it('submit calls resetPasswordForEmail with redirectTo the backend reset page', async () => {
    const supabase = makeSupabase({
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    });
    const view = makeView();
    const ctrl = createSigninController({ supabase: supabase as never, view: view as never });

    await ctrl.forgotPassword('a@b.com');

    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledWith('a@b.com', {
      redirectTo: CONFIG.BACKEND_URL + '/auth/reset',
    });
    expect(view.showResetSentState).toHaveBeenCalledTimes(1);
  });

  it('unknown address gets the identical neutral message (no enumeration)', async () => {
    const supabase = makeSupabase({
      resetPasswordForEmail: vi.fn().mockResolvedValue({ data: {}, error: null }),
    });
    const view = makeView();
    const ctrl = createSigninController({ supabase: supabase as never, view: view as never });

    await ctrl.forgotPassword('unknown@example.com');
    await ctrl.forgotPassword('known@example.com');

    // Same view transition for both — the message text never differs by address.
    expect(view.showResetSentState).toHaveBeenCalledTimes(2);
    expect(view.showError).not.toHaveBeenCalled();
  });

  it('network failure -> clear error, retry allowed', async () => {
    const supabase = makeSupabase({
      resetPasswordForEmail: vi
        .fn()
        .mockResolvedValueOnce({ data: {}, error: { message: 'Network error' } })
        .mockResolvedValueOnce({ data: {}, error: null }),
    });
    const view = makeView();
    const ctrl = createSigninController({ supabase: supabase as never, view: view as never });

    await ctrl.forgotPassword('a@b.com');
    expect(view.showError).toHaveBeenCalledWith('Network error');

    await ctrl.forgotPassword('a@b.com');
    expect(supabase.auth.resetPasswordForEmail).toHaveBeenCalledTimes(2);
    expect(view.showResetSentState).toHaveBeenCalledTimes(1);
  });
});