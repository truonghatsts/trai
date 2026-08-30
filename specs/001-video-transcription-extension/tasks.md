# Tasks: Video Transcription Extension

**Input**: Design documents from `/specs/001-video-transcription-extension/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/ (api.md, ui.md), quickstart.md

**Tests**: No test tasks generated — the spec does not request TDD. Validation is manual via `quickstart.md` scenarios S1–S8 (final Polish phase) plus curl-based contract checks run ad hoc per endpoint.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4)
- Include exact file paths in descriptions

## Path Conventions (from plan.md)

- Extension: `extension/` (Chrome MV3, unpacked) — `manifest.json`, `src/background/`, `src/content/`, `src/pages/`, `tests/`
- Backend: `backend/` (single Node/Fastify service: API + worker loop) — `src/api/`, `src/jobs/`, `src/db/`, `src/config.ts`, `tests/`
- Database: `supabase/` (SQL migrations for `jobs` + `transcripts`)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [X] T001 Create project structure per plan.md: `extension/`, `backend/`, `supabase/` top-level directories
- [X] T002 Initialize backend Node 20 + TypeScript project in `backend/` (package.json, tsconfig.json, Fastify + vitest deps, npm scripts dev/build/start)
- [X] T003 [P] Initialize extension TypeScript project in `extension/` (package.json, tsconfig.json, esbuild build script emitting to `extension/dist/`, npm scripts build/watch)
- [X] T004 [P] Configure linting and formatting tools (eslint + prettier configs for `backend/` and `extension/`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [X] T005 Create Supabase migration `supabase/migrations/001_init.sql` — `jobs` table (id uuid PK, user_id FK → auth.users, source_url text exact, status enum `queued|downloading|transcribing|ready|error`, duration_seconds int, created_at timestamptz, error_reason text NULL, retry_count int default 0, transcript_id uuid NULL) and `transcripts` table (id uuid PK, user_id FK, job_id uuid FK UNIQUE, source_url text denormalized, content text, completed_at timestamptz), bidirectional 1:1 FK link (jobs.transcript_id ↔ transcripts.job_id), partial unique index `(user_id) WHERE status NOT IN ('ready','error')` (FR-004), RLS policies scoping all rows to `auth.uid()` per data-model.md
- [X] T006 [P] Implement environment configuration in `backend/src/config.ts` — env vars `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `STT_PROVIDER` + provider key, `YTDLP_PATH` (research #2/#3/#5)
- [X] T007 [P] Implement Supabase client + auth middleware in `backend/src/db/client.ts` and `backend/src/api/auth.ts` — validates `Authorization: Bearer <supabase-jwt>` on every request, missing/invalid token → `401 {error:{code:"unauthorized"}}` (FR-001, contracts/api.md)
- [X] T008 Implement shared error envelope in `backend/src/api/errors.ts` — all non-2xx bodies `{ "error": { "code": "<machine-readable>", "message": "<human-readable>" } }` per contracts/api.md
- [X] T009 Implement Fastify app skeleton + route registration in `backend/src/app.ts` — mounts `backend/src/api/routes/` routers, applies auth middleware, starts worker loop on boot

**Checkpoint**: Foundation ready - user story implementation can now begin

---

## Phase 3: User Story 1 - Get a transcript for a public video (Priority: P1) 🎯 MVP

**Goal**: Click extension on a public video page → new tab opens immediately → sign-in → job moves `queued → downloading → transcribing → ready` with plain-text transcript; >5 min rejected before download; one active job; retry from error.

**Independent Test**: Load one public YouTube video under 5 minutes, click the extension, sign in, confirm the new tab eventually shows a readable plain-text transcript (quickstart S1); over-5-min rejected with no download (S2); failed job retries (S3).

### Implementation for User Story 1

- [X] T010 [US1] Create job repository in `backend/src/db/jobs.ts` — insert job, get job by id, update status/error_reason/transcript_id, retry transition (`error → queued`, `retry_count += 1`, `error_reason = NULL`), active-job check per data-model.md state machine
- [X] T011 [US1] Implement yt-dlp wrapper in `backend/src/jobs/ytdlp.ts` — duration probe via `yt-dlp -J <url>` (metadata only), audio download via `yt-dlp -f bestaudio -x` to worker temp dir, subprocess invocation per research #4
- [X] T012 [P] [US1] Implement STT client in `backend/src/jobs/stt.ts` — OpenAI Whisper API `audio/transcriptions` returning plain text, provider selectable via `STT_PROVIDER` env per research #5
- [X] T013 [US1] Implement `POST /api/jobs` create path in `backend/src/api/routes/jobs.ts` — validate URL (`400 invalid_url` / `not_a_video_page`), reject `duration_seconds > 300` with `400 duration_too_long` before any download (FR-003), reject second active job with `409 active_job_exists` (FR-004), create job → `201 {kind:"job", job:{id,status:"queued",...}}` per contracts/api.md
- [X] T014 [US1] Implement job pipeline in `backend/src/jobs/pipeline.ts` — probe → download → transcribe → finalize to `ready` with transcript row; any failure → `error` with best-effort `error_reason` (FR-013); delete downloaded audio in `finally` block immediately after STT returns (FR-010, research #7); no-speech video → `ready` with empty/noted transcript (edge case)
- [X] T015 [US1] Implement worker loop in `backend/src/jobs/worker.ts` — polls `queued` jobs, runs one job at a time via pipeline, updates status through `downloading`/`transcribing`/`ready` (FR-005, research #3)
- [X] T016 [US1] Implement `GET /api/jobs/{id}` in `backend/src/api/routes/jobs.ts` — returns `{job:{id,source_url,status,error_reason,retry_count,created_at,transcript_id}}` or `404 not_found` per contracts/api.md
- [X] T017 [US1] Implement `POST /api/jobs/{id}/retry` in `backend/src/api/routes/jobs.ts` — only when `status = error`; resets to `queued`, `retry_count += 1`, `error_reason = NULL` (FR-006, US1-AC4); non-error → `409 not_retryable`
- [X] T018 [US1] Create extension manifest `extension/manifest.json` — MV3, action, host permissions for video pages + backend base URL, background service worker, content script registration per plan.md
- [X] T019 [US1] Implement content script in `extension/src/content/video-detect.ts` — detects active tab is a public video page, captures **exact** `source_url` (no normalization, research #6) and `duration_seconds` when known (YouTube page metadata)
- [X] T020 [P] [US1] Implement extension API client in `extension/src/background/api.ts` — fetch wrapper attaching `Authorization: Bearer <supabase-jwt>` for all endpoints in contracts/api.md
- [X] T021 [US1] Implement background action handler in `extension/src/background/action.ts` — click → content script detection → not signed in: open `signin.html` (no job starts, US1-AC1); signed in: `POST /api/jobs` then open `job.html?job=<id>` immediately (FR-002); non-video page → `notice.html` (ui.md flow)
- [X] T022 [US1] Create sign-in page `extension/src/pages/signin.html` + `signin.ts` — Supabase Auth email/password form (FR-001, research #10); on success continue the pending action-click flow per ui.md
- [X] T023 [P] [US1] Create job page `extension/src/pages/job.html` + `job.ts` — polls `GET /api/jobs/{id}` every ~3 s (research #8), renders status mapping queued/downloading/transcribing/ready/error per contracts/api.md, `ready` shows plain-text transcript content (FR-007), `error` shows message + Retry button
- [X] T024 [P] [US1] Create non-video notice page `extension/src/pages/notice.html` — explains a public video page is required (edge case, ui.md)

**Checkpoint**: User Story 1 fully functional — quickstart S1 (core flow), S2 (over-5-min rejection), S3 (retry), S5 (single active job), S8 (non-video, no-speech, no-media-source) runnable

---

## Phase 4: User Story 2 - Reopen a stored transcript by revisiting the same URL (Priority: P2)

**Goal**: Revisit the exact same URL → stored transcript opens immediately; active job shows progress instead of duplicating.

**Independent Test**: Complete a transcript, reload the exact same URL, click the extension — stored transcript shown with no new job; tracking-param variant treated as a different URL (quickstart S4).

### Implementation for User Story 2

- [X] T025 [US2] Create transcript lookup in `backend/src/db/transcripts.ts` — find transcript by exact `source_url`, find transcript by id, delete transcript + owning job, cancel active job to `error ('deleted')` per data-model.md
- [X] T026 [US2] Extend `POST /api/jobs` in `backend/src/api/routes/jobs.ts` with lookup semantics (data-model.md § Lookup semantics) — 1st: transcript with exact `source_url` → `200 {kind:"transcript",...}` no new job (US2-AC1); 2nd: active job with exact `source_url` → `200 {kind:"job",...}` progress (US2-AC2); else existing create path (US2-AC3)
- [X] T027 [US2] Add transcript view mode to `extension/src/pages/job.html` + `job.ts` — render stored transcript from `kind: transcript` response (US2-AC1, ui.md action flow step 4)

**Checkpoint**: User Story 2 works — quickstart S4 (exact-URL reopen, no duplicate job, tracking-param edge case)

---

## Phase 5: User Story 3 - Manage transcript history (Priority: P3)

**Goal**: History page lists transcripts (source URL, status, date); view any completed transcript; delete any item forever.

**Independent Test**: After ≥1 completed transcript, open history, list, view, delete — item gone; revisiting the URL offers a new job (quickstart S7).

### Implementation for User Story 3

- [X] T028 [US3] Implement `GET /api/transcripts` in `backend/src/api/routes/transcripts.ts` — history list newest first, `{transcripts:[{id,source_url,status,created_at}]}` with `status` from owning job (FR-011, contracts/api.md)
- [X] T029 [US3] Implement `GET /api/transcripts/{id}` in `backend/src/api/routes/transcripts.ts` — `{transcript:{id,source_url,content,completed_at}}` or `404 not_found`
- [X] T030 [US3] Implement `DELETE /api/transcripts/{id}` in `backend/src/api/routes/transcripts.ts` — removes transcript row AND its job row (`204`); active job cancelled to `error ('deleted')` so a deleted item never resurrects on completion (FR-010, US3-AC2/3, edge case)
- [X] T031 [US3] Create history page `extension/src/pages/history.html` + `history.ts` — rows with source_url/status/created_at, View (ready items → Job page transcript view), Delete (→ `DELETE /api/transcripts/{id}`, row disappears) per ui.md

**Checkpoint**: User Story 3 works — quickstart S7 (list/view/delete, delete-while-processing)

---

## Phase 6: User Story 4 - Jobs keep running after the tab closes (Priority: P3)

**Goal**: Close the transcript tab mid-job; job still completes; reopening the extension shows the ready transcript.

**Independent Test**: Start a job, close the tab immediately, wait for the video's duration, reopen the extension — transcript ready (quickstart S6).

### Implementation for User Story 4

- [X] T032 [US4] Harden worker loop in `backend/src/jobs/worker.ts` — restart-safe claim of `queued` jobs, guaranteed terminal state (`ready` or `error`) for every job, no job left indefinitely in-progress (FR-012, SC-004)
- [X] T033 [US4] Make job page fully stateless in `extension/src/pages/job.html` + `job.ts` — entire page state reconstructible from `GET /api/jobs/{id}` alone, safe to close/reopen at any state (FR-012, ui.md)

**Checkpoint**: User Story 4 works — quickstart S6 (tab-close survival)

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T034 Run full quickstart.md validation S1–S8 — including transient-audio check (worker temp dir empty after completed jobs, no Supabase Storage writes, FR-010/SC-005) and 10-minute end-to-end gate (SC-001)
- [X] T035 [P] Write `README.md` at repo root — setup (backend `npm install && npm run migrate && npm run dev`, extension `npm install && npm run build` + load unpacked `extension/dist`), env vars, validation scenarios pointer per quickstart.md
- [X] T036 [P] Security hardening review — RLS policies enforce single-user scoping, service key only in backend env (never in extension), audio cleanup guaranteed on all pipeline exit paths

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3+)**: All depend on Foundational phase completion
- **Polish (Final Phase)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1)**: Can start after Foundational (Phase 2) - no dependencies on other stories
- **User Story 2 (P2)**: Can start after Foundational (Phase 2) - depends on US1's `POST /api/jobs` (extends the same route in `backend/src/api/routes/jobs.ts`, sequential, not parallel)
- **User Story 3 (P3)**: Can start after Foundational (Phase 2) - independent of US1/US2 (separate routes + page)
- **User Story 4 (P3)**: Depends on US1 (worker loop + job page it hardens) - no dependency on US2/US3

### Within Each User Story

- Repository/service before routes
- Backend endpoints before extension pages that consume them
- Core implementation before integration
- Story complete before moving to next priority

### Parallel Opportunities

- All Setup tasks marked [P] (T003, T004) can run in parallel
- All Foundational tasks marked [P] (T006, T007) can run in parallel
- US1 parallel cluster: T012 (STT client), T020 (extension API client), T023 (job page), T024 (notice page)
- US3 tasks T028/T029/T030 share `backend/src/api/routes/transcripts.ts` — sequential within that file
- US4 tasks T032 (backend) and T033 (extension) can run in parallel
- Polish tasks T035, T036 can run in parallel

---

## Parallel Example: User Story 1

```bash
# Launch independent US1 files together:
Task: "Implement STT client in backend/src/jobs/stt.ts"
Task: "Implement extension API client in extension/src/background/api.ts"
Task: "Create job page extension/src/pages/job.html + job.ts"
Task: "Create non-video notice page extension/src/pages/notice.html"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup
2. Complete Phase 2: Foundational (CRITICAL - blocks all stories)
3. Complete Phase 3: User Story 1
4. **STOP and VALIDATE**: quickstart S1/S2/S3/S5 on the launch-gate YouTube video
5. Deploy/demo if ready (SC-001/007/008 launch gate)

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 → Test (S1, S2, S3, S5) → Deploy/Demo (MVP!)
3. Add User Story 2 → Test (S4) → Deploy/Demo
4. Add User Story 3 → Test (S7) → Deploy/Demo
5. Add User Story 4 → Test (S6) → Deploy/Demo
6. Full quickstart run (S1–S8) in Polish phase

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable via its quickstart scenario(s)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Exact-URL semantics (research #6): never normalize `source_url` — tracking params make a different URL
- Transient audio (FR-010): delete downloaded audio in `finally`, never write to Supabase Storage