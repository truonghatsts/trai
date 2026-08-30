// Link/verification logic shared by the public auth pages (confirm.ts, reset.ts),
// kept DOM-free so backend tests can exercise the flows with a fake client.
//
// Credentials ride the URL fragment (#token_hash=..&type=..) — never the query
// string — so they are not sent to the server and cannot land in request logs.
// Each page reads the fragment once, then clears it (history.replaceState).
import type { SupabaseClient } from '@supabase/supabase-js';

export const CONFIRM_SUCCESS =
  'Email verified — close this tab and return to the extension.';
export const CONFIRM_INVALID =
  'This confirmation link is no longer valid. Return to the extension and request a fresh confirmation email.';
export const RESET_INVALID =
  'This reset link is no longer valid. Request a fresh reset link from the extension.';
export const RESET_SUCCESS = 'Password updated — sign in with your new password.';

export interface LinkParams {
  tokenHash: string;
  type: string;
}

// Reads token_hash + type from a URL fragment. The email is deliberately absent
// from the link: verifyOtp with a token_hash identifies the account itself.
export function parseLinkFragment(hash: string): LinkParams | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const tokenHash = params.get('token_hash');
  const type = params.get('type');
  return tokenHash && type ? { tokenHash, type } : null;
}

// Signup-confirmation link (template type=signup) → verifyOtp type 'email'.
// Success/failure map to the page messages; the token_hash is single-use, so a
// second call (reused link) errors here.
export async function confirmEmail(
  client: SupabaseClient,
  params: LinkParams,
): Promise<string> {
  const { error } = await client.auth.verifyOtp({
    type: 'email',
    token_hash: params.tokenHash,
  });
  return error ? CONFIRM_INVALID : CONFIRM_SUCCESS;
}

export interface FlowResult {
  ok: boolean;
  message: string;
}

export interface ResetFlow {
  // Consumes the one-time recovery credential. Call exactly once; an invalid or
  // already-used token_hash errors here (FR-005 AC3).
  verify(): Promise<FlowResult>;
  // updateUser with the session from verify(). Retries are safe: the credential
  // is never re-consumed, and GoTrue's error (e.g. weak password) is shown
  // verbatim so the user can correct and resubmit.
  update(password: string): Promise<FlowResult>;
}

export function createResetFlow(client: SupabaseClient, params: LinkParams): ResetFlow {
  let verified = false;
  return {
    async verify() {
      const { error } = await client.auth.verifyOtp({
        type: 'recovery',
        token_hash: params.tokenHash,
      });
      verified = !error;
      return error ? { ok: false, message: RESET_INVALID } : { ok: true, message: '' };
    },
    async update(password) {
      if (!verified) return { ok: false, message: RESET_INVALID };
      const { error } = await client.auth.updateUser({ password });
      return error
        ? { ok: false, message: error.message }
        : { ok: true, message: RESET_SUCCESS };
    },
  };
}