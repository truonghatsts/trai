---

description: "Task list for Verified Transcription Auth implementation"

---

# Tasks: Verified Transcription Auth

**Input**: Design documents from `/specs/002-verified-transcription-auth/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/ (`api.md`, `auth.md`), quickstart.md

**Tests**: INCLUDED — FR-010 explicitly requires automated auth coverage in backend and extension, plus a manual real-email smoke test (research #10, quickstart M1–M4).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- **[MANUAL]**: Human-performed task (dashboard config, deployed-env smoke test) — not code; skip for automated implementers and queue for the maintainer
- Include exact file paths in descriptions

## Path Conventions

- **Extension**: `extension/src/`, `extension/tests/`
- **Backend**: `backend/src/`, `backend/tests/`
- **Migrations**: `supabase/migrations/`

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch, environment, and one-time Supabase dashboard configuration

- [X] T001 Create branch `002-verified-transcription-auth` from current work (`git checkout -b 002-verified-transcription-auth`) — research.md § Manual configuration; blocks all phases
- [X] T002 [P] [MANUAL] Supabase dashboard → Auth → Providers → Email: enable **Confirm email** (research #1; blocks US1 end-to-end)
- [X] T003 [P] [MANUAL] Supabase dashboard → Auth → URL Configuration: set Site URL = `https://<backend-domain>`; Redirect URLs must allow `https://<backend-domain>/auth/*` (research #2; blocks confirmation/reset emails resolving)
- [X] T004 [P] [MANUAL] Supabase dashboard → Auth → Email Templates: customize **Confirm signup** to link to `{{ .SiteURL }}/auth/confirm#token_hash={{ .TokenHash }}&type=signup` (fragment — never the query string — keeps the credential out of server request logs; no email param; contracts/auth.md § Public pages; blocks US1 AC2)
- [X] T005 [P] [MANUAL] Supabase dashboard → Auth → Email Templates: customize **Reset password** to link to `{{ .SiteURL }}/auth/reset#token_hash={{ .TokenHash }}&type=recovery` (fragment, no email param; research #3; blocks US3 AC1)
- [X] T006 [P] [MANUAL] Supabase dashboard → Auth → SMTP Settings: configure a working SMTP provider (research #8; blocks M1/M3 smoke tests — emails must deliver)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T007 Create `supabase/migrations/002_existing_user_verified.sql` — `update auth.users set email_confirmed_at = now() where email_confirmed_at is null;` one-time rollout so the pre-002 account is verified (data-model.md § Rollout migration, research #7; run via `npm run migrate` in `backend/`)
- [X] T008 [P] Create `extension/src/shared/session.ts` — persist `vtToken` + `vtRefreshToken` in `chrome.storage.local`; export `setSession(session)` / `getToken()` / `getRefreshToken()` (research #5; consumed by signin + 401-refresh; blocks US1 T015 and US4 T029)
- [X] T009 [P] Register static serving of `backend/src/auth/pages/*` under `/auth/*` in `backend/src/app.ts` (research #2 — Fastify static routes; blocks US1 confirm page + US3 reset page)
- [X] T010 [P] Add `supabaseAnonKey` (env `SUPABASE_ANON_KEY`) to `backend/src/config.ts` — public pages use the anon key, never the service key (research #2 credential rule; blocks T011)
- [X] T011 [P] Create `backend/src/auth/pages/client.ts` — anon-key `@supabase/supabase-js` client factory for the public pages (uses CONFIG from `backend/src/config.ts`; blocks T016, T027)

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - Create an account and verify the email inside the extension (Priority: P1) 🎯 MVP

**Goal**: The user creates an account from the extension's sign-in screen; a confirmation email links to the public `/auth/confirm` page on the backend domain; opening it verifies the account (FR-001, FR-002)

**Independent Test**: From a fresh browser profile, click the extension, create an account with a real email address, open the confirmation email, confirm, and reach the point where the transcript tab offers a transcription (spec.md US1; quickstart M1)

### Tests for User Story 1 (write FIRST — must FAIL before implementation)

- [X] T012 [P] [US1] Extension test: signup flow in `extension/tests/auth-signup.test.ts` — mock `@supabase/supabase-js`: `signUp` returns **no session** → extension shows inbox guidance + resend button, no token stored; resend calls `supabase.auth.resend({ type: 'signup', ... })`; `UserAlreadyExists` error → "Email already registered — sign in instead" (research #10; contracts/auth.md § Create account)
- [X] T013 [P] [US1] Backend test: `GET /auth/confirm` serves the page (200, HTML) in `backend/tests/auth-pages.test.ts` via `buildApp()` (contracts/auth.md § Public pages)

### Implementation for User Story 1

- [X] T014 [P] [US1] Add **Create account** mode (email, password, confirm password, inline validation for invalid email / weak password) + inbox-guidance state + **Resend confirmation** button to `extension/src/pages/signin.html` (contracts/auth.md § Create account; spec edge cases)
- [X] T015 [US1] Implement signup + resend in `extension/src/pages/signin.ts` — `supabase.auth.signUp({ email, password, options: { emailRedirectTo: CONFIG.BACKEND_URL + '/auth/confirm' } })`; no session → inbox state (never signed in); resend via `supabase.auth.resend`; `UserAlreadyExists` → switch to sign-in mode; network failure → clear error, retry allowed; persist session pair via `shared/session.ts` `setSession` only on real sign-in (depends T012, T008; contracts/auth.md § Create account steps 3–6)
- [X] T016 [US1] Create `backend/src/auth/pages/confirm.html` + `confirm.ts` — on load read + clear the link fragment (`#token_hash=..&type=signup`), then call `supabase.auth.verifyOtp({ type: 'email', token_hash })`; success → "Email verified — close this tab and return to the extension"; error → "This confirmation link is no longer valid. Return to the extension and request a fresh confirmation email." (depends T013, T009, T011; contracts/auth.md § GET /auth/confirm)

**Checkpoint**: At this point, User Story 1 should be fully functional and testable independently

---

## Phase 4: User Story 2 - Verified users only: email verification gates transcription (Priority: P1)

**Goal**: The backend refuses job creation/retry for unverified accounts with `403 email_not_verified` independent of any client; the extension shows guidance + resend (FR-003, FR-004)

**Independent Test**: Create an account without confirming the email, then attempt to start a transcription from the extension and, separately, via a direct backend request. Both must refuse until the email is confirmed (spec.md US2; quickstart M2)

### Tests for User Story 2 (write FIRST — must FAIL before implementation)

- [X] T017 [P] [US2] Backend test: verification gate in `backend/tests/auth-gate.test.ts` — mock Supabase client `getUser`: `email_confirmed_at` null → `POST /api/jobs` and `POST /api/jobs/:id/retry` return `403 {"error":{"code":"email_not_verified",...}}` and create no job row; `email_confirmed_at` set → 201/200; missing/invalid token → `401` takes precedence over the gate (contracts/api.md § email_not_verified; research #10)

### Implementation for User Story 2

- [X] T018 [P] [US2] Add `ERR.emailNotVerified` (403, code `email_not_verified`, message "Confirm your email to start transcription.") to `backend/src/api/errors.ts` (contracts/api.md)
- [X] T019 [US2] Expose the resolved user on the request in `backend/src/api/auth.ts` — `request.user = data.user` (carries `email_confirmed_at`) alongside existing `request.userId` (research #4; blocks T020)
- [X] T020 [US2] Add the gate to `backend/src/api/routes/jobs.ts` — in `POST /api/jobs` and `POST /api/jobs/:id/retry`, after the existing authGuard resolution and before any job read/write: if `request.user.email_confirmed_at` is null → `sendError(reply, ERR.emailNotVerified...)`; transcript/history endpoints stay ungated (depends T018, T019; research #4 — gate only in the two job-mutating routes)
- [X] T021 [P] [US2] Add verification-guidance state to `extension/src/pages/job.html` + `extension/src/pages/job.ts` — on `403 email_not_verified` in the retry handler and proactively when `supabase.auth.getUser()` reports `email_confirmed_at` null at job-view load: "Confirm your email to start transcription — check your inbox and spam" + **Resend confirmation** button (calls `resend({ type: 'signup' })`) + sign-in link (contracts/auth.md § Verification guidance + resend in the job view)
- [X] T022 [US2] Route `email_not_verified` results from `startJobForVideo` to the verification-guidance state in `extension/src/background/index.ts` (instead of the generic notice page) so a fresh unverified user gets guidance + resend (depends T021; contracts/auth.md § Verification guidance)

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently

---

## Phase 5: User Story 3 - Recover a forgotten password (Priority: P2)

**Goal**: Request a reset from the sign-in screen; emailed link opens the public `/auth/reset` page on the backend domain where a new password is set, then the user signs in (FR-005)

**Independent Test**: With an existing account, request a password reset, open the emailed link, set a new password, and sign in with it (spec.md US3; quickstart M3)

### Tests for User Story 3 (write FIRST — must FAIL before implementation)

- [X] T023 [P] [US3] Extension test: forgot-password flow in `extension/tests/auth-recovery.test.ts` — mock `@supabase/supabase-js`: `resetPasswordForEmail(email, { redirectTo: CONFIG.BACKEND_URL + '/auth/reset' })` called on submit; one identical neutral message for known and unknown addresses (no enumeration) (research #10; contracts/auth.md § Forgot password)
- [X] T024 [US3] Extend `backend/tests/auth-pages.test.ts` — `GET /auth/reset` serves the page (200, HTML) via `buildApp()` (depends T013 — same test file, sequential)

### Implementation for User Story 3

- [X] T025 [P] [US3] Add **Forgot password** action + email input mode to `extension/src/pages/signin.html` (contracts/auth.md § Forgot password)
- [X] T026 [P] [US3] Implement forgot-password submit in `extension/src/pages/signin.ts` — `supabase.auth.resetPasswordForEmail(email, { redirectTo: CONFIG.BACKEND_URL + '/auth/reset' })`; neutral success message regardless of address existence; network failure → clear error, retry (depends T023; spec edge cases)
- [X] T027 [US3] Create `backend/src/auth/pages/reset.html` + `reset.ts` — read + clear the link fragment (`#token_hash=..&type=recovery`); verify the recovery credential **once** on load via `verifyOtp({ type: 'recovery', token_hash })` → session; new-password form (confirm field + inline validation) appears only after verification; submit calls `supabase.auth.updateUser({ password })` with the retained session — a failed update (weak password, transient error) keeps the session so the user can retry without consuming the credential again and shows GoTrue's error verbatim; success → "Password updated — sign in with your new password" (depends T024, T009, T011; contracts/auth.md § GET /auth/reset)

**Checkpoint**: User Stories 1, 2, and 3 are now independently functional

---

## Phase 6: User Story 4 - Expired sessions: one silent refresh, then sign in (Priority: P2)

**Goal**: On any backend `401`, the extension silently refreshes the session exactly once via the stored refresh token; on failure the user is prompted to sign in — never silently blocked (FR-006)

**Independent Test**: Start a transcription, let the session expire, then return to the extension. Either the user is silently signed back in and sees their job, or they are clearly prompted to sign in (spec.md US4; quickstart M4)

### Tests for User Story 4 (write FIRST — must FAIL before implementation)

- [X] T028 [P] [US4] Extension test: refresh-on-401 in `extension/tests/session-refresh.test.ts` — mock `@supabase/supabase-js` + fetch: first request `401` → exactly **one** `refreshSession({ refresh_token })` call → new pair persisted → original request retried once; refresh failure → sign-in prompt, no refresh loop on repeated 401s (research #5/#10 — "exactly once" per-attempt flag)

### Implementation for User Story 4

- [X] T029 [US4] Implement one-silent-refresh in `extension/src/background/api.ts` — on `401` from the backend, call `supabase.auth.refreshSession({ refresh_token })` via `shared/session.ts` exactly once per 401 occurrence (per-attempt flag; a 401 storm cannot loop), persist the new token pair, retry the original request once; on refresh failure signal the sign-in prompt path (depends T008; research #5)
- [X] T030 [US4] Preserve the in-progress job view on refresh failure in `extension/src/pages/job.ts` — sign-in prompt shows, job view state is preserved and resumes after sign-in; after that sign-in no job starts automatically (depends T029; contracts/auth.md § Session refresh steps 3–4, spec edge case)

**Checkpoint**: User Stories 1–4 are now independently functional

---

## Phase 7: User Story 5 - Explicit final Transcribe click after authenticating (Priority: P3)

**Goal**: After every auth step — sign-in, email verification, password recovery — transcription never starts automatically; the user always clicks an explicit Transcribe button (FR-007)

**Independent Test**: Complete each auth step (sign-in, verification, recovery) and confirm that in every case a further explicit action is required before any job starts (spec.md US5)

### Tests for User Story 5 (write FIRST — must FAIL before implementation)

- [X] T031 [P] [US5] Extension test: no-auto-start in `extension/tests/no-autostart.test.ts` — sign-in success navigates to the job view **without** invoking `startJobForVideo`; the explicit Transcribe click is required before any job is created; `pendingVideo` context is preserved (research #10; FR-007, SC-005)

### Implementation for User Story 5

- [X] T032 [P] [US5] Remove the auto-continue (`startJobForVideo(pendingVideo)` on sign-in success) from `extension/src/pages/signin.ts` — after sign-in route to the job view with `pendingVideo` preserved, no job created (research #6; contracts/auth.md § Explicit Transcribe)
- [X] T033 [US5] Add the explicit **Transcribe** start mode to `extension/src/pages/job.html` + `extension/src/pages/job.ts` — when `pendingVideo` is present, render a Transcribe button; the job is created only from that click via `shared/start.ts` `startJobForVideo` (depends T032; contracts/auth.md § Explicit Transcribe)

**Checkpoint**: All user stories (1–5) are now independently functional

---

## Phase 8: User Story 6 - Prove the auth flows before release (Priority: P3)

**Goal**: Automated auth suites in backend and extension pass, and the manual real-email smoke test confirms account creation → confirmation → transcription and password reset end to end, before release (FR-010)

**Independent Test**: Run the automated auth suites for backend and extension, then perform the manual real-email smoke test against the deployed environment. All must pass before release (spec.md US6; quickstart.md)

### Tests / Validation for User Story 6 (requires deployed environment + Phase 1 manual config)

- [X] T034 [P] [US6] Run the backend auth suites: `cd backend && npm test` — `backend/tests/auth-gate.test.ts`, `backend/tests/auth-pages.test.ts` green (gate 403/201/200, 401 precedence, pages served) (quickstart § Automated validation; depends T017, T024)
- [X] T035 [P] [US6] Run the extension auth suites: `cd extension && npm test` — `extension/tests/auth-signup.test.ts`, `auth-recovery.test.ts`, `session-refresh.test.ts`, `no-autostart.test.ts` green (quickstart § Automated validation; depends T012, T023, T028, T031)
- [X] T036 [US6] [MANUAL] Smoke M1 — account creation → confirmation → transcription with a real email against the deployed environment: create account, open confirmation email → `https://<backend-domain>/auth/confirm` → verified; return to extension, click explicit Transcribe; job completes `ready`; **no job started before the click** (quickstart M1; depends T002–T004, T006, deployed backend; SC-001/SC-005)
- [X] T037 [US6] [MANUAL] Smoke M2 — unverified gate holds everywhere: second account, do not confirm; extension attempt shows guidance + resend works; direct `curl -X POST https://<backend-domain>/api/jobs` with that account's JWT → `403 {"error":{"code":"email_not_verified",...}}`, no job row (quickstart M2; SC-002)
- [X] T038 [US6] [MANUAL] Smoke M3 — password recovery with a real email: Forgot password → reset email → `/auth/reset` → new password → sign in with it; reusing the same link shows "no longer valid" (quickstart M3; depends T005, T006; SC-003)
- [X] T039 [US6] [MANUAL] Smoke M4 — expired session: invalidate `vtToken`, keep `vtRefreshToken` → exactly one silent refresh (extension logs: one `refreshSession` call), job view loads without prompt; invalidate both → sign-in prompt, no silent loop, job view resumes without auto-start (quickstart M4; SC-004)

**Checkpoint**: Release gate — all of T034–T039 pass before release

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Regressions, scope guards, and quality gates across all stories

- [ ] T040 [P] Regression: run 001 scenarios S1–S8 (from `specs/001-video-transcription-extension/`) against the verified account — transcription, history, one-active-job, duration/URL validation unchanged (quickstart § Expected outcome summary)
- [ ] T041 [P] Edge-case spot checks per `specs/002-verified-transcription-auth/quickstart.md` § Edge-case spot checks: duplicate email → "Email already registered — sign in instead"; expired confirmation link → "no longer valid" + resend fixes; unknown-address reset → identical message (no enumeration); cross-device confirmation works; pre-002 account transcribes without confirmation (depends T036–T039)
- [X] T042 [P] Scope guard — verify FR-008 (one-active-job constraint intact, no daily quota introduced in `backend/src/api/routes/jobs.ts` / `supabase/migrations/001_init.sql`) and FR-009 (no OAuth, CAPTCHA, or account-deletion code added anywhere in `extension/`, `backend/`)
- [X] T043 [P] Quality gates per `backend/package.json` and `extension/package.json` scripts: `cd backend && npm run typecheck && npm run lint`; `cd extension && npm run typecheck && npm run lint` — all green
- [ ] T044 Run the full `specs/002-verified-transcription-auth/quickstart.md` validation suite end to end (automated suites + M1–M4 + 001 S1–S8) and record results — final release gate (depends T034–T043)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 blocks everything. T002–T006 are manual dashboard config — parallel with code phases, but all four block the US6 smoke tests (T036–T039) and T004/T005 block US1/US3 end-to-end verification
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational completion; then proceed in priority order (P1 → P2 → P3) or in parallel (see Parallel Opportunities)
- **Polish (Phase 9)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundational only (T008 session persistence, T009/T011 page serving). No dependency on other stories
- **US2 (P1)**: Foundational only (T019 authGuard user exposure). Independent of US1
- **US3 (P2)**: Foundational only (T009/T011). US3 reset page shares `backend/tests/auth-pages.test.ts` with US1 (T024 after T013 — sequential, same file)
- **US4 (P2)**: Foundational T008 (`shared/session.ts`). Independent of US1–US3
- **US5 (P3)**: US1 T015 (signin.ts) and US4 T030 (job.ts) touch adjacent code — implement after US1/US4 to avoid same-file conflicts (signin.ts, job.ts)
- **US6 (P3)**: Depends on all of US1–US5 code + Phase 1 manual config + deployed environment

### Within Each User Story

- Tests MUST be written and FAIL before implementation (T012/T013, T017, T023/T024, T028, T031)
- Tests (if included) → shared infrastructure → services → pages/routes → integration

### Parallel Opportunities

- **Lane A — Backend code**: T009, T010, T011 → T017–T020 (US2 gate) → T024 (US3 page test) → T027 (reset page)
- **Lane B — Extension code**: T008 → T012, T014–T015 (US1) → T021–T022 (US2) → T023, T025–T026 (US3) → T028–T030 (US4) → T031–T033 (US5)
- **Lane C — Manual config (human)**: T002–T006 during Phase 1; T036–T039 after deploy
- **Lane D — Migration**: T007 independent of all code lanes (file `supabase/migrations/002_existing_user_verified.sql` touches nothing else)
- **Same-file conflicts to avoid**: `extension/src/pages/signin.ts` — T015 (US1), T026 (US3), T032 (US5) sequential; `extension/src/pages/job.ts` — T021 (US2), T030 (US4), T033 (US5) sequential; `backend/tests/auth-pages.test.ts` — T013 (US1) then T024 (US3)

### Parallel Example: US1

```bash
# Launch tests together (must fail first):
Task: "T012 Extension signup test in extension/tests/auth-signup.test.ts"
Task: "T013 Backend /auth/confirm page test in backend/tests/auth-pages.test.ts"

# Launch implementation together:
Task: "T014 signin.html create-account mode"
Task: "T015 signin.ts signUp/resend (after T012 passes)"
Task: "T016 confirm.html/confirm.ts (after T013 passes)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001; T002–T006 manual, queued)
2. Complete Phase 2: Foundational (CRITICAL — blocks all stories)
3. Complete Phase 3: User Story 1 (extension signup + `/auth/confirm`)
4. **STOP and VALIDATE**: T012/T013 green; manual check — real email confirms via `/auth/confirm`
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (backend gate) → Test independently → Deploy/Demo — verification now enforced server-side
4. Add User Story 3 → Test independently → Deploy/Demo
5. Add User Story 4 (session refresh) → Test independently
6. Add User Story 5 (explicit Transcribe) → Test independently
7. US6: run full automated + manual smoke suite → release gate

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (extension signup + confirm page)
   - Developer B: US2 (backend gate + job.ts guidance)
   - Developer C (after A/B): US3, then US4, then US5 (shared files `signin.ts`, `job.ts`)
3. Maintainer: manual dashboard config (T002–T006) in parallel; smoke tests at release

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- [MANUAL] tasks are human-performed; automated implementers skip and report them
- Each user story is independently completable and testable
- Verify tests fail before implementing (TDD per research #10)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Backend env: add `SUPABASE_ANON_KEY` alongside existing `SUPABASE_URL`/`SUPABASE_SERVICE_KEY` (T010) — no other new backend env vars (research § Manual configuration)
- Supabase client in tests is mocked (`vi.mock`) per research #10 — no live Supabase in CI
## Oracle review fixes (extension, 2026-08-30)

Post-review deltas that supersede the implementation described above (T022/T029/T033 as written):

- **Toolbar never starts transcription (supersedes T022)**: `extension/src/background/index.ts` no longer checks the session or calls `startJobForVideo`. The action click always stores `pendingVideo` and opens `job.html`; `startJobForVideo` is called only by the job page's explicit Transcribe click (`extension/src/pages/job.ts`).
- **pendingVideo retained until success**: `job.ts` removes `pendingVideo` only after a successful job/transcript result. On `401` after the explicit start it shows the sign-in prompt (resume → `job.html`, so Transcribe is offered again); on `email_not_verified` it shows verification guidance with resend; other backend errors keep it too.
- **SW-owned refresh (supersedes T029's per-context logic)**: the one-refresh latch and single in-flight refresh live in the service worker only (`extension/src/background/refresh.ts`, initialized from `background/index.ts`). Page contexts (`background/api.ts` `apiFetch`) route a failed-401 retry through it via `chrome.runtime.sendMessage({ type: 'REFRESH_SESSION' })`; concurrent callers await the same operation; each failed request retries once only. `setSession` pings the SW (`SESSION_SET`) to re-arm the latch extension-wide.
- **Tests**: `extension/tests/toolbar.test.ts` (toolbar no-start), `extension/tests/job-start.test.ts` (explicit-start failure retention), `extension/tests/session-refresh.test.ts` (concurrent multi-context refresh/one refresh, one retry max).
