# Implementation Plan: Verified Transcription Auth

**Branch**: `002-verified-transcription-auth` | **Date**: 2026-08-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/002-verified-transcription-auth/spec.md`

## Summary

Adds email/password account creation with email verification to the existing video-transcription extension and backend (001). Accounts are created inside the extension via Supabase Auth; a confirmation email links to a stable public HTTPS page on the existing backend domain (`/auth/confirm`) which verifies the account via Supabase `verifyOtp`. The backend independently refuses job creation/retry for unverified accounts (403 `email_not_verified`) regardless of extension behavior. Password recovery reuses the same pattern: request from the sign-in screen, emailed link to public `/auth/reset` page, new password via `verifyOtp` (recovery) + `updateUser`. Expired sessions get exactly one silent refresh via the stored refresh token, then a sign-in prompt. Transcription never starts automatically: after any auth step the user always clicks an explicit final Transcribe button. One-active-job-per-user constraint unchanged; no quota, OAuth, CAPTCHA, or account deletion. The existing 001 user is treated as verified on rollout (one-time SQL migration). Automated auth tests in backend and extension plus a manual real-email smoke test gate the release.

## Technical Context

**Language/Version**: TypeScript / Node 20 (unchanged from 001)

**Primary Dependencies**: Supabase Auth (account creation, verification, recovery, session refresh — via `@supabase/supabase-js` in both extension and backend), Fastify (backend, now also serving the public auth pages), existing Chrome MV3 / yt-dlp / STT stack unchanged

**Storage**: Supabase Postgres unchanged (`jobs`, `transcripts`); verification/recovery artifacts are managed by Supabase Auth (GoTrue) — no new tables; `auth.users.email_confirmed_at` is the verification status field; one-time rollout migration marks the existing user verified

**Testing**: vitest in backend and extension (new auth suites per FR-010), curl-based contract checks, quickstart manual validation scenarios incl. real-email smoke test

**Target Platform**: Chrome desktop (extension, unpacked), Node service on Railway (backend) — public auth pages served by the backend over HTTPS

**Project Type**: Chrome extension + web-service backend (unchanged); backend gains static public auth pages

**Performance Goals**: unchanged from 001 (≤5 min video → ready within 10 min); auth steps are human-paced, no new performance budget

**Constraints**: verification gate holds in backend independently of client (FR-003); exactly one silent session refresh (FR-006); no auto-start of jobs after any auth step (FR-007); one active job per user preserved, no daily quota (FR-008); no OAuth/CAPTCHA/account deletion (FR-009); confirmation + recovery links expire (assumption), work on any modern browser over HTTPS

**Scale/Scope**: single user + public auth pages (tiny traffic); unchanged from 001

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution file (`.specify/memory/constitution.md`) is the unfilled starter template: it defines no concrete principles, constraints, or gates. No gate violations are possible or present. **Pass** (pre-research and post-design re-check: unchanged).

## Project Structure

### Documentation (this feature)

```text
specs/002-verified-transcription-auth/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── api.md           # Extension ↔ backend HTTP contract (delta from 001)
│   └── auth.md          # Auth flows: extension ↔ Supabase Auth ↔ backend public pages
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
extension/                          # Chrome MV3, installed unpacked (001 layout + auth changes)
├── src/
│   ├── background/                 # api.ts: 401-aware fetch; getToken/setToken
│   ├── shared/
│   │   ├── session.ts              # NEW: token + refresh-token persistence, ONE silent refresh
│   │   └── start.ts                # explicit Transcribe click path; no auto-start after auth
│   └── pages/
│       ├── signin.html|ts          # + create-account mode, forgot-password, resend, guidance
│       └── job.html|ts             # + email_not_verified state (guidance + resend)
└── tests/                          # + auth flow tests (mock supabase-js)

backend/                            # single Node service: API + worker + public auth pages
├── src/
│   ├── api/routes/jobs.ts          # + verification gate → 403 email_not_verified
│   ├── auth/                       # NEW: public confirmation/recovery pages
│   │   ├── pages/confirm.html|ts   # verifyOtp(type=email) → verified state
│   │   └── pages/reset.html|ts     # verifyOtp(type=recovery) → set new password
│   └── app.ts                      # + static route registration for /auth/*
└── tests/                          # + verification-gate tests (mock auth)

supabase/
└── migrations/
    ├── 001_init.sql                # unchanged (jobs, transcripts)
    └── 002_existing_user_verified.sql  # NEW: one-time rollout — mark existing user(s) verified
```

**Structure Decision**: No new top-level projects — auth rides the existing extension/backend split (001 Structure Decision). Supabase Auth is the identity system (no custom account tables); the backend's only new surface is two static public pages under `/auth/*` plus a gate check in the jobs routes. The extension's auth surface is confined to `signin` page changes and a small `shared/session.ts`; `start.ts` drops the auto-continue behavior.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — constitution defines no gates and no violations were identified.