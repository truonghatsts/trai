---

description: "Task list for TRAI Extension Rebrand implementation"

---

# Tasks: TRAI Extension Rebrand

**Input**: Design documents from `/specs/005-trai-extension-rebrand/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/ (`brand.md`), quickstart.md

**Tests**: NO new behavioral tests — **asset-only exception recorded** (constitution I, "documentation/asset-only changes MAY skip behavioral tests with an explicit exception noted in the task"; plan.md Constitution Check → research #8 → plan Test Strategy). This change is presentation + assets only (FR-007): zero behavior or config logic exists to test — a manifest-JSON assertion was considered and rejected in research #8 (asserts static data, not behavior; would churn on every rebrand). Verification = existing suites stay green (zero-drift proof, SC-004) + builds regenerate dist + manual B1–B9 + regression gate (quickstart.md).

**Organization**: Tasks are grouped by implementation phase, mirroring plan.md Phases & Dependencies (A — icon assets, B — manifest + build wiring, C — brand text, D — docs + verification); user stories tracked via the [Story] label (US1 = name, US2 = tagline, US3 = icon, US4 = nothing else changes).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1 = name, US2 = tagline, US3 = icon, US4 = nothing else changes)
- **[MANUAL]**: Human-performed task (browser/visual checks) — not code; queue for the maintainer
- Include exact file paths in descriptions
- Each task lists **AC** (acceptance criteria) and **Validate** (concrete validation steps)

## Path Conventions

- **Extension**: `extension/src/pages/`, `extension/src/icons/` (NEW), `extension/manifest.json`, `extension/build.mjs`, `extension/tests/`
- **Backend**: `backend/src/auth/pages/` — HTML only; `backend/src/**/*.ts` UNCHANGED (FR-007)
- **Shared**: `shared/theme.css`
- **Docs**: `.docs/testcases.md` (CHANGED, FR-009), `specs/005-trai-extension-rebrand/quickstart.md` (exists, current — run guide only, no edit)
- **Unchanged (explicit)**: all `.ts` anywhere (extension page logic, background, backend routes/flow/auth — research #1 confirms zero `.ts` references brand text), `backend/scripts/build-auth.mjs`, `extension/src/pages/*.ts`, `supabase/`, `extension/tests/*`, `backend/tests/*`, `README.md` (repo-internal, spec assumption), specs/001–004 (FR-008, SC-005), manifest `description`/version/permissions/host_permissions, all storage keys (`vtToken`, `pendingVideo`) and API routes (FR-007)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Branch creation — the only setup this feature needs (research.md § Manual configuration: no env vars, no dashboard config, no migrations, no backend deploy beyond rebuild)

- [x] T001 Create branch `005-trai-extension-rebrand` from current work (`git checkout -b 005-trai-extension-rebrand` from the implemented 004 branch, HEAD b65afb0) — research.md § Manual configuration, plan.md Phases & Dependencies; blocks all phases
  - **AC**: branch exists, created from 004 work; zero code changes land on the 004 branch; feature docs carried onto the branch (`specs/005-trai-extension-rebrand/`, `.docs/testcases.md`, `.specify/` are currently untracked — commit them with the first implementation commit)
  - **Validate**: `git branch --show-current` = `005-trai-extension-rebrand`; `git log --oneline -1` = 004 HEAD b65afb0

---

## Phase 2: Icon assets (plan Phase A — US3)

**Purpose**: The lantern-only icon set — SVG source of truth + four committed PNGs. MUST be complete before manifest wiring verification (Phase 3)

- [x] T002 [US3] Create `extension/src/icons/icon.svg` — lantern-only glyph (no text, no wordmark), full-bleed square viewBox, transparent background, glyph ≈85% of canvas so it reads at 16 px; reproduces 003's CSS lantern (`shared/theme.css` `.lantern`) in the exact 003 token palette: `--gold #E8A33D` rounded body, `--gold-deep #B7791F` vertical edge stripes + cap + tassel, `--paper-card #FFFDF8` window slats, optional `--indigo #403B8C` accent line (research #4; data-model.md Icon asset set; FR-005; depends T001)
  - **AC**: glyph matches research #4 design spec; palette values exactly from 003 tokens; no text/label inside the glyph
  - **Validate**: open `extension/src/icons/icon.svg` in browser/Preview — lantern silhouette reads as a lantern, transparent background, palette matches 003 in-page lantern
- [x] T003 [US3] Rasterize `extension/src/icons/icon{16,32,48,128}.png` — one-time macOS dev step (NOT part of the build, research #3): `qlmanage -t -s 16|32|48|128 -o /tmp/icons extension/src/icons/icon.svg` → rename outputs to `icon{size}.png` in `extension/src/icons/`, verify transparency + 16 px legibility, commit all four (FR-006; depends T002)
  - **AC**: exactly four PNGs at exact pixel sizes 16/32/48/128; transparent background (qlmanage renders SVG with transparency — research #3); no build-path rasterization added anywhere
  - **Validate**: `sips -g pixelWidth -g pixelHeight extension/src/icons/icon*.png` → 16/32/48/128; visual check at 16 px reads as lantern (B9)

**Checkpoint**: Icon set complete — `extension/src/icons/` holds icon.svg + 4 committed PNGs; Phase 3 can begin

---

## Phase 3: Manifest + build wiring (plan Phase B — US1/US3)

**Purpose**: Chrome entry surfaces (management page, toolbar, tooltip) + regenerated build output carrying the icons (FR-009c)

- [x] T004 [P] [US1/US3] Edit `extension/manifest.json` — exactly three fields change: `"name": "Video Transcript"` → `"TRAI"` (drives management-page entry + toolbar tooltip + context menu, FR-001 AC4); add `"icons": { "16": "icons/icon16.png", "32": "icons/icon32.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }` (management page 48 / details 128); add `"action": { "default_icon": { "16": "icons/icon16.png", "32": "icons/icon32.png" } }` (toolbar, 2× DPI picks 32) — contracts/brand.md §2; everything else byte-identical: version, description, permissions, host_permissions, background, content_scripts (depends T001; verify with T006)
  - **AC**: manifest matches contracts/brand.md §2 verbatim; only name/icons/action differ from current file (diff shows 3 field changes)
  - **Validate**: `git diff extension/manifest.json` → only `name`, `icons`, `action` hunks
- [x] T005 [P] [US3] Edit `extension/build.mjs` `copyStatic()` (line 37) — add icons copy so `extension/src/icons/*.png` land at `dist/icons/` (e.g. `await cp('src/icons', path.join(dist, 'icons'), { recursive: true })`); existing copies (manifest.json, pages, theme.css) unchanged; build stays deterministic, never rasterizes — PNGs are committed (research #3; contracts/brand.md §3; FR-006/FR-009; depends T001; verify with T006)
  - **AC**: `copyStatic()` copies the four PNGs into `dist/icons/`; no new dependency, no rasterizer in build path (constitution III)
  - **Validate**: `cd extension && npm run build` → `extension/dist/icons/icon{16,32,48,128}.png` exist (T006)
- [x] T006 [US1/US3] Build check — `cd extension && npm run build`: `extension/dist/manifest.json` carries `name: "TRAI"` + `icons` + `action.default_icon`; `extension/dist/icons/icon{16,32,48,128}.png` present; dist is wiped + regenerated (FR-009c; SC-003/SC-006; depends T004, T005)
  - **AC**: rebuilt dist contains renamed manifest + four icon files; 0 stale `Video Transcript` strings in dist
  - **Validate**: `grep -n '"name"' extension/dist/manifest.json` → `"TRAI"`; `ls extension/dist/icons/` → 4 PNGs

**Checkpoint**: Chrome entry wired + build regenerates icons — Phase 4 can begin

---

## Phase 4: Brand text (plan Phase C — US1/US2)

**Purpose**: The 18 string spots in 7 files + the one stylesheet rule — presentation only, zero logic (FR-007)

- [x] T007 [P] [US1/US2] Six HTML pages, three spots each, exact replacements per contracts/brand.md §1 table — `extension/src/pages/{signin,job,history,notice}.html` (title `Sign in|Transcript|History|Notice — TRAI`; `<p class="brand-name">TRAI</p>`; `<p class="brand-tagline">Transcribe with AI</p>` — currently lines 7/13/14 in each) and `backend/src/auth/pages/{confirm,reset}.html` (title `Confirm your email|Reset password — TRAI`; same name/tagline spots) — FR-001/FR-002/FR-003/FR-004; no other markup touched (depends T001)
  - **AC**: every title/brand-name/brand-tagline matches the contracts §1 table verbatim; `<h1>` headings and all other page content byte-identical
  - **Validate**: grep each file for `Video Transcript` and `language reading room` → 0 hits (with T009); `git diff` per page shows only the three brand lines
- [x] T008 [P] [US2] Edit `shared/theme.css` — remove `text-transform: lowercase;` from `.brand-tagline` (line 69); the rule keeps `--ink-soft` color, 0.72rem size, `letter-spacing: 0.14em`; this is the ONLY stylesheet change (research #5; contracts/brand.md §1; FR-003/FR-004 — "AI" must render uppercase; depends T001)
  - **AC**: exactly one property removed; "Transcribe with AI" renders verbatim ("AI" uppercase) on all six pages via the shared sheet (copied to both build outputs)
  - **Validate**: `git diff shared/theme.css` → single `-  text-transform: lowercase;` hunk; tagline visible uppercase in B2
- [x] T009 [US1/US2] Grep gate — 0 occurrences of `Video Transcript` AND `language reading room` in `extension/src`, `backend/src`, `extension/manifest.json` (SC-001/SC-002; contracts/brand.md §1; depends T007, T008)
  - **AC**: both grep commands return no matches across the three directories; confirms no surface left with old brand
  - **Validate**: `grep -rn "Video Transcript" extension/src backend/src extension/manifest.json; grep -rn "language reading room" extension/src backend/src extension/manifest.json` → both empty

**Checkpoint**: All brand surfaces renamed — Phase 5 (docs + verification) can begin

---

## Phase 5: Docs + verification (plan Phase D — US4)

**Purpose**: Canonical checklist currency (FR-009), zero-drift proof (FR-007), release gate (FR-010, constitution V)

- [x] T010 [P] [US4] Edit `.docs/testcases.md` (constitution regression-checklist currency; research #7; contracts/brand.md §4) — `extension` row (line 13): pass criterion `chrome://extensions shows "Video Transcript"` → `shows "TRAI"`, plus icon criteria — `extension/dist/icons/icon{16,32,48,128}.png` exist and the lantern icon renders in toolbar + management page; `build` row (line 11): add criterion — rebuilt dist contains `name: "TRAI"` (manifest) and the four icon files. Rows `backend`, `signin`, `transcribe`, `transcript-actions` untouched (FR-007) (depends T001; FR-009)
  - **AC**: exactly the two row edits described; no other row changed; checklist now checks name + icon + regenerated assets (FR-009 a/b/c)
  - **Validate**: `git diff .docs/testcases.md` → hunks only in `build` and `extension` rows
- [x] T011 [P] [US4] Automated verification — `cd extension && npm test` (all 9 suites green, unchanged: `actions`, `auth-recovery`, `auth-signup`, `job-start`, `no-autostart`, `reading-layout`, `session-refresh`, `toolbar`, `video-detect` — incl. `toolbar.test.ts`, which tests click behavior not manifest fields, research #8); `cd backend && npm test` (all 5 suites green, unchanged: `auth-gate`, `auth-pages`, `pipeline`, `url`, `ytdlp`); `npm run typecheck && npm run lint` in BOTH projects (003/004 precedent); `npm run build` both projects (extension: T006 output; backend: `backend/dist/auth/pages/{confirm,reset}.html` carry renamed HTML — `build-auth.mjs` copies as-is, no change) (plan.md Test Strategy; FR-007 → SC-004; zero new/changed tests — asset-only exception; depends T006, T007, T008, T009)
  - **AC**: 0 failures across all 14 suites; 0 new/changed test files; typecheck + lint + build green both projects
  - **Validate**: run the six commands; record per-suite results and the two build outputs
- [ ] T012 [P] [MANUAL] [US1/US2/US3] Manual checks B1–B9 per `specs/005-trai-extension-rebrand/quickstart.md` § Manual validation — B1 "TRAI" name on the four extension pages (header `.brand-name` + tab title), `<h1>` headings unchanged; B2 tagline "Transcribe with AI" with "AI" uppercase (old `text-transform: lowercase` gone), fits one line, no clipping/horizontal scroll at desktop + narrow widths; B3 auth pages `/auth/confirm` + `/auth/reset` show name + tagline; B4 0 leftover "Video Transcript"/"language reading room" in visible content + DevTools DOM of all six pages; B5 chrome://extensions entry named "TRAI" with lantern icon (not generic placeholder) at 48 px, details view 128 px; B6 toolbar shows lantern icon, tooltip "TRAI"; B7 2× display (or DevTools emulation) sharp, no blur/pixelation at any size; B8 shipped asset set — `extension/dist/icons/` contains all four PNGs + `dist/manifest.json` carries `name: "TRAI"`, `icons`, `action.default_icon`; B9 16 px glyph still reads as lantern (tooltip disambiguates if smudge — MANUAL note) (FR-001/002/003/004/005/006 → SC-001/002/003/007; depends T011 — builds + reload unpacked; needs Chrome + running backend for auth pages)
  - **AC**: B1–B9 all pass, or each failure recorded with evidence
  - **Validate**: execute quickstart B1–B9; record outcome per check against SC-001/SC-002/SC-003/SC-007
- [ ] T013 [P] [MANUAL] [US4] Regression gate per quickstart § Regression gate — run 001 scenarios S1–S8, 002 M1–M4, 003 V1–V6/R1–R5, 004 C1–C10: every existing flow (sign-in, transcribe, view from history, copy + source link, delete, reading layout, theme, email confirmation, password reset) behaves exactly as before (SC-004); stored data untouched — transcripts/account/history byte-identical, `vtToken`/`pendingVideo` keys + API routes unchanged (US4-AC2/AC3); updated `.docs/testcases.md` rows pass, other rows unchanged + green; scope guard — git diff shows ONLY `specs/005-*`, `.docs/testcases.md`, `extension/` (manifest.json, build.mjs, src/pages/*.html, src/icons/*), `backend/src/auth/pages/`, `shared/theme.css`; zero edits under specs/001–004 (FR-008, SC-005; depends T011)
  - **AC**: 0 regressions; diff scope = the planned files only; 001–004 quickstart scenarios all pass
  - **Validate**: run quickstart regression scenarios; `git diff --stat 004-transcript-copy-actions..005-trai-extension-rebrand` review; `git log --oneline specs/001-* specs/002-* specs/003-* specs/004-*` empty
- [ ] T014 Run the full `specs/005-trai-extension-rebrand/quickstart.md` validation suite end to end (automated leg + B1–B9 + regression gate) and record results — final release gate (FR-010, constitution V; depends T011–T013)
  - **AC**: all gates pass; quickstart expected-outcome summary rows all green
  - **Validate**: execute quickstart end to end; record outcomes vs SC-001…SC-007

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 blocks everything (branch must exist before any edit)
- **Icon assets (Phase 2)**: Depends on Setup — BLOCKS Phase 3 verification (T006 needs PNGs)
- **Manifest + build wiring (Phase 3)**: Depends on Setup (A complete for verification); T004/T005 parallel, T006 after both
- **Brand text (Phase 4)**: Depends on Setup; independent of Phase 3 files (no shared file — see Parallel Opportunities); grep gate T009 after T007 + T008
- **Docs + verification (Phase 5)**: T010 after Setup (disjoint file); T011–T013 after all code phases (T006–T009); T014 final after T011–T013

### Within Each Task Group

- No TDD requirement — **asset-only exception** (constitution I; plan.md Constitution Check + Test Strategy; research #8): zero behavior/config logic exists to test; a manifest-JSON test was explicitly rejected (asserts static data; would churn on every rebrand). No focused test is added by any task in this file.
- Assets (SVG → PNGs) before wiring (manifest/build) before text; docs + verification last

### Parallel Opportunities

- **Lane A — Icon assets (US3)**: T002 → T003 (sequential, same dir)
- **Lane B — Manifest + build (US1/US3)**: T004 [P] + T005 [P] — disjoint files (`manifest.json` vs `build.mjs`), launch together after T001
- **Lane C — Brand text (US1/US2)**: T007 [P] + T008 [P] — disjoint files (HTML pages vs `shared/theme.css`), launch together; T009 after both
- **Lanes B + C are mutually parallel** — no shared file (plan.md Phase C note: "same files touched in one pass" refers to the six pages within T007; B and C touch disjoint paths)
- **Lane D — Docs (US4)**: T010 [P] — disjoint file, may be drafted as early as T001, formal gate at Phase D
- **Lane E — Verification**: T011, T012, T013 [P] after T006–T009; T014 final after T011–T013
- **Same-file conflicts to avoid**: `extension/src/pages/*.html` (T007 only, single task); `extension/manifest.json` (T004 only); `extension/build.mjs` (T005 only); `shared/theme.css` (T008 only)

### Parallel Example: Phases 2–4

```bash
# Launch together after T001:
Task: "T002 extension/src/icons/icon.svg lantern glyph"
Task: "T004 manifest.json name/icons/action wiring"
Task: "T005 build.mjs copyStatic icons copy"
Task: "T007 six HTML pages brand strings"
Task: "T008 shared/theme.css drop text-transform: lowercase"

# Then: T003 (rasterize PNGs, after T002) → T006 (build check, after T004/T005) → T009 (grep gate, after T007/T008) → T010 (testcases.md)
```

---

## Implementation Strategy

### MVP First (US3 — Icon)

1. Complete Phase 1: Setup (T001)
2. Complete Phase 2: Icon assets (T002 → T003) — CRITICAL, blocks Phase 3 verification
3. Complete Phase 3: Manifest + build wiring (T004 [P] + T005 [P] → T006)
4. **STOP and VALIDATE**: T006 build check green — lantern icon in dist + "TRAI" in rebuilt manifest
5. Deploy/demo if ready (US3 value delivered: B5–B9 runnable)

### Incremental Delivery

1. Complete Setup + Icon assets → lantern icon wired end to end (US3: B5–B9)
2. Complete Manifest wiring → Chrome entry renamed (US1 partial: B5/B6)
3. Complete Brand text (T007 [P] + T008 [P] + T009) → name + tagline on all six pages (US1 + US2: B1–B4) — Deploy/Demo (full rebrand!)
4. Phase 5: testcases.md edit + automated leg + B1–B9 + regression gate → release (US4)

### Parallel Team Strategy

1. Team completes Setup + Assets together (Lane A)
2. Developer A: Lanes B + C (manifest/build + text, disjoint files, T004/T005/T007/T008 parallel)
3. Maintainer: T010 docs; T012–T013 manual validation at release; T014 final gate

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability (US1 = name, US2 = tagline, US3 = icon, US4 = nothing else changes)
- **Asset-only test exception (constitution I)**: no behavioral tests written for this feature — presentation/assets only (FR-007), no behavior to test; exception recorded in plan.md Constitution Check + Test Strategy, research #8, and this file (Tests header, T011, Verification Status)
- No production code changes outside the listed files: `extension/manifest.json` (CHANGED), `extension/build.mjs` (CHANGED), `extension/src/pages/{signin,job,history,notice}.html` (CHANGED), `extension/src/icons/icon.svg` + `icon{16,32,48,128}.png` (NEW), `backend/src/auth/pages/{confirm,reset}.html` (CHANGED), `shared/theme.css` (CHANGED), `.docs/testcases.md` (CHANGED, FR-009)
- Explicitly untouched: all `.ts` files (extension + backend), `backend/scripts/build-auth.mjs`, `supabase/`, `extension/tests/*`, `backend/tests/*`, `README.md`, specs/001–004 (FR-008), manifest description/version/permissions/host_permissions
- Commit after each task or logical group (constitution per-task commits); commit message referencing the task (e.g. `feat(trai-rebrand): ...` — T00X)
- Stop at any checkpoint to validate independently
- Icon rasterization (T003) is a one-time documented macOS dev step — never part of `npm run build` (research #3)

---

## FR / SC Coverage Matrix

| Requirement | Covered by |
|---|---|
| FR-001 (name "TRAI" on every surface) | T004 (manifest), T007 (6 pages), T009 (grep), T012 (B1/B3/B5/B6) |
| FR-002 (auth pages name) | T007 (confirm/reset), T012 (B3) |
| FR-003 (extension tagline) | T007, T008 (case), T012 (B2) |
| FR-004 (auth pages tagline) | T007, T008, T012 (B3) |
| FR-005 (lantern icon, not placeholder) | T002, T004, T012 (B5/B6/B9) |
| FR-006 (4 sizes, sharp) | T003, T005, T006, T012 (B7/B8) |
| FR-007 (zero behavior change) | T011 (14 suites green), T013 (regression gate) |
| FR-008 (specs/001–004 untouched) | T013 (scope guard) |
| FR-009 (testcases.md same change) | T010, T013 (rows pass) |
| FR-010 (quickstart exists + current) | T012–T014 (B1–B9 + full suite) |
| FR-011 (no new functionality) | T011, T013 (diff scope) |
| SC-001 (TRAI everywhere, 0 leftovers) | T007, T009, T012 (B1/B3–B6) |
| SC-002 (tagline everywhere, 0 leftovers) | T007, T008, T009, T012 (B2–B4) |
| SC-003 (icon set, sharp 1×/2×) | T002–T006, T012 (B5–B9) |
| SC-004 (0 regressions) | T011, T013 |
| SC-005 (0 files under 001–004) | T013 |
| SC-006 (checklist current + passes) | T010, T011, T013 |
| SC-007 (instant recognition) | T002, T012 (B5/B6/B9) |

**Coverage result: PASS** — all 11 FRs and all 7 SCs map to at least one task; all four user stories end with an independent test per spec.md (US1 → B1/B3/B5/B6; US2 → B2–B4; US3 → B5–B9; US4 → T011/T013 regression gate).

---

## Verification Status (owner: executor — filled post-implementation)

> after_tasks hook: `auto_execute_hooks: true`, `after_tasks` → `speckit.implement` (`.specify/extensions.yml`, enabled, optional: false) — the implement command runs against this task list when the hook fires. Task statuses below are recorded by the executor as implementation proceeds (004 tasks.md precedent).

> **Executor run 2026-08-31, branch `005-trai-extension-rebrand` (created from 004 HEAD b65afb0, no commit made)**:

- [x] **T001** branch `005-trai-extension-rebrand` created from 004 HEAD b65afb0; zero code changes landed on 004; feature docs carried as untracked (T001 AC — commit with first implementation commit)
- [x] **T002** `extension/src/icons/icon.svg` — lantern-only glyph, no text, 003 palette (`--gold #E8A33D` body + gold-deep edge stripes/cap/tassel, `--paper-card #FFFDF8` slats, indigo accent), glyph ≈85% of 128 viewBox, transparent bg
- [x] **T003** rasterized via `qlmanage -t -s {16,32,48,128}` → `icon{16,32,48,128}.png` committed-src; `sips` confirms exact 16/32/48/128 px + `hasAlpha: yes`; no rasterizer in build path
- [x] **T004** manifest diff = exactly `name`→"TRAI", `icons` {16,32,48,128}, `action.default_icon` {16,32}; version/description/permissions/host_permissions/background/content_scripts byte-identical
- [x] **T005** `copyStatic()` adds `cp('src/icons', dist/icons, recursive)`; existing copies unchanged; no new dependency
- [x] **T006** extension build: `dist/manifest.json` `name: "TRAI"` + `icons` + `action`; `dist/icons/icon{16,32,48,128}.png` present; 0 stale `Video Transcript` in dist (grep count 0)
- [x] **T007** six pages: title/brand-name/brand-tagline swapped per contracts §1 (verified via agent-browser DOM: `TRAI` + `Transcribe with AI` + per-page titles on signin/job/notice/confirm/reset); `<h1>` headings untouched
- [x] **T008** `shared/theme.css` diff = single `- text-transform: lowercase;` hunk (verified `git diff`)
- [x] **T009** grep gate clean: 0 × `Video Transcript`, 0 × `language reading room` in `extension/src`, `backend/src`, `extension/manifest.json`
- [x] **T010** `.docs/testcases.md`: `extension` row → shows "TRAI" + icon criteria; `build` row → `name: "TRAI"` + four icon files; title line also renamed "TRAI" per hook instruction (title is not a row — no row beyond build/extension changed); `backend`/`signin`/`transcribe`/`transcript-actions` rows untouched
- [x] **T011** automated leg: extension typecheck ✓ lint ✓ test 9/9 suites (38 tests) ✓ build ✓; backend typecheck ✓ lint ✓ test 5/5 suites (29 tests) ✓ build ✓ (`dist/auth/pages/{confirm,reset}.html` carry renamed HTML); zero new/changed test files
- [ ] **T012** [MANUAL] B1–B9 — partial: B1/B4 (extension pages) + B3/B4 (auth pages, live backend) verified via agent-browser DOM; B8 verified (dist assets); B2 visual fit/no-clip, B5/B6/B7/B9 icon rendering + sharpness + 16 px legibility → **MANUAL** (human browser/visual; no loaded extension + display inspection this run)
- [ ] **T013** regression gate — partial: build ✓, backend ✓ (probe 200, tokenless POST → 401), extension ✓ (chrome://extensions shows "TRAI", ID `ongfjiafkfoomjehcddnmhbejlcfbiho`, 3 pages render, content script bundled, 0 old brand in DOM); `signin`/`transcribe` → **BLOCKED** (real-account + real STT/API usage — not run unapproved; orchestrator scope = safe build/extension cases); `transcript-actions` + 001–004 quickstart scenarios (S1–S8/M1–M4/V1–V6/R1–R5/C1–C10) → **MANUAL** (need live session + loaded extension); scope guard: diff = planned files only, `git log specs/001-*` empty (0 commits)
- [ ] **T014** full quickstart suite — **MANUAL/BLOCKED** until maintainer runs B1–B9 visuals + live regression scenarios against running stack; all automatable gates above already green

**Verdict (executor, 2026-08-31)**: all code phases (T001–T010) complete and verified; automated verification (T011) fully green — extension 38/38, backend 29/29, typecheck/lint/build both projects. Zero behavior/identifier/storage change (only presentation files touched; `git log` over specs/001–004 empty). Manual visual leg (T012 B2/B5/B6/B7/B9, T013 live scenarios, T014) queued for maintainer — no evidence gaps: everything automatable was executed, nothing invented. **after_implement optional verify hook (`verify` extension, `speckit.verify.run`, optional: true) is ready to run** — implementation is complete against spec/plan/tasks and all runnable gates pass.