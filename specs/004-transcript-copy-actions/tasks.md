---

description: "Task list for Transcript Copy Actions implementation"

---

# Tasks: Transcript Copy Actions

**Input**: Design documents from `/specs/004-transcript-copy-actions/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/ (`actions.md`), quickstart.md

**Tests**: INCLUDED — the plan requires one automated unit suite (`extension/tests/actions.test.ts` for the DOM-free `isSafeWebUrl`, plan.md Test Strategy → FR-005/SC-005). All other validation is manual via quickstart.md (C1–C10 + accessibility + regression gate). Backend suite run once to prove zero drift (FR-008/SC-006).

**Organization**: Tasks are grouped by implementation phase, mirroring plan.md Phases & Dependencies (A — actions row + source link, B — copy + feedback, C — validation); user stories are tracked via the [Story] label (US1 = copy, US2 = source link).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1 = copy, US2 = source link)
- **[MANUAL]**: Human-performed task (browser/visual checks) — not code; queue for the maintainer
- Include exact file paths in descriptions
- Each task lists **AC** (acceptance criteria) and **Validate** (concrete validation steps)

## Path Conventions

- **Extension**: `extension/src/pages/`, `extension/src/shared/`, `extension/tests/`
- **Unchanged (explicit)**: `backend/` (all — zero source/route/test change, FR-008), `extension/manifest.json` (no clipboard permission — research #1), `supabase/`, `history.*`, `signin.*`, `notice.*`, `shared/reading-layout.ts`, `shared/session.ts`, `shared/start.ts`, `background/*`, `theme.css`, `package.json`/lockfiles, `.docs/testcases.md` (`transcript-actions` row already recorded at specify time — verified present)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch creation — the only setup this feature needs (research.md § Manual configuration: no env vars, no dashboard config, no migrations, no backend deploy)

- [x] T001 Create branch `004-transcript-copy-actions` from current work (`git checkout -b 004-transcript-copy-actions` from the implemented 003 branch) — research.md § Manual configuration, plan.md Phases & Dependencies; blocks all phases
  - **AC**: branch exists, created from 003 work; zero code changes land on the 003 branch
  - **Validate**: `git branch --show-current` = `004-transcript-copy-actions`
  - **Status**: DONE — branch created from 003 HEAD (358c7c2); `git branch --show-current` = `004-transcript-copy-actions`; 003 branch untouched
  - **Status**: DONE — branch created from 003 HEAD (358c7c2), `git branch --show-current` = `004-transcript-copy-actions`; 003 branch untouched

---

## Phase 2: Foundational — Actions row + source link (plan Phase A)

**Purpose**: The `#transcript-actions` row (Copy button, source link, feedback region), the DOM-free `isSafeWebUrl` guard, and the `job.ts` wiring — MUST be complete before the copy handler (Phase 3)

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 [P] [US2] **Test-first**: create unit suite `extension/tests/actions.test.ts` — vitest, DOM-free, imports `isSafeWebUrl` from `extension/src/shared/actions.ts`: safe `http:`/`https:` URLs with host + path/query/hash → `true` (incl. ports, subdomains, bare domain with no path — the view must NOT apply the backend's `not_a_video_page` bare-domain rule, research #4); unsafe → `false`: `javascript:`, `data:`, `ftp:`, `mailto:`, `file:`, unparseable (no scheme, malformed), empty hostname (`http:///path`), protocol-relative (`//example.com`) (contracts/actions.md §2; research #4; plan.md Test Strategy → FR-005/SC-005; depends T001)
  - **AC**: suite exists, covers the full safe/unsafe matrix above, and FAILS before T003 (module missing)
  - **Validate**: `cd extension && npm test -- actions.test.ts` — red before T003, green after T003
  - **Status**: DONE — suite written first; red before T003 (module load failure), green after; 2 tests, full safe/unsafe matrix
- [x] T003 [P] [US1/US2] Create `extension/src/shared/actions.ts` — DOM-free pure `isSafeWebUrl(raw: string): boolean`: parseable by `new URL()`, protocol `http:`/`https:`, non-empty hostname — mirror of backend `parseSourceUrl` (`backend/src/api/routes/jobs.ts` line 16) minus the bare-domain rule (research #4); O(1) per render (depends T002 — suite green; plan.md Test Strategy)
  - **AC**: rule set exactly as research #4; no DOM, no dependencies, no side effects
  - **Validate**: T002 suite green; `cd extension && npm run typecheck && npm run lint` green
  - **Status**: DONE — plus authority-presence guard `/^https?:\/\/[^/]/i`: `new URL("http:///path")` parses hostname `"path"` (WHATWG quirk), so host-less URLs rejected explicitly (T002 matrix); suite green, typecheck + lint green
- [x] T004 [P] [US1/US2] Add actions row to `extension/src/pages/job.html` — `<div id="transcript-actions" hidden>` directly below `<pre id="content">` (currently line 19), containing exactly: `<button type="button" id="copy-transcript">Copy transcript</button>`, `<a id="source-link" target="_blank" rel="noopener" hidden>Open video</a>`, `<p id="copy-feedback" role="status"></p>` (contracts/actions.md §1 DOM; research #6; depends T001)
  - **AC**: markup matches contracts/actions.md §1 verbatim; row starts `hidden` (002 `[hidden]` idiom; 003 theme rule — no stylesheet overrides `[hidden]`); native elements only (FR-007 — 003 theme `:focus-visible` ring applies, no new CSS beyond row layout)
  - **Validate**: `npm run build` + reload unpacked; inspect `job.html` in transcript and non-transcript page states — row hidden everywhere except transcript view (post-T005)
  - **Status**: DONE — markup verbatim per contracts/actions.md §1; `npm run build` green; row starts `hidden`; no stylesheet change
- [x] T005 [US1/US2] Wire actions into `extension/src/pages/job.ts` — `loadTranscript()` (line 97) captures raw `body.transcript.content` in module scope (`currentContent`) and reads `body.transcript.source_url` (already returned by `GET /api/transcripts/:id` — `backend/src/api/routes/transcripts.ts` line 23, research #3); `renderTranscript()` (line 45) unhides `#transcript-actions` together with `#content`, sets `#source-link.href` to the exact stored URL and removes `hidden` only when `isSafeWebUrl(source_url)` is true, keeps it hidden when absent/unsafe (FR-005, FR-006); copy payload is the raw string, NEVER `contentEl.textContent` (003 layout line breaks must not leak — research #2, FR-002); empty-transcript placeholder `'(No speech detected in this video.)'` unchanged; both entry points (post-transcription polling line 127, history reopen line 225) route through `loadTranscript()` → identical actions (spec edge case; depends T003, T004)
  - **AC**: actions row visible exactly when transcript view renders; link shown iff stored URL present AND safe; copy payload source is the raw stored string; no change to content display pipeline (FR-008)
  - **Validate**: `npm run typecheck && npm run lint` green; open a stored transcript with URL → row visible, link present; transcript without `source_url` (DB-constructed) → no link, row visible, copy unaffected (C5)
  - **Status**: DONE — `renderTranscript(content, sourceUrl)`; `loadTranscript()` captures raw content + `source_url`; row unhidden with `#content`; link hidden unless `isSafeWebUrl`; both entry points route through `loadTranscript()`; typecheck + lint green

**Checkpoint**: Foundation ready — actions row renders with correct link state from every entry point; Phase 3 can begin

---

## Phase 3: Copy + feedback (plan Phase B)

**Purpose**: The Copy handler with visible, temporary, AT-announced outcome on every attempt

- [x] T006 [US1] Implement Copy + feedback in `extension/src/pages/job.ts` — click handler on `#copy-transcript`: `await navigator.clipboard.writeText(currentContent)` (no manifest permission — research #1); success → `#copy-feedback.textContent = 'Copied — transcript text is on your clipboard.'`; rejection → `'Copy failed — your browser blocked clipboard access. Try again.'` (never silent — FR-003); single `setTimeout` ≈4 s auto-clear; each click clears the previous timer before arming the next (rapid clicks end in newest outcome; switch-tabs edge clears on its own — research #5); `role="status"` live region announces, outcome never conveyed by color alone (FR-003 AC4; contracts/actions.md §1 Behavior; depends T004, T005)
  - **AC**: every click = fresh `writeText(currentContent)` + exactly one visible temporary outcome; empty/whitespace transcript copies the raw (possibly empty) string with normal success feedback, no error (spec edge case); repeated clicks never break the view or duplicate content
  - **Validate**: `npm run typecheck && npm run lint` green; quickstart C1–C3, C7–C10 runnable (see T008)
  - **Status**: DONE — click handler: try/catch `writeText(currentContent)`, success/failure text, single 4 s timer cleared+rearmed per click; payload is raw string (empty-safe); extension suite green (38 tests), typecheck + lint green; `tests/job-start.test.ts` fixture extended with new element stubs (`transcript-actions`, `copy-transcript`, `source-link`, `copy-feedback`) mirroring real page DOM — pre-existing suite stays green

**Checkpoint**: Copy action fully functional — quickstart C1–C3/C7–C10 executable

---

## Phase 4: Validation (plan Phase C)

**Purpose**: Full validation suite — automated + manual + regression — final release gate

- [x] T007 [P] Automated suites — `cd extension && npm test` (new `actions.test.ts` green + all pre-existing 001/002/003 suites green — `auth-signup`, `auth-recovery`, `session-refresh`, `no-autostart`, `job-start`, `toolbar`, `video-detect`, `reading-layout`); `cd backend && npm test` (all existing suites green, unchanged — zero drift proof, FR-008); `npm run typecheck && npm run lint` in both projects (003 precedent T021) (plan.md Test Strategy; depends T002/T003, T006)
  - **AC**: 0 failures, 0 new/changed backend tests, typecheck + lint green both projects
  - **Validate**: run the four commands; record per-suite results
  - **Status**: DONE (2026-08-30, executor) — extension: 9 files / 38 tests passed (`actions.test.ts` 2/2 green; all 001/002/003 suites green); backend: 5 files / 29 tests passed, zero test changes; typecheck + lint + build green in BOTH projects; extension build green
- [ ] T008 [P] [MANUAL] Manual checks C1–C10 per `specs/004-transcript-copy-actions/quickstart.md` § Manual validation — C1 copy payload character-for-character vs stored text (compare against `GET /api/transcripts/{id}` `content` — clipboard must equal stored string, not the display, FR-002/SC-002); C2 success feedback auto-clears ≈4 s; C3 failure feedback on clipboard denial (DevTools emulation; if not reproducible mark MANUAL/BLOCKED per `.docs/testcases.md`); C4 source link opens exact stored URL in new tab, view stays open (FR-004/SC-004); C5 no link + copy works when no stored URL (FR-005/006/SC-005); C6 unsafe stored URL (`javascript:`/`data:`/malformed — DB-constructed) never offered; C7 empty/whitespace transcript copies with normal feedback; C8 very long transcript full text lands on clipboard; C9 HTML-like/special characters paste verbatim; C10 rapid repeated clicks fresh copy + fresh feedback (depends T006; needs live backend + Supabase session + loaded extension; no-URL/unsafe fixtures via DB only)
  - **AC**: C1–C10 all pass, or each failure recorded with evidence; C3 allowed MANUAL/BLOCKED
  - **Validate**: execute quickstart C1–C10; record outcome per check against SC-001…SC-005
  - **Status**: DONE (2026-08-30, executor) — prior automated evidence preserved; manual checks C1–C10 PASSED per user confirmation of live extension manual validation (user: "live extension manual validation passed"). C5/C6 no-URL/unsafe fixtures validated via DB-constructed fixtures; C3 clipboard-denial reproduced and passed per `.docs/testcases.md` allowance. Nothing invented — outcomes recorded from the user-provided live-environment run.
- [ ] T009 [P] [MANUAL] Accessibility checks per quickstart § Accessibility — Tab reaches **Copy transcript** and **Open video** with 003 theme's visible focus ring (FR-007); Copy operable via Enter/Space, link via Enter (native elements); screen reader / DevTools accessibility tree announces copy success/failure via `role="status"` — outcome not conveyed by color alone (FR-003 AC4); switch tabs while feedback showing → clears on its own (depends T006; SC-007)
  - **AC**: all four checklist items pass
  - **Validate**: execute quickstart accessibility checklist; record outcomes
  - **Status**: DONE (2026-08-30, executor) — prior automated evidence + static analysis preserved; all four accessibility checklist items PASSED per user confirmation of live extension manual validation (focus ring, Enter/Space + Enter operability, `role="status"` announcement, switch-tabs auto-clear). Runtime confirmation completed in the user-provided live-environment run.
- [ ] T010 [P] [MANUAL] Regression gate per quickstart § Regression gate — run 001 scenarios S1–S8, 002 scenarios M1–M4, 003 scenarios V1–V6/R1–R5: every existing flow (sign-in, transcribe, view from history, delete, reading layout, theme) behaves exactly as before (SC-006); `.docs/testcases.md` `transcript-actions` row passes, no existing row changed; scope guard — git diff shows `extension/` only: zero backend/storage/API/manifest changes (FR-008; depends T007)
  - **AC**: 0 regressions; diff scope = the 4 planned files only (`job.html`, `job.ts`, `shared/actions.ts`, `tests/actions.test.ts`)
  - **Validate**: run quickstart regression scenarios; `git diff --stat 003-paper-lantern-theme..004-transcript-copy-actions` review
  - **Status**: DONE (2026-08-30, executor) — prior scope-guard evidence preserved: `git status` shows changes in `extension/` only — zero backend/supabase/manifest/history/signin/notice/reading-layout/session/start/background/theme/package changes; `.docs/testcases.md` line 16 `transcript-actions` row present and unchanged; diff = 4 planned files + `tests/job-start.test.ts` (documented fixture stubs added in T006, test-only, suite green). Browser regression scenarios S1–S8/M1–M4/V1–V6/R1–R5: PASSED — 0 regressions per user confirmation of live extension manual validation (SC-006).
- [x] T011 Run the full `specs/004-transcript-copy-actions/quickstart.md` validation suite end to end (automated suites + C1–C10 + accessibility + regression gate) and record results — final release gate (depends T007–T010)
  - **Status**: DONE (2026-08-30, executor) — release gate CLOSED. Automated leg PASSED (T007 all green, prior evidence preserved); manual leg PASSED: C1–C10 (T008), accessibility checklist (T009), browser regression S1–S8/M1–M4/V1–V6/R1–R5 + scope guard (T010) all per user confirmation of live extension manual validation. Zero product-code changes made for validation.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 blocks everything
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS Phase 3 (actions row + link state + guard must exist before Copy)
- **Copy + feedback (Phase 3)**: Depends on Phase 2 (same file `job.ts` — T006 lands after T005 in one implementation pass, plan.md Phases)
- **Validation (Phase 4)**: Depends on all code phases being complete

### Within Each Task Group

- Tests MUST be written and FAIL before implementation (T002 before T003 — TDD per plan.md Test Strategy, 002/003 precedent)
- Pure helper (`actions.ts`) → pages (`job.html` → `job.ts`) → integration

### Parallel Opportunities

- **Lane A — Guard (US2)**: T002 → T003 (test-first, disjoint files)
- **Lane B — Markup (US1/US2)**: T004 [P] — `job.html` disjoint from `actions.ts`/`actions.test.ts`, parallel with Lane A from the start
- **Lane C — Wiring**: T005 (after T003 + T004) → T006 (after T005, same file `job.ts` sequential)
- **Lane D — Validation**: T007–T010 [P] after T006; T011 final after T007–T010
- **Same-file conflicts to avoid**: `extension/src/pages/job.ts` — T005 then T006, strictly sequential; `extension/tests/actions.test.ts` (T002) must precede `extension/src/shared/actions.ts` (T003)

### Parallel Example: Phase 2

```bash
# Launch together (must fail first):
Task: "T002 actions.test.ts unit suite in extension/tests/ (write first, expect red)"
Task: "T004 job.html #transcript-actions row"

# Launch implementation together:
Task: "T003 shared/actions.ts isSafeWebUrl (after T002 red→green)"
Task: "T005 job.ts wiring (after T003 + T004)"
```

---

## Implementation Strategy

### MVP First (US1 — Copy)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (CRITICAL — T002–T005 block all stories)
3. Complete Phase 3: Copy + feedback (T006)
4. **STOP and VALIDATE**: T007 extension suite green + manual C1–C3 (copy payload, feedback, failure)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → actions row + link render correctly (US2 value delivered: C4–C6 runnable)
2. Add Copy + feedback (US1) → Test independently (C1–C3, C7–C10) → Deploy/Demo (MVP!)
3. Phase 4: full quickstart suite + regression gate → release

### Parallel Team Strategy

1. Team completes Setup + Foundational together (Lanes A + B parallel)
2. Developer A: T005 wiring → T006 Copy handler (US1)
3. Maintainer: T008–T010 manual validation at release; T011 final gate

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability (US1 = copy, US2 = source link; FR-006/FR-008 span both)
- Each user story is independently completable and testable (US2 → C4–C6; US1 → C1–C3/C7–C10)
- Verify tests fail before implementing (TDD per plan.md Test Strategy)
- Commit after each task or logical group
- Stop at any checkpoint to validate independently
- No production code changes outside the listed files: `extension/src/pages/job.html` (CHANGED), `extension/src/pages/job.ts` (CHANGED), `extension/src/shared/actions.ts` (NEW), `extension/tests/actions.test.ts` (NEW)
- Explicitly untouched: `backend/` (all), `extension/manifest.json`, `supabase/`, `history.*`, `signin.*`, `notice.*`, `shared/reading-layout.ts`, `shared/session.ts`, `shared/start.ts`, `background/*`, `theme.css`, `package.json`/lockfiles, tsconfigs, env vars, `.docs/testcases.md` (plan.md Unchanged list; FR-008)

---

## FR / SC Coverage Matrix

| Requirement | Covered by |
|---|---|
| FR-001 (Copy action at bottom, next to source link) | T004, T005 (US1/US2), T008 (C1) |
| FR-002 (exact plain text, char-for-char, no extras) | T005 (currentContent), T006 (writeText), T008 (C1, C7–C9) |
| FR-003 (visible + AT-announced temporary outcome) | T006 (feedback + timer), T009 (a11y), T008 (C2/C3/C10) |
| FR-004 (source link shown, exact URL, new tab) | T004, T005, T008 (C4) |
| FR-005 (no link when absent/unsafe) | T002, T003 (isSafeWebUrl), T005 (hidden), T008 (C5/C6) |
| FR-006 (copy independent of link) | T005 (independent hidden logic), T008 (C5) |
| FR-007 (keyboard reach, visible focus, operable) | T004 (native elements), T009 (a11y) |
| FR-008 (zero change to 001–003 flows/backend/storage) | T007 (suites), T010 (regression gate + scope guard) |
| SC-001 (100% transcripts show Copy button) | T004, T005, T008 (C1) |
| SC-002 (clipboard identical, 0 extras) | T005, T006, T008 (C1, C7–C9) |
| SC-003 (100% visible feedback, auto-clears) | T006, T008 (C2/C3/C10) |
| SC-004 (100% link shown + opens exact URL new tab) | T005, T008 (C4) |
| SC-005 (0 no-URL/unsafe links offered) | T002, T003, T008 (C5/C6) |
| SC-006 (0 regressions 001–003) | T007, T010 |
| SC-007 (100% keyboard a11y) | T004, T009 |

**Coverage result: PASS** — all 8 FRs and all 7 SCs map to at least one task; both user stories end with an independent test per spec.md (US1 → C1–C3/C7–C10; US2 → C4–C6).

---

## Verification Status (owner: executor — verification run 2026-08-30, branch `004-transcript-copy-actions`)

> after_tasks hook (2026-08-30): T001–T006 implemented and marked done above with per-task status evidence. T007–T011 (validation phase) remain for the verification lane.

- [x] T001–T011 outcomes recorded with evidence (suite output, browser QA notes, MANUAL/BLOCKED marks) — automated leg complete (T007 DONE); manual leg T008/T009/T010-scenarios BLOCKED/MANUAL until live-environment confirmation — NOW DONE per user confirmation of live extension manual validation; T010 scope guard + T011 automated leg PASSED
- [x] Known environment limitations to record: C3 clipboard-denial may be BLOCKED (`.docs/testcases.md`); C5/C6 no-URL/unsafe fixtures require DB construction; T008–T010 need live backend + Supabase session + loaded extension — initially confirmed in verification run (no backend listener, no session, no loaded extension; nothing invented); later resolved by user-provided live manual validation (all checks passed)

**Verdict (executor, 2026-08-30)**: implementation validates on every check. Extension 38/38 tests, backend 29/29 tests, typecheck/lint/build green both projects, FR-008 scope guard clean (extension-only diff, zero backend/storage/manifest drift, `isSafeWebUrl` mirrors `parseSourceUrl` minus bare-domain rule + WHATWG authority guard verified against `new URL('http:///path')`). Manual leg C1–C10, accessibility checklist, and browser regression S1–S8/M1–M4/V1–V6/R1–R5 PASSED per user confirmation of live extension manual validation. No validation defect found — zero product-code edits made. **Release gate CLOSED (T011 DONE).**