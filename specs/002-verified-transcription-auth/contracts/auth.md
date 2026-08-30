# Contract: Auth Flows — extension ↔ Supabase Auth ↔ backend public pages

Phase 1 output of `/speckit.plan`. The authentication surface of this feature: what the extension does against Supabase Auth, what the backend serves as stable public HTTPS pages, and how the two meet. Supabase Auth is the identity system (research #1); the backend's only auth role is serving the two public pages and gating jobs (contracts/api.md). Base URLs: `SUPABASE_URL`/`SUPABASE_ANON_KEY` from extension config; `BACKEND_URL` = production HTTPS backend domain (redirect target + page origin).

## Public pages (backend domain, stable HTTPS — FR-002/FR-005)

Served by the backend as static pages with inline JS (anon-key supabase-js; research #2/#3). Reachable from any modern browser, no app installation (assumption).

**Link format — URL fragment, never the query string.** The email templates emit `#token_hash=..&type=..` after the page path (e.g. `https://<backend>/auth/confirm#token_hash=..&type=signup`). Fragments are not sent to the server, so the one-time credentials never appear in query strings or server request logs. The `email` param is deliberately absent: `verifyOtp` with a `token_hash` identifies the account itself. Each page reads `location.hash` once, then clears it (`history.replaceState`) so the credential does not linger in the address bar or browser history.

### GET /auth/confirm — email confirmation

URL fragment (from the customized Supabase SignUp email template): `token_hash`, `type=signup` — no email.

Behavior on load: read + clear the fragment, then call `supabase.auth.verifyOtp({ type: 'email', token_hash })`.

| verifyOtp result | Page shows |
|---|---|
| success | "Email verified — close this tab and return to the extension." Account is verified (`email_confirmed_at` set, FR-002 AC2); the extension's next job attempt proceeds |
| error (expired / already used) | "This confirmation link is no longer valid. Return to the extension and request a fresh confirmation email." (edge case; resend renews, FR-004) |

### GET /auth/reset — password recovery

URL fragment (from the customized Supabase Recovery email template): `token_hash`, `type=recovery` — no email.

Behavior: read + clear the fragment, then **verify the recovery credential exactly once on page load** — `verifyOtp({ type: 'recovery', token_hash })` → session held in memory on the page's client. The new-password form (confirm field + inline validation) appears only after verification succeeds; submitting calls `supabase.auth.updateUser({ password })` with that session — never `verifyOtp` again, so retries after a failed update do not re-consume the one-time token.

| Result | Page shows |
|---|---|
| verifyOtp error (expired / already used) | "This reset link is no longer valid. Request a fresh reset link from the extension." (FR-005 AC3), no form |
| updateUser success | "Password updated — sign in with your new password." (FR-005 AC2; US3-AC2) |
| updateUser error (e.g. weak password, transient failure) | GoTrue's error message verbatim; the session is retained, the form stays, the user can correct and resubmit — the credential is not consumed again |

## Extension flows (signin page + session handling)

### Create account (FR-001, US1-AC1)

1. `signin.html` gains a **Create account** mode: email, password, confirm password; inline validation before submit (edge: invalid email format / weak password — message explains what is wrong).
2. Submit: `supabase.auth.signUp({ email, password, options: { emailRedirectTo: BACKEND_URL + '/auth/confirm' } })`.
3. Because confirmation is required, the response has **no session** (research #1) — the extension switches to the "check your inbox" state: guidance (inbox + spam) + **Resend confirmation** button. No token is stored; the user is not signed in (FR-002 AC1).
4. **Resend**: `supabase.auth.resend({ type: 'signup', email, options: { emailRedirectTo: BACKEND_URL + '/auth/confirm' } })` → fresh confirmation email; pending confirmation remains valid (US2-AC3). Network failure → clear error, retry allowed (edge case).
5. Error `UserAlreadyExists` → "Email already registered — sign in instead" and the form switches to sign-in mode (edge case).
6. After the user confirms on `/auth/confirm`, returning to the extension and clicking it on a video page proceeds normally (US1-AC3, US2-AC1) — **but never auto-starts a job** (FR-007, see Explicit Transcribe below).

### Verification guidance + resend in the job view (FR-004, US2-AC1)

- On `403 email_not_verified` from POST /api/jobs or retry (contracts/api.md), `job.html` shows: "Confirm your email to start transcription — check your inbox and spam" + **Resend confirmation** (same `resend` call as above) + a link to sign out/back.
- Same state is shown proactively when `supabase.auth.getUser()` reports `email_confirmed_at = null` at job-view load.

### Forgot password (FR-005, US3-AC1)

1. `signin.html` gains a **Forgot password** action → email input → `supabase.auth.resetPasswordForEmail(email, { redirectTo: BACKEND_URL + '/auth/reset' })`.
2. One neutral success message for known and unknown addresses (edge case: no enumeration).
3. Flow continues on `/auth/reset` (above); the user then signs in with the new password (US3-AC2).

### Session refresh — exactly one silent attempt (FR-006, US4)

1. `shared/session.ts` persists `vtRefreshToken` alongside `vtToken` (chrome.storage.local) whenever a session is obtained (sign-in, refresh, recovery-in-extension).
2. Any `401` from the backend (api.md): attempt `supabase.auth.refreshSession({ refresh_token })` **exactly once** for that 401 occurrence (per-attempt flag — a 401 storm cannot loop refreshes); on success persist the new pair and retry the original request once.
3. Refresh fails (expired/invalid refresh token) → show the sign-in prompt (existing 001 job-page behavior, job view preserved and resumed after sign-in — edge case "session refresh fails mid-view").
4. After sign-in following a failed refresh, **no job starts automatically** (US4-AC3 + FR-007).

### Explicit Transcribe — never auto-start (FR-007, US5)

- The 001 auto-continue (`startJobForVideo` on sign-in success) is removed. After **every** auth step — sign-in, email verification, password recovery — the job/transcript view renders with an explicit **Transcribe** button; the stored `pendingVideo` context is preserved for that click.
- A job is created/started only from that button click (US5-AC1/2/3; SC-005: 0 jobs without explicit click).

## Error/edge handling

| Case | Behavior |
|---|---|
| Email already registered | signUp → `UserAlreadyExists` → clear message + switch to sign-in (edge) |
| Invalid email / weak password | inline validation before any request (edge) |
| Confirmation email lost / in spam | guidance + Resend (FR-004; edge) |
| Confirmation link expired/used | `/auth/confirm` invalid-link state; resend renews (edge) |
| Reset link expired/used | `/auth/reset` invalid-link state; fresh request (FR-005 AC3) |
| Reset for unknown address | identical neutral message (edge) |
| Confirmation on another device/browser | page works on any modern browser over HTTPS; user returns to extension (edge, assumption) |
| Network failure (create/resend/reset) | clear error, retry; no partial success presentation (edge) |
| Two simultaneous signups, same email | GoTrue unique email → single account; second gets `UserAlreadyExists` (edge, research #9) |
| Existing 001 account | verified at rollout (data-model.md migration; edge) |

Contract reference: entities in [../data-model.md](../data-model.md), HTTP gate in [api.md](api.md), validation scenarios in [../quickstart.md](../quickstart.md).