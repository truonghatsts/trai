// Sign-in page: sign in / create account / forgot password, plus the
// inbox-guidance state with resend (contracts/auth.md). Flow logic lives in
// createSigninController (DOM-free, unit-tested); the DOM binding below is thin.
// FR-007: after sign-in no job starts automatically — pendingVideo is preserved
// for the explicit Transcribe click on the job page.
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { CONFIG } from '../config.js';
import { setSession } from '../shared/session.js';

export interface SigninView {
  showError(message: string): void;
  // Create-account success with no session: "check your inbox" guidance + resend.
  showInboxState(): void;
  // Forgot-password neutral confirmation (identical for known and unknown
  // addresses — no enumeration, contracts/auth.md § Forgot password).
  showResetSentState(): void;
  switchToSignInMode(): void;
  navigate(url: string): void;
}

export function createSigninController(deps: {
  supabase: SupabaseClient;
  view: SigninView;
}) {
  const { supabase, view } = deps;
  const redirectTo = CONFIG.BACKEND_URL + '/auth/confirm';

  return {
    // FR-007: sign-in never starts a job. pendingVideo is preserved for the
    // job page's explicit Transcribe button; `next` resumes a preserved job
    // view after a failed silent refresh (contracts/auth.md § Session refresh).
    async signIn(email: string, password: string, next: string | null = null): Promise<void> {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        view.showError(error.message);
        return;
      }
      if (!data.session) {
        view.showError('Could not start a session. Try again.');
        return;
      }
      await setSession(data.session);
      const { pendingVideo } = await chrome.storage.local.get('pendingVideo');
      view.navigate(next ?? (pendingVideo ? 'job.html' : 'history.html'));
    },

    async createAccount(email: string, password: string): Promise<void> {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) {
        // Edge case: duplicate email (research #9) -> sign in instead.
        if (
          error.code === 'user_already_exists' ||
          error.message.toLowerCase().includes('already registered')
        ) {
          view.showError('Email already registered — sign in instead');
          view.switchToSignInMode();
        } else {
          view.showError(error.message);
        }
        return;
      }
      // Confirmation required (FR-002): no session -> inbox guidance, never
      // treated as signed in, nothing stored (contracts/auth.md step 3).
      if (!data.session) {
        view.showInboxState();
        return;
      }
      await setSession(data.session);
      view.navigate('history.html');
    },

    // FR-004: fresh confirmation email; a pending confirmation stays valid.
    async resendConfirmation(email: string): Promise<void> {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
        options: { emailRedirectTo: redirectTo },
      });
      if (error) view.showError(error.message);
      else view.showInboxState();
    },

    async forgotPassword(email: string): Promise<void> {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: CONFIG.BACKEND_URL + '/auth/reset',
      });
      // GoTrue /recover always succeeds for unknown addresses too — one
      // neutral message either way (edge case: no address enumeration).
      if (error) view.showError(error.message);
      else view.showResetSentState();
    },
  };
}

// --- DOM binding -----------------------------------------------------------

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

function validate(email: string, password: string, confirm?: string): string | null {
  if (!EMAIL_RE.test(email)) return 'Enter a valid email address.';
  if (password.length < 8) return 'Password must be at least 8 characters.';
  if (confirm !== undefined && password !== confirm) return 'Passwords do not match.';
  return null;
}

function bindDom(): void {
  const supabase = createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  const errorEl = document.getElementById('error') as HTMLElement;
  const signinMode = document.getElementById('signin-mode') as HTMLElement;
  const createMode = document.getElementById('create-mode') as HTMLElement;
  const forgotMode = document.getElementById('forgot-mode') as HTMLElement;
  const inboxState = document.getElementById('inbox-state') as HTMLElement;

  const emailEl = document.getElementById('email') as HTMLInputElement;
  const passwordEl = document.getElementById('password') as HTMLInputElement;
  const createEmailEl = document.getElementById('create-email') as HTMLInputElement;
  const createPasswordEl = document.getElementById('create-password') as HTMLInputElement;
  const createPassword2El = document.getElementById('create-password2') as HTMLInputElement;
  const forgotEmailEl = document.getElementById('forgot-email') as HTMLInputElement;

  let createdEmail = '';

  const ctrl = createSigninController({
    supabase,
    view: {
      showError: (message) => {
        errorEl.textContent = message;
      },
      showInboxState: () => {
        inboxState.hidden = false;
        errorEl.textContent = '';
      },
      showResetSentState: () => {
        errorEl.textContent = 'If that address has an account, a reset link is on its way.';
      },
      switchToSignInMode: () => {
        createMode.hidden = true;
        signinMode.hidden = false;
      },
      navigate: (url) => {
        location.href = url;
      },
    },
  });

  const showMode = (mode: 'signin' | 'create' | 'forgot') => {
    signinMode.hidden = mode !== 'signin';
    createMode.hidden = mode !== 'create';
    forgotMode.hidden = mode !== 'forgot';
    errorEl.textContent = '';
  };

  (document.getElementById('show-create') as HTMLElement).addEventListener('click', () =>
    showMode('create'),
  );
  (document.getElementById('show-forgot') as HTMLElement).addEventListener('click', () =>
    showMode('forgot'),
  );
  for (const id of ['back-to-signin', 'back-to-signin-forgot']) {
    (document.getElementById(id) as HTMLElement).addEventListener('click', () =>
      showMode('signin'),
    );
  }

  (document.getElementById('signin-form') as HTMLFormElement).addEventListener(
    'submit',
    async (e) => {
      e.preventDefault();
      errorEl.textContent = '';
      const next = new URLSearchParams(location.search).get('next');
      await ctrl.signIn(emailEl.value, passwordEl.value, next);
    },
  );

  (document.getElementById('create-form') as HTMLFormElement).addEventListener(
    'submit',
    async (e) => {
      e.preventDefault();
      const invalid = validate(createEmailEl.value, createPasswordEl.value, createPassword2El.value);
      if (invalid) {
        errorEl.textContent = invalid;
        return;
      }
      createdEmail = createEmailEl.value;
      await ctrl.createAccount(createdEmail, createPasswordEl.value);
    },
  );

  (document.getElementById('resend-confirmation') as HTMLElement).addEventListener(
    'click',
    () => void ctrl.resendConfirmation(createdEmail),
  );

  (document.getElementById('forgot-form') as HTMLFormElement).addEventListener(
    'submit',
    async (e) => {
      e.preventDefault();
      const invalid = validate(forgotEmailEl.value, 'x'.repeat(8));
      if (invalid) {
        errorEl.textContent = invalid;
        return;
      }
      await ctrl.forgotPassword(forgotEmailEl.value);
    },
  );
}

if (typeof document !== 'undefined') bindDom();