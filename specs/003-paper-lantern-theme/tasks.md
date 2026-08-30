---

description: "Task list for Paper Lantern Theme implementation"

---

# Tasks: Paper Lantern Theme

**Input**: Design documents from `/specs/003-paper-lantern-theme/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/ (`theme.md`), quickstart.md

**Tests**: INCLUDED — the spec/plan explicitly require automated coverage: `extension/tests/reading-layout.test.ts` (byte-preservation invariant + boundary rules, plan.md Test Strategy → SC-002/SC-003) and a `GET /auth/theme.css` reachability test in `backend/tests/auth-pages.test.ts` (→ SC-001). All other validation is manual via quickstart.md (V1–V6, R1–R5, responsive, reduced-motion, regression gate).

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (e.g., US1, US2, US3)
- **[MANUAL]**: Human-performed task (visual/browser checks) — not code; queue for the maintainer
- Include exact file paths in descriptions

## Path Conventions

- **Shared theme**: `shared/theme.css` (NEW — single source of truth, copied into both dists)
- **Extension**: `extension/src/pages/`, `extension/src/shared/`, `extension/tests/`, `extension/build.mjs`
- **Backend**: `backend/src/auth/pages/`, `backend/tests/`, `backend/scripts/build-auth.mjs`
- **Unchanged (explicit)**: `backend/src/app.ts` (existing `@fastify/static` serves `GET /auth/theme.css` — no route change), all API routes, `manifest.json`, `package.json`/lockfiles, tsconfigs, supabase/, env vars

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch creation — the only setup this feature needs (research.md § Manual configuration: no env vars, no dashboard config, no migrations)

- [x] T001 Create branch `003-paper-lantern-theme` from current work (`git checkout -b 003-paper-lantern-theme`) — research.md § Manual configuration, plan.md Phases & Dependencies; blocks all phases

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Canonical theme stylesheet + build wiring — MUST be complete before ANY user story can be implemented

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T002 Create `shared/theme.css` — canonical Paper Lantern stylesheet (light only, FR-009): `:root` tokens per contracts/theme.md §1 (`--paper #FAF5EC`, `--paper-card #FFFDF8`, `--ink #26221B`, `--indigo #403B8C`, `--indigo-ink #FFFFFF`, `--gold #E8A33D` decorative-only, `--gold-deep #B7791F` large-text/UI borders only — **gold never carries body or small text**); brand header styles incl. CSS-only lantern mark (`span.lantern`: gradients + border-radius + layered box-shadow, tassel via `::after`, decorative glow pulse, `aria-hidden`); component styles (indigo buttons w/ white text + hover `#36307A`, links, forms/inputs with 1–2 px `--gold-deep` border, cards, transcript surface `pre#content`: `--paper-card` bg + `--ink` text + serif stack `Georgia, "Iowan Old Style", "Palatino Linotype", serif` + ~65ch max measure + `line-height: 1.7` + `white-space: pre-wrap`); `:focus-visible` 2–3 px `--indigo` ring + 2 px offset on every link/button/input; `@media (prefers-reduced-motion: reduce)` kills glow pulse + all transitions; MUST NOT override `[hidden]` (contracts/theme.md §1 Integration rule; research #1/#3/#5/#7) — blocks US1 T005–T008, US3 T013/T014, US4 T016/T017
- [x] T003 [P] Add theme copy to `extension/build.mjs` `copyStatic()` — `cp('../shared/theme.css', path.join(dist, 'src', 'pages', 'theme.css'))` so extension pages link `theme.css` relatively (MV3 `style-src 'self'` + `chrome-extension://` origin — research #2; blocks US1 T005–T008)
- [x] T004 [P] Add theme copy to `backend/scripts/build-auth.mjs` — `cp('../../shared/theme.css', path.join(outDir, 'theme.css'))` so `GET /auth/theme.css` resolves under the existing `@fastify/static` serving of `dist/auth/pages` — **no route change** (research #2; blocks US3 T012–T014)

**Checkpoint**: Foundation ready — user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - A welcoming, coherent reading room across the extension (Priority: P1) 🎯 MVP

**Goal**: All four extension pages (sign-in, job/transcript, history, notice) present the Paper Lantern theme — warm paper surfaces, indigo text/accents, lantern gold highlights — with the unchanged "Video Transcript" name, CSS-only lantern mark, and "language reading room" tagline; the transcript area stays a clean high-contrast reading surface (FR-001, FR-002, US1-AC3)

**Independent Test**: Open every extension page (signin, job, history, notice) and visually confirm a consistent paper-lantern treatment, unchanged identity + CSS-only lantern mark (no `<img>`, no SVG), and tagline (spec.md US1; quickstart V1–V4)

### Implementation for User Story 1

- [x] T005 [P] [US1] Add `<link rel="stylesheet" href="theme.css">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, and the brand header (contracts/theme.md §1 exact markup — `<header class="brand">` with `span.lantern` + `brand-name` "Video Transcript" + `brand-tagline` "language reading room", placed above the page's single `<h1>`) to `extension/src/pages/signin.html` (depends T002, T003)
- [x] T006 [P] [US1] Add same stylesheet link + viewport meta + brand header to `extension/src/pages/job.html`; keep the transcript surface `pre#content` as the calmest element (contracts/theme.md §1; US1-AC3) (depends T002, T003)
- [x] T007 [P] [US1] Add same stylesheet link + viewport meta + brand header to `extension/src/pages/history.html` (depends T002, T003)
- [x] T008 [P] [US1] Add same stylesheet link + viewport meta + brand header to `extension/src/pages/notice.html` (depends T002, T003)

**Checkpoint**: User Story 1 fully functional — quickstart V1–V4 runnable; theme is a pure presentation layer (no page logic touched)

---

## Phase 4: User Story 2 - Transcripts read as sentence-by-sentence lines (Priority: P1)

**Goal**: The transcript view presents logical sentence/phrase units on separate lines via a display-only pure function; stored text stays byte-identical — no characters, spaces, or line breaks added, removed, or reordered (FR-003/004/005/006)

**Independent Test**: Open a transcript whose stored text is a single long paragraph → sentences appear on separate lines; diff displayed text (minus layout-inserted line breaks) against stored text → zero differences; transcripts with own line breaks show them honored (spec.md US2; quickstart R1–R5)

### Tests for User Story 2 (write FIRST — must FAIL before implementation)

- [x] T009 [P] [US2] Create unit suite `extension/tests/reading-layout.test.ts` — vitest, DOM-free, imports `splitIntoLines` from `extension/src/shared/reading-layout.ts`: assert invariant `splitIntoLines(t).split('\n').join('') === t` on EVERY fixture; sentence boundaries (`!` `?` `…` `。` `！` `？` `.` incl. `...` followed by closing quote/bracket chars then whitespace/EOL); period guards — no split for abbreviations (`mr. mrs. ms. dr. prof. st. vs. e.g. i.e. etc. approx. inc. ltd. u.s. u.k.`), initials (`J. Smith`), decimals (`3.14`); clause fallback only when no sentence boundary and length > `HARD_LIMIT` (200); own line breaks honored; CJK/no-punctuation degrade unbroken; empty/whitespace-only unchanged; emoji/Unicode passthrough; consecutive spaces/tabs/blank lines preserved; very long transcript O(n) (contracts/theme.md §2, research #4; plan.md Test Strategy → SC-002/SC-003)

### Implementation for User Story 2

- [x] T010 [US2] Create `extension/src/shared/reading-layout.ts` — DOM-free pure `splitIntoLines(text: string): string` + module-level named constant `HARD_LIMIT = 200` (only tuning knob); implement rules in FR-004 order: existing `\n` pass through verbatim → sentence-boundary splits with abbreviation/initial/decimal guards → clause fallback (`,` `;` `:` `，` `；` `：` em dash followed by whitespace) for lines > HARD_LIMIT with no sentence boundary → no confident boundary = span stays unbroken; output differs from input only by inserted `\n` (contracts/theme.md §2; depends T009 — suite green)
- [x] T011 [US2] Wire into `extension/src/pages/job.ts` `renderTranscript()` — replace `contentEl.textContent = content.length > 0 ? content : '(No speech detected in this video.)'` with `contentEl.textContent = content.length > 0 ? splitIntoLines(content) : '(No speech detected in this video.)'`; import from `../shared/reading-layout` (1-line change; empty-fallback message unchanged; storage/retrieval untouched — depends T010)

**Checkpoint**: User Stories 1 AND 2 both independently functional

---

## Phase 5: User Story 3 - Themed auth pages on the web, usable on any screen (Priority: P2)

**Goal**: `/auth/confirm` and `/auth/reset` carry the same Paper Lantern theme, reflow at 375 px portrait with no horizontal scroll, keep touch-friendly controls (≥44 px, inputs ≥16 px), and complete both flows with clear outcomes — zero functional change to the flows (FR-007)

**Independent Test**: Open email-confirmation and password-reset pages in a desktop browser and at 375 px portrait; theme renders, no horizontal scroll, all controls tappable, both flows complete (spec.md US3; quickstart V5/V6 + responsive checks)

### Tests for User Story 3 (write FIRST — must FAIL before implementation)

- [x] T012 [P] [US3] Extend `backend/tests/auth-pages.test.ts` — add `GET /auth/theme.css` → 200 with `text/css` content-type via `buildApp()` alongside the existing page-reachability tests; guards the build-copy step (T004) through the existing `pretest` hook (research #8; plan.md Test Strategy → SC-001; depends T004)

### Implementation for User Story 3

- [x] T013 [P] [US3] Add `<link rel="stylesheet" href="theme.css">` + brand header (contracts/theme.md §1 exact markup, above the page's `<h1>`) to `backend/src/auth/pages/confirm.html` (viewport meta already present — research #7; depends T002, T004)
- [x] T014 [P] [US3] Add same stylesheet link + brand header to `backend/src/auth/pages/reset.html` (depends T002, T004)
- [x] T015 [US3] Responsive/touch pass on both auth pages via `shared/theme.css` rules: interactive controls ≥44×44 px tap targets, inputs `font-size: 16px` minimum (prevents iOS zoom-on-focus), narrow-viewport reflow without horizontal scroll; verify at 375 px portrait (DevTools) that confirm-email and reset-password flows complete with clear outcomes ("Email verified…" / "Password updated…" — existing flow.ts/confirm.ts/reset.ts untouched, FR-011) (contracts/theme.md §1 Forms; plan.md Phase C; depends T013, T014) — **browser QA PASS** (2026-08-30): 375 px `scrollWidth === clientWidth === 375`, controls ≈48 px/44 px, inputs 16 px, CSS loaded; flow *completion* with real tokens not-testable (no valid Supabase tokens; both pages correctly showed expired-link states — see verification.md §6)

**Checkpoint**: User Stories 1–3 independently functional

---

## Phase 6: User Story 4 - Theme stays out of the way of accessibility (Priority: P2)

**Goal**: Visible keyboard focus on every control, WCAG AA text contrast on every themed surface, reduced-motion honored for the lantern glow, no essential information by color alone — across all six surfaces (FR-008)

**Independent Test**: Tab through every themed page (focus visible at all times), spot-check contrast with DevTools, enable `prefers-reduced-motion` (glow pulse disabled, content complete), confirm no color-alone info (spec.md US4; quickstart V-checks + reduced-motion check)

### Implementation for User Story 4

- [x] T016 [US4] Verify + fix keyboard focus and text contrast across all six surfaces: Tab through every control (focus ring visible at all times — FR-008 AC1); DevTools contrast picker on every text pair vs its surface against the token table in contracts/theme.md §1 (body text AA or better; `--gold` never carries text — AC2); adjust `shared/theme.css` tokens/rules only if a pair fails (depends T002, T005–T008, T013/T014) — **browser QA PASS** (2026-08-30): focused input computed outline indigo 3 px + 2 px offset; body `rgb(250,245,236)`/ink `rgb(38,34,27)`; static contrast table all AA/AAA (verification.md §4); no CSS change required
- [x] T017 [US4] Verify reduced-motion + no-color-alone across all six surfaces: `prefers-reduced-motion` disables lantern glow pulse + all transitions with no content loss (AC3); statuses/errors are text-first (`role="alert"` pattern unchanged), lantern mark is `aria-hidden` + adjacent text identity, no essential info conveyed by color alone (AC4) (depends T016 — same file `shared/theme.css` may need adjustment, sequential) — **browser QA PASS** (2026-08-30): reduce active → lantern animation/transition 0.00001 s; error/status rendered as text
- [x] T018 [P] [US4] Verify extension graceful reflow: in a narrow/resized window each extension page reflows within the theme with no horizontal scroll (viewport meta from T005–T008 + `white-space: pre-wrap` transcript surface; spec edge case; depends T005–T008) — **browser QA PASS** (2026-08-30): 375 px `scrollWidth === clientWidth === 375` on extension pages

**Checkpoint**: User Stories 1–4 independently functional

---

## Phase 7: User Story 5 - The theme changes nothing else (Priority: P2)

**Goal**: Prove the no-regression guarantee — same name, same flows, same transcript behavior, same backend; no gamification, no dark mode, no new data (FR-009/010/011/012/013)

**Independent Test**: Perform the existing flows (sign-in, transcribe, reopen stored transcript, delete from history, confirm email, reset password) and confirm every one behaves as before with only visual changes; no gamification, dark mode, or new data collection anywhere (spec.md US5; quickstart regression gate)

### Implementation for User Story 5 (proof tasks — no production code changes)

- [x] T019 [P] [US5] Regression: run existing automated suites — `cd extension && npm test` and `cd backend && npm test` — all pre-existing 001/002 tests green (extension: `auth-signup`, `auth-recovery`, `session-refresh`, `no-autostart`, `job-start`, `toolbar`, `video-detect`; backend: `auth-gate`, `auth-pages`, `pipeline`, `url`, `ytdlp`) (plan.md Test Strategy → SC-004)
- [x] T020 [P] [US5] Scope guard — verify across `extension/`, `backend/`, `shared/`: no streaks/rewards/points/badges/gamification, no dark mode (not even hidden), no product rename (only "Video Transcript"), no new data collection/transmission, no backend behavior change (no edits to `backend/src/app.ts`, routes, `flow.ts`/`confirm.ts`/`reset.ts`/`client.ts`, db layer, migrations), no timestamps/translations/vocabulary features, no image or font assets added (FR-009/010/011/012/013, SC-007; plan.md Non-Goals)
- [x] T021 [P] [US5] Quality gates — `cd backend && npm run typecheck && npm run lint` and `cd extension && npm run typecheck && npm run lint` — all green (002 precedent T043)

**Checkpoint**: All user stories (1–5) independently functional

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Full validation suite — final release gate

- [ ] T022 [P] [MANUAL] Run the manual visual checklist per `specs/003-paper-lantern-theme/quickstart.md`: V1–V6 across all six surfaces (theme consistency, CSS-only lantern, tagline, focus, contrast spot-check, no color-alone; V2 transcript surface calm + high-contrast); reading-layout checks R1–R5 (sentence lines, byte preservation diff, own line breaks honored, CJK/no-punctuation degrade, whitespace preservation); responsive checks at 375 px portrait on V5/V6 (no horizontal scroll, ≥44 px tap targets, both flows complete) + extension narrow-window reflow; reduced-motion check (glow/transitions disabled); qualitative calm "reading room" feel (SC-008) (depends T005–T018; SC-001/002/003/005/006/008) — **browser QA PASS (2026-08-30) for all non-transcript items**: V1–V6 visual, CSS load, 375 px no h-scroll, 44 px targets, focus 3 px/2 px, reduced-motion, readability, exact identity, color-alone, V2 reading-surface fixture, qualitative feel. **Remaining: R1–R5 need a real stored transcript** (none in env — not-testable; logic covered by T009 suite + fuzz, verification.md §2.1)
- [ ] T023 [P] [MANUAL] Regression gate per quickstart.md: run the 001 quickstart scenarios S1–S8 and 002 scenarios M1–M4 against the themed build — every flow works exactly as before, only visual presentation changed; search all surfaces for no streaks/rewards/points/badges, no dark-mode toggle, no new data-collection events; backend endpoints/rules/storage unchanged (depends T019, T020; SC-004, SC-007) — **static/scan portion PASS** (T019/T020); **live S1–S8/M1–M4 not-testable** (requires live backend + Supabase session + loaded extension)
- [ ] T024 Run the full `specs/003-paper-lantern-theme/quickstart.md` validation suite end to end (automated suites + V1–V6 + R1–R5 + responsive + reduced-motion + regression gate) and record results — final release gate (depends T009–T023)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 blocks everything
- **Foundational (Phase 2)**: Depends on Setup — BLOCKS all user stories (theme.css + both build-copy lines)
- **User Stories (Phase 3+)**: All depend on Foundational; then proceed in priority order (P1 → P2) or in parallel (see Parallel Opportunities)
- **Polish (Phase 8)**: Depends on all user stories being complete

### User Story Dependencies

- **US1 (P1)**: Foundational only (T002, T003). No dependency on other stories
- **US2 (P1)**: Foundational only (T002 indirectly via job.ts — actually disjoint files; splitIntoLines needs no theme.css). Fully independent of US1 — disjoint files (`reading-layout.ts`, `job.ts`, `reading-layout.test.ts` vs the four HTML pages)
- **US3 (P2)**: Foundational (T002, T004) + its own test T012. Independent of US1/US2
- **US4 (P2)**: Depends on US1 (T005–T008) + US3 (T013/T014) surfaces existing; T017 sequential after T016 (both may touch `shared/theme.css`)
- **US5 (P2)**: Depends on all code stories complete (regression across everything)

### Within Each User Story

- Tests MUST be written and FAIL before implementation (T009 before T010; T012 before T013/T014)
- Tests (if included) → shared infrastructure → pages → integration

### Parallel Opportunities

- **Lane A — Theme foundation**: T002 → T003, T004 ([P] together) → then US1 (T005–T008 [P]) and US3 (T013/T014 [P])
- **Lane B — Reading layout**: T009 → T010 → T011 — fully parallel with Lane A from the start (disjoint files; T011 touches `job.ts`, US1 touches `job.html` — different files)
- **Lane C — Backend auth**: T012 → T013/T014 → T015 (after Lane A T004)
- **Lane D — A11y + validation**: T016 → T017 (after US1 + US3); T018 [P] after US1; T019–T021 [P] after code complete; T022/T023 [P] manual after that; T024 final
- **Same-file conflicts to avoid**: `shared/theme.css` — T002 (foundational) first, then T016/T017 (US4) sequential; `backend/tests/auth-pages.test.ts` — T012 is the only addition, no conflict with existing tests; `extension/src/pages/job.html` (T006) vs `extension/src/pages/job.ts` (T011) — different files, safe in parallel

### Parallel Example: US1 + US2 (both P1)

```bash
# Launch tests together (must fail first):
Task: "T009 reading-layout.test.ts unit suite in extension/tests/"
Task: "T002 shared/theme.css (foundational, needed by US1)"

# Launch implementation together:
Task: "T005–T008 signin/job/history/notice.html brand header + link (after T002/T003)"
Task: "T010 reading-layout.ts splitIntoLines (after T009 passes)"
Task: "T011 job.ts renderTranscript wiring (after T010)"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Foundational (CRITICAL — T002–T004 block all stories)
3. Complete Phase 3: User Story 1 (four extension pages themed)
4. **STOP and VALIDATE**: build + reload unpacked; visual check V1–V4 (theme, lantern, tagline, reading surface)
5. Deploy/demo if ready

### Incremental Delivery

1. Complete Setup + Foundational → Foundation ready
2. Add User Story 1 (extension theme) → Test independently → Deploy/Demo (MVP!)
3. Add User Story 2 (reading layout) → Test independently (suite + R1–R5) → Deploy/Demo
4. Add User Story 3 (backend auth theme + responsive) → Test independently → Deploy/Demo
5. Add User Story 4 (a11y pass) → Test independently
6. Add User Story 5 (regression + scope guard proof) → Test independently
7. Phase 8: full quickstart suite → release gate

### Parallel Team Strategy

1. Team completes Setup + Foundational together
2. Once Foundational is done:
   - Developer A: US1 (four extension HTML pages)
   - Developer B: US2 (reading-layout.ts + job.ts + tests) — fully parallel with A
   - Developer C: US3 (backend auth pages + responsive pass)
3. Developer A or C: US4 (a11y verification, needs all six surfaces)
4. Maintainer: US5 proof tasks + Phase 8 manual validation at release

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- Verify tests fail before implementing (TDD per plan.md Test Strategy)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- No production code changes outside the listed files: `shared/theme.css` (NEW), `extension/build.mjs`, `extension/src/pages/{signin,job,history,notice}.html`, `extension/src/pages/job.ts` (1 line), `extension/src/shared/reading-layout.ts` (NEW), `extension/tests/reading-layout.test.ts` (NEW), `backend/scripts/build-auth.mjs`, `backend/src/auth/pages/{confirm,reset}.html`, `backend/tests/auth-pages.test.ts`
- Explicitly untouched: `backend/src/app.ts`, all API routes, `flow.ts`/`confirm.ts`/`reset.ts`/`client.ts`, db layer, migrations, `manifest.json`, `package.json`/lockfiles, tsconfigs, env vars, Supabase/dashboard config (plan.md Unchanged list)

---

## FR / SC Coverage Matrix

| Requirement | Covered by |
|---|---|
| FR-001 (cohesive theme, 4 extension pages) | T002, T005–T008 (US1) |
| FR-002 (identity + CSS-only lantern + tagline) | T002, T005–T008 (US1) |
| FR-003 (sentence/phrase lines) | T009, T010, T011 (US2) |
| FR-004 (splitting order: breaks → sentence → clause) | T009, T010 (US2) |
| FR-005 (degrade safely, no guessing) | T009, T010 (US2) |
| FR-006 (exact preservation) | T009 (invariant), T010, T011 (US2) |
| FR-007 (backend pages themed, responsive, touch) | T002, T004, T012–T015 (US3) |
| FR-008 (a11y: focus, AA, reduced-motion, no color-alone) | T002, T016–T018 (US4), T022 |
| FR-009 (light only) | T002, T020, T023 (US5) |
| FR-010 (no gamification/rename) | T020, T023 (US5) |
| FR-011 (no backend behavior change) | T019, T020, T023 (US5) |
| FR-012 (no new data) | T020, T023 (US5) |
| FR-013 (no timestamps/translations/vocab/ownership) | T020, T023 (US5) |
| SC-001 (6 surfaces themed) | T012, T022 (V1–V6) |
| SC-002 (byte preservation) | T009, T022 (R2) |
| SC-003 (sentence coverage / safe degrade) | T009, T022 (R1, R4) |
| SC-004 (0 regressions 001/002 flows) | T019, T023 |
| SC-005 (a11y checks) | T016–T018, T022 |
| SC-006 (auth pages no horizontal scroll @ narrow) | T015, T022 |
| SC-007 (0 gamification / 0 dark mode / 0 new data / 0 backend change) | T020, T023 |
| SC-008 (qualitative reading room) | T022 |

**Coverage result: PASS** — all 13 FRs and all 8 SCs map to at least one task; every user story phase ends with an independent test per spec.md.
---

## Verification Status (2026-08-30, executor — final reconciliation, browser QA incorporated)

Automated + static evidence from full /speckit.verify.run-style run; browser QA (agent-browser, read-only) incorporated. See [verification.md](verification.md).

**Completed on evidence**: T001 (branch `003-paper-lantern-theme` active) · T002 (theme.css, tokens/contrast/focus/reduced-motion/`[hidden]`-safe) · T003/T004 (CSS copied to both dists; sha `0c40163b…` identical ×3) · T005–T008 (brand header + link + viewport on 4 extension pages) · T009 (reading-layout.test.ts green, 5 tests; TDD fail-first not verifiable post-hoc) · T010 (splitIntoLines implemented in planned `extension/src/shared/reading-layout.ts`, contract rules + 5000-run fuzz invariant) · T011 (renderTranscript wiring) · T012 (auth stylesheet reachability test: 200 + text/css) · T013/T014 (confirm/reset.html brand + link) · T015 (responsive/touch: 375 px no h-scroll, 44 px/16 px controls — browser QA; flow completion with real tokens not-testable) · T016 (focus 3 px/2 px + readability/contrast — browser QA) · T017 (reduced-motion + no-color-alone — browser QA) · T018 (extension 375 px reflow — browser QA) · T019 (all 001/002 suites green: ext 31 pre-existing + 5 new, be 28 + 1 new) · T020 (scope guard scans clean) · T021 (typecheck + lint green, both projects)

**Not completed — evidence missing (environment-limited, all manual)**:
- T022: all browser-verifiable items PASS (V1–V6, responsive, reduced-motion, qualitative); **R1–R5 real-stored-transcript checks remain** — no stored authenticated transcript in env (logic covered by automated suite + fuzz)
- T023: live S1–S8/M1–M4 flows need live backend + Supabase session + loaded extension; scans/automated portion PASS
- T024: full quickstart gate — depends on T022 (R1–R5) + T023
