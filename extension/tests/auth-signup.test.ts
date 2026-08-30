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

let storage: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn>; remove: ReturnType<typeof vi.fn> };

beforeEach(() => {
  storage = { get: vi.fn().mockResolvedValue({}), set: vi.fn(), remove: vi.fn() };
  vi.stubGlobal('chrome', { storage: { local: storage } });
});

// FR-001/FR-002 create-account flow (contracts/auth.md § Create account).
describe('create account', () => {
  it('signUp with redirect to the backend confirm page; no session -> inbox guidance, no token stored', async () => {
    const supabase = makeSupabase({
      signUp: vi.fn().mockResolvedValue({
        data: { user: { id: 'u1', email: 'a@b.com' }, session: null },
        error: null,
      }),
    });
    const view = makeView();
    const ctrl = createSigninController({ supabase: supabase as never, view: view as never });

    await ctrl.createAccount('a@b.com', 'password123');

    expect(supabase.auth.signUp).toHaveBeenCalledWith({
      email: 'a@b.com',
      password: 'password123',
      options: { emailRedirectTo: CONFIG.BACKEND_URL + '/auth/confirm' },
    });
    expect(view.showInboxState).toHaveBeenCalledTimes(1);
    expect(view.navigate).not.toHaveBeenCalled();
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('resend calls supabase.auth.resend({ type: signup, ... }) with the same redirect', async () => {
    const supabase = makeSupabase({
      resend: vi.fn().mockResolvedValue({ data: {}, error: null }),
    });
    const view = makeView();
    const ctrl = createSigninController({ supabase: supabase as never, view: view as never });

    await ctrl.resendConfirmation('a@b.com');

    expect(supabase.auth.resend).toHaveBeenCalledWith({
      type: 'signup',
      email: 'a@b.com',
      options: { emailRedirectTo: CONFIG.BACKEND_URL + '/auth/confirm' },
    });
    expect(view.showInboxState).toHaveBeenCalledTimes(1);
  });

  it('UserAlreadyExists -> "Email already registered — sign in instead" and switch to sign-in mode', async () => {
    const supabase = makeSupabase({
      signUp: vi.fn().mockResolvedValue({
        data: { user: null, session: null },
        error: { message: 'User already registered', code: 'user_already_exists' },
      }),
    });
    const view = makeView();
    const ctrl = createSigninController({ supabase: supabase as never, view: view as never });

    await ctrl.createAccount('a@b.com', 'password123');

    expect(view.showError).toHaveBeenCalledWith('Email already registered — sign in instead');
    expect(view.switchToSignInMode).toHaveBeenCalledTimes(1);
    expect(storage.set).not.toHaveBeenCalled();
  });

  it('network failure -> clear error, retry allowed', async () => {
    const supabase = makeSupabase({
      signUp: vi
        .fn()
        .mockResolvedValueOnce({
          data: { user: null, session: null },
          error: { message: 'Network error', code: undefined },
        })
        .mockResolvedValueOnce({
          data: { user: { id: 'u1' }, session: null },
          error: null,
        }),
    });
    const view = makeView();
    const ctrl = createSigninController({ supabase: supabase as never, view: view as never });

    await ctrl.createAccount('a@b.com', 'password123');
    expect(view.showError).toHaveBeenCalledWith('Network error');

    await ctrl.createAccount('a@b.com', 'password123');
    expect(supabase.auth.signUp).toHaveBeenCalledTimes(2);
    expect(view.showInboxState).toHaveBeenCalledTimes(1);
  });
});