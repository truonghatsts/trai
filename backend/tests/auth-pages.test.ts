import { describe, it, expect, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { buildApp } from '../src/app.js';
import {
  CONFIRM_INVALID,
  CONFIRM_SUCCESS,
  RESET_INVALID,
  RESET_SUCCESS,
  confirmEmail,
  createResetFlow,
  parseLinkFragment,
} from '../src/auth/pages/flow.js';

// Public auth pages (contracts/auth.md § Public pages): served as static HTML
// under /auth/* on the backend domain. Only page reachability is asserted here
// — the verifyOtp/reset logic runs in the browser bundle, so the flows are
// exercised below against flow.ts with a fake client.
describe('auth public pages', () => {
  it('GET /auth/confirm serves the confirmation page (200, HTML)', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: '/auth/confirm' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
  });

  it('GET /auth/reset serves the reset page (200, HTML)', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: '/auth/reset' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/html');
  });

  it('GET /auth/theme.css serves the theme stylesheet (200, CSS)', async () => {
    const app = buildApp();
    const res = await app.inject({ method: 'GET', url: '/auth/theme.css' });
    expect(res.statusCode).toBe(200);
    expect(res.headers['content-type']).toContain('text/css');
  });
});

// Credentials arrive in the URL fragment only (contracts/auth.md § Public
// pages): #token_hash=..&type=.. — no email, nothing in the query string that
// could reach server request logs.
describe('parseLinkFragment', () => {
  it('reads token_hash and type from the fragment', () => {
    expect(
      parseLinkFragment('#token_hash=abc123&type=signup'),
    ).toEqual({ tokenHash: 'abc123', type: 'signup' });
  });

  it('returns only token_hash/type, ignoring any extra pairs (no email in links)', () => {
    expect(
      parseLinkFragment('#token_hash=hash-token&type=recovery&email=user@example.com'),
    ).toEqual({ tokenHash: 'hash-token', type: 'recovery' });
  });

  it('returns null when the fragment lacks token_hash or type', () => {
    expect(parseLinkFragment('')).toBeNull();
    expect(parseLinkFragment('#type=signup')).toBeNull();
    expect(parseLinkFragment('#token_hash=abc123')).toBeNull();
  });
});

// contracts/auth.md § GET /auth/confirm: verifyOtp({ type: 'email', token_hash }).
function fakeAuth(overrides: {
  verifyError?: { message: string } | null;
  updateError?: { message: string } | null;
} = {}) {
  const auth = {
    verifyOtp: vi.fn(async () => ({ data: {}, error: overrides.verifyError ?? null })),
    updateUser: vi.fn(async () => ({ error: overrides.updateError ?? null })),
  };
  return {
    client: { auth } as unknown as SupabaseClient,
    verifyOtp: auth.verifyOtp,
    updateUser: auth.updateUser,
  };
}

describe('confirmEmail (confirmation verifyOtp)', () => {
  it('verifies with type email + token_hash, no email field, and reports success', async () => {
    const { client, verifyOtp } = fakeAuth();
    const message = await confirmEmail(client, { tokenHash: 'tok', type: 'signup' });
    expect(message).toBe(CONFIRM_SUCCESS);
    expect(verifyOtp).toHaveBeenCalledTimes(1);
    expect(verifyOtp).toHaveBeenCalledWith({ type: 'email', token_hash: 'tok' });
    expect(verifyOtp.mock.calls[0][0]).not.toHaveProperty('email');
  });

  it('reports the invalid-link state when verifyOtp errors (expired/reused credential)', async () => {
    const { client } = fakeAuth({ verifyError: { message: 'Token has expired' } });
    const message = await confirmEmail(client, { tokenHash: 'tok', type: 'signup' });
    expect(message).toBe(CONFIRM_INVALID);
  });
});

describe('createResetFlow (recovery verify → update)', () => {
  it('verifies the recovery credential once, then updates the password', async () => {
    const { client, verifyOtp, updateUser } = fakeAuth();
    const flow = createResetFlow(client, { tokenHash: 'tok', type: 'recovery' });

    expect(await flow.verify()).toEqual({ ok: true, message: '' });
    expect(verifyOtp).toHaveBeenCalledTimes(1);
    expect(verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'tok' });
    expect(verifyOtp.mock.calls[0][0]).not.toHaveProperty('email');

    expect(await flow.update('new-password-123')).toEqual({
      ok: true,
      message: RESET_SUCCESS,
    });
    expect(updateUser).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledWith({ password: 'new-password-123' });
  });

  it('reports the invalid-link state for an invalid/reused recovery credential', async () => {
    const { client, verifyOtp } = fakeAuth({ verifyError: { message: 'Token has expired' } });
    const flow = createResetFlow(client, { tokenHash: 'tok', type: 'recovery' });

    expect(await flow.verify()).toEqual({ ok: false, message: RESET_INVALID });
    expect(verifyOtp).toHaveBeenCalledTimes(1);
  });

  it('allows retrying updateUser after a failed password update without re-consuming the credential', async () => {
    const { client, verifyOtp, updateUser } = fakeAuth();
    const flow = createResetFlow(client, { tokenHash: 'tok', type: 'recovery' });

    expect(await flow.verify()).toEqual({ ok: true, message: '' });

    updateUser.mockResolvedValueOnce({ error: { message: 'Password should be at least 8 characters.' } });
    const first = await flow.update('short');
    expect(first).toEqual({ ok: false, message: 'Password should be at least 8 characters.' });

    const second = await flow.update('new-password-123');
    expect(second).toEqual({ ok: true, message: RESET_SUCCESS });

    // The one-time credential was consumed exactly once, by the initial verify.
    expect(verifyOtp).toHaveBeenCalledTimes(1);
    expect(updateUser).toHaveBeenCalledTimes(2);
  });

  it('refuses update before a successful verify (no credential consumed)', async () => {
    const { client, verifyOtp, updateUser } = fakeAuth();
    const flow = createResetFlow(client, { tokenHash: 'tok', type: 'recovery' });

    expect(await flow.update('new-password-123')).toEqual({ ok: false, message: RESET_INVALID });
    expect(verifyOtp).not.toHaveBeenCalled();
    expect(updateUser).not.toHaveBeenCalled();
  });
});
