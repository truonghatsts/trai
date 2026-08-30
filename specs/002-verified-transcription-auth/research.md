# Research: Verified Transcription Auth

Phase 0 output of `/speckit.plan`. Resolves every technical unknown for the auth feature on top of the 001 stack (Supabase Auth + Fastify backend + Chrome MV3 extension, research.md of 001). Format per decision: **Decision / Rationale / Alternatives considered**.

## 1. Identity & verification: Supabase Auth, email confirmation on

- **Decision**: Stay on Supabase Auth email/password (001 research #10). Email confirmation ("Confirm email" toggle in Auth → Providers → Email) is enabled; `auth.users.email_confirmed_at` is the single source of truth for verification status.
- **Rationale**: FR-001/FR-002 need account creation + email verification with zero new infra; GoTrue already stores accounts, sends confirmation/recovery emails, manages token expiry, and exposes the verified flag on the user object (`email_confirmed_at`). The backend can read the same flag, satisfying FR-003's independent gate.
- **Alternatives considered**: Custom accounts table + hand-rolled token emails — rejected (real crypto/email work for one user; Supabase Auth already does it). Auth0/Firebase Auth — rejected (new provider, no benefit over the bundled one).

## 2. Public confirmation page: custom email template → backend `/auth/confirm`

- **Decision**: The Supabase email templates (SignUp confirmation) are customized to link to `{{ .SiteURL }}/auth/confirm#token_hash={{ .TokenHash }}&type=signup` — credentials ride the **URL fragment**, never the query string, so they never reach the server or its request logs (the `email` param is omitted; `token_hash` identifies the account). The backend serves `/auth/confirm` (static page + inline JS) which reads + clears the fragment and calls `supabase.auth.verifyOtp({ type: 'email', token_hash })` with the anon key.
- **Rationale**: FR-002/FR-005 explicitly demand stable public HTTPS pages **on the existing backend domain** — Supabase's built-in verify page lives on `*.supabase.co`, which violates that. `verifyOtp` with the link's `token_hash` is the documented way to consume a confirmation link from a custom page; anon key is sufficient (token_hash is the credential). The page is static + thin JS, served by the same Railway service — no new deployment.
- **Alternatives considered**: Keep Supabase's default confirmation URL (`/auth/v1/verify`) — rejected (wrong domain per FR-002). Backend proxy that forwards `verifyOtp` with the service key — rejected (service key in a browser-loaded page is a credential leak; anon + token_hash is the intended flow). "Return to extension to confirm" — rejected (needs the user's browser session, breaks on other devices; spec edge case requires any modern browser, cross-device).

## 3. Recovery page: same pattern, `/auth/reset`

- **Decision**: Sign-in screen calls `supabase.auth.resetPasswordForEmail(email, { redirectTo: <backend>/auth/reset })`; the Recovery email template links to `{{ .SiteURL }}/auth/reset#token_hash={{ .TokenHash }}&type=recovery` (fragment, no email); the page reads + clears the fragment, calls `verifyOtp({ type: 'recovery', token_hash })` **once** — which returns a session — then `updateUser({ password })` with the retained session. Failed updates (weak password, transient errors) keep the session for retry without re-consuming the one-time token and show GoTrue's error verbatim.
- **Rationale**: FR-005 requires the reset page on the backend domain; `verifyOtp(type: recovery)` + `updateUser` is the standard custom-recovery-page flow. Neutral responses for unknown addresses (edge case: no address enumeration) come from GoTrue's `/recover` endpoint by design — it always returns success; the extension shows the same message regardless.
- **Alternatives considered**: Sending a temporary password — rejected (extra email, worse UX than a set-new-password page). Resetting via admin API from the page — rejected (service key exposure; see #2).

## 4. Backend verification gate: check `email_confirmed_at` from `auth.getUser`

- **Decision**: In the jobs routes (create + retry only), after the existing `authGuard` resolves the token, the backend requires `user.email_confirmed_at` to be set; otherwise `403 { error: { code: "email_not_verified" } }`. Read from the `auth.getUser(token)` response (the same call `authGuard` already makes) — no extra round-trip.
- **Rationale**: FR-003 demands the gate hold independently of any client. The JWT is validated per request already; the user object returned by `getUser` carries `email_confirmed_at` (GoTrue v2). Keeping the gate in the two job-mutating routes (not a global hook) keeps transcript viewing/history unblocked and the change minimal. The DB partial unique index from 001 remains the one-active-job backstop — no schema change for the gate.
- **Alternatives considered**: Rely on a JWT `email_verified` claim — rejected (claim presence/format varies by GoTrue version; `getUser` is authoritative). SQL trigger on `jobs` insert — rejected (error shape and 403 semantics belong in the route; DB can't produce the contract's error envelope).

## 5. Session refresh: store refresh token, one silent refresh

- **Decision**: The extension stores `vtRefreshToken` alongside `vtToken` in `chrome.storage.local`. On any `401` from the backend API, `shared/session.ts` calls `supabase.auth.refreshSession({ refresh_token })` exactly once (per 401 occurrence), persists the new pair, and retries the original request; if refresh fails, the page shows the sign-in prompt (existing 001 job-page behavior preserved).
- **Rationale**: FR-006 demands exactly one silent refresh, then a prompt. A stored refresh token is the standard Supabase pattern (the SDK's own auto-refresh does the same in-page; storage makes it survive page/tab recreation, which the SDK's in-memory session does not after tab close — FR-012 context). "Exactly once" is enforced by a per-attempt flag, so a 401 storm cannot loop refreshes.
- **Alternatives considered**: Rely on supabase-js `autoRefreshToken` (in-memory) — rejected (session is lost on tab recreation; the token in `vtToken` would go stale with no refresh path). Re-sign-in silently with stored credentials — rejected (never store the password).

## 6. No auto-start after auth (FR-007)

- **Decision**: Remove the auto-continue in `signin.ts` (001's `startJobForVideo(pendingVideo)` on sign-in success). After any auth step the extension renders the job/transcript view with an explicit **Transcribe** button; `pendingVideo` context is preserved for the button's click handler.
- **Rationale**: FR-007 is explicit and non-negotiable: 0 jobs start without the user's final Transcribe click, after every auth path (sign-in, verification, recovery). Keeping `pendingVideo` means the user loses no context — they just have to click once.
- **Alternatives considered**: Auto-start only when the job is "free" (verified, already viewed) — rejected (spec says every auth step requires explicit confirmation; distinguishing cases adds state for no product value).

## 7. Existing-user migration: verified at rollout

- **Decision**: One-time SQL migration `002_existing_user_verified.sql`: `update auth.users set email_confirmed_at = now() where email_confirmed_at is null;` shipped with the feature and run via `supabase db push` at rollout.
- **Rationale**: Spec assumption: the existing single-user account is treated as verified so the current user is never locked out. A migration is idempotent-ish, reviewable, and runs with the existing `npm run migrate` path. At rollout time every existing `auth.users` row is a pre-002 account by construction (no signup existed before), so a blanket update is correct then.
- **Alternatives considered**: Admin API call at first request — rejected (app code doing one-time data fixups; migration is the standard place). Marking verified only in the backend gate — rejected (verification status would disagree between gate and user object).

## 8. Email delivery & link expiry: GoTrue defaults, SMTP configured

- **Decision**: Rely on GoTrue's built-in email sending with a configured SMTP provider in the Supabase dashboard (Auth → SMTP Settings). Confirmation link expiry = GoTrue default (24 h), recovery link expiry = GoTrue default (1 h) — both "reasonable windows" per the spec assumption; resend/re-request covers expiry (FR-004/FR-005 edge cases).
- **Rationale**: Spec assumes "a standard email service ... reliable enough for a single user". SMTP in the dashboard is a config step, not code; expiry defaults are standard practice and the UI already handles expired/used links (both pages show "link no longer valid, request a fresh one").
- **Alternatives considered**: Custom expiry in GoTrue settings (configurable) — noted, no code impact; defaults are fine. Transactional email API (SendGrid etc.) — rejected (SMTP config covers one user; the resend path is the safety net).

## 9. Double-creation race (edge case)

- **Decision**: Supabase Auth's unique email constraint on `auth.users` is the guard; the extension maps the `UserAlreadyExists` error to "email already registered — sign in instead" (edge case).
- **Rationale**: Two simultaneous signups for the same email cannot create two accounts — GoTrue enforces email uniqueness server-side. The extension only needs a friendly message mapping.
- **Alternatives considered**: Pre-check by querying accounts — rejected (enumeration risk; race anyway). Custom table constraint — rejected (no custom tables).

## 10. Automated auth coverage (FR-010)

- **Decision**: Backend: vitest suite mocking the Supabase client — gate returns `403 email_not_verified` for unverified users on job create + retry, `201/200` for verified; recovery/refresh are client-side so backend tests stay focused on the gate + error envelope. Extension: vitest suite mocking `@supabase/supabase-js` — signup with session null shows inbox guidance + resend; resend calls `resend({type:'signup'})`; refresh happens exactly once then prompts sign-in; `startJobForVideo` is NOT invoked without the explicit Transcribe click; verified user reaches job view. Manual smoke (real email, deployed env) per quickstart S-scenarios.
- **Rationale**: FR-010 names the four flows (creation, verification enforcement, recovery, session refresh) in both backend and extension; the extension tests cover the client-side flows, the backend tests cover the independent gate, and the manual smoke covers real email delivery (unmockable).
- **Alternatives considered**: Full integration harness with real Supabase in CI — rejected (project has no CI infra; manual smoke is the required gate anyway).

## Manual configuration required (not code)

- Supabase dashboard → Auth → Providers → Email: **Confirm email = on**.
- Supabase dashboard → Auth → URL Configuration: **Site URL** = `https://<backend-domain>`; **Redirect URLs** must allow `https://<backend-domain>/auth/*`.
- Supabase dashboard → Auth → Email Templates: customize **Confirm signup** and **Reset password** templates to link to the backend pages with `{{ .TokenHash }}` (see #2/#3).
- Supabase dashboard → Auth → SMTP Settings: configure a working SMTP provider (emails must actually deliver).
- Env: no new backend env vars required — the extension's existing `BACKEND_URL` (production HTTPS value) is the redirect target; extension `SUPABASE_URL`/`SUPABASE_ANON_KEY` unchanged.
- Branch: create `002-verified-transcription-auth` from current work before implementation.