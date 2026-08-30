# Quickstart & Validation Guide: Verified Transcription Auth

Phase 1 output of `/speckit.plan`. Runnable validation scenarios proving the auth feature works end to end. Implementation details live in the implementation phase (tasks.md); this is a run guide only. Auth contract: [contracts/auth.md](contracts/auth.md); API gate: [contracts/api.md](contracts/api.md); entities: [data-model.md](data-model.md). 001 scenarios S1–S8 remain valid — run them after the auth suite (they now assume a verified account).

## Prerequisites

- Chrome desktop browser; Node 20 + npm
- Supabase project with migrations applied (001 + `002_existing_user_verified.sql`), **Confirm email = on**, SMTP configured, Site URL + Redirect URLs set to the backend domain, email templates customized (research.md § Manual configuration)
- Railway (or local equivalent) backend serving `/api/*` **and** `/auth/confirm`, `/auth/reset` over HTTPS; extension env: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `BACKEND_URL` (HTTPS)
- A real, accessible email address (manual smoke test) + a public YouTube video < 5 min

## Setup

```bash
# 1. Backend: install, migrate (001 + 002), run
cd backend && npm install && npm run migrate && npm run dev

# 2. Extension: build and load unpacked
cd extension && npm install && npm run build
# Chrome → chrome://extensions → Developer mode → Load unpacked → extension/dist

# 3. Dashboard config (one-time, see research.md § Manual configuration)
#    Auth → Providers → Email: Confirm email ON
#    Auth → URL Configuration: Site URL + Redirect URLs = https://<backend-domain>/auth/*
#    Auth → Email Templates: Confirm signup + Reset password → link to /auth/confirm, /auth/reset
#    (link format: `{{ .SiteURL }}/auth/confirm#token_hash={{ .TokenHash }}&type=signup` /
#    `{{ .SiteURL }}/auth/reset#token_hash={{ .TokenHash }}&type=recovery` — credentials in the URL
#    fragment, never the query string, so they don't reach server request logs)
#    Auth → SMTP Settings: working provider
```

## Automated validation (FR-010, SC-006)

```bash
# Backend auth suite: verification gate
cd backend && npm test          # expect: POST /api/jobs + retry → 403 email_not_verified
                                # for unverified mock user; 201/200 for verified; 401 precedence

# Extension auth suite: flows
cd extension && npm test        # expect: signup session-null → guidance + resend; resend called;
                                # exactly one refreshSession then sign-in prompt; no
                                # startJobForVideo without explicit Transcribe click
```

## Manual smoke test — real email (US6, SC-006; runs against the deployed environment)

### M1 — Account creation → confirmation → transcription (US1, SC-001)

1. Fresh browser profile; open the launch-gate video; click the extension → sign-in screen.
2. **Create account** with the real email address + password. Expected: "check your inbox" state with resend; no session stored.
3. Open the confirmation email → link lands on `https://<backend-domain>/auth/confirm`. Expected: "Email verified — return to the extension".
4. Return to the extension on the video page → job view with an explicit **Transcribe** button; click it. Expected: job completes `ready` with readable transcript; **no job started before the click** (FR-007).
5. Repeat the click on the same URL → stored transcript opens (001 S4 unchanged).

### M2 — Unverified gate holds everywhere (US2, SC-002)

1. Create a second account with another real address; **do not confirm**.
2. In the extension, attempt transcription with it. Expected: `403`-driven guidance state (inbox + spam) with **Resend confirmation**; clicking Resend delivers a fresh email.
3. Direct backend call with that account's token: `curl -X POST https://<backend-domain>/api/jobs -H "Authorization: Bearer <jwt>" -d '{"source_url":"https://www.youtube.com/watch?v=...","duration_seconds":120}'`. Expected: `403 {"error":{"code":"email_not_verified",...}}`; no job row.

### M3 — Password recovery (US3, SC-003)

1. From the sign-in screen, **Forgot password** with the M1 address. Expected: neutral confirmation message; reset email arrives.
2. Open the link → `/auth/reset` page → set a new password. Expected: "Password updated — sign in with your new password".
3. Sign in with the new password. Expected: success; job view shows, **no auto-start** (FR-007).
4. Reuse the same reset link. Expected: "no longer valid" state (FR-005 AC3).

### M4 — Expired session: one silent refresh, then prompt (US4, SC-004)

1. With a signed-in extension, let the access token expire (or manually invalidate `vtToken` while keeping `vtRefreshToken`).
2. Open the extension on a video page. Expected: exactly one silent refresh — job view loads without a sign-in prompt (check extension logs: one `refreshSession` call).
3. Invalidate both tokens and repeat. Expected: sign-in prompt, no silent loop; after sign-in the preserved job view resumes without auto-start (US4-AC3).

## Edge-case spot checks (FR-004/FR-005, spec edge cases)

- **Duplicate email**: create account with an already-registered address → "Email already registered — sign in instead".
- **Expired confirmation**: use a >24 h-old confirmation link → "no longer valid" state; resend from the extension fixes it.
- **Unknown-address reset**: request reset for an unregistered address → identical message to a known one (no enumeration).
- **Cross-device confirmation**: open the confirmation link in a different browser → works; extension on the original device becomes verified on next attempt (FR-002).
- **Existing account**: after migration, the pre-002 account starts a transcription without any confirmation step (rollout assumption).

## Expected outcome summary

| Scenario | Gate |
|---|---|
| M1 | SC-001, SC-005 (explicit click), US1 |
| M2 | SC-002, FR-003/FR-004, US2 |
| M3 | SC-003, FR-005, US3 |
| M4 | SC-004, FR-006, US4 |
| Automated suites + M1/M3 smoke | SC-006, FR-010, US6 |
| 001 S1–S8 (verified account) | unchanged from 001 — regression check |