# Implementation Plan: TRAI Extension Rebrand

**Branch**: `005-trai-extension-rebrand` (created from current work — 004, implemented — before implementation) | **Date**: 2026-08-31 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/005-trai-extension-rebrand/spec.md`

## Summary

Presentation-only rebrand: the visible name becomes exactly "TRAI" and the tagline becomes exactly "Transcribe with AI" on every user-visible surface — the four extension pages (sign-in, job/transcript, history, notice), the two backend auth pages (confirm, reset), and the Chrome entry (management page, toolbar tooltip) via `manifest.json` `name`. A compact lantern-only icon — a rasterization of 003's Paper Lantern CSS lantern mark in the established palette — replaces the generic placeholder: SVG source (`extension/src/icons/icon.svg`) plus committed 16/32/48/128 px PNGs, wired through manifest `icons` + `action.default_icon`, copied into the regenerated build output. The only stylesheet change is dropping `text-transform: lowercase` from `.brand-tagline` so "AI" renders uppercase. Zero behavior, identifier, storage, auth, or API change; zero edits under specs/001–004. Docs in the same change: `.docs/testcases.md` (`extension` + `build` rows) and this feature's quickstart. No new behavioral tests — asset-only exception recorded (constitution I); the 13 existing suites prove zero drift.

## Technical Context

**Language/Version**: TypeScript / Node 20 (unchanged from 001–004); icon rasterization via macOS `qlmanage` (one-time, research #3)

**Primary Dependencies**: none new. macOS `qlmanage` for one-time SVG→PNG rasterization; Chrome MV3 manifest `icons`/`action.default_icon` (PNG only — research #2); existing esbuild build (extension `build.mjs` copies icons into dist); vitest (unchanged runner)

**Storage**: N/A — no schema, table, column, or API field changes (FR-007); brand identity is static text + files, not data (data-model.md)

**Testing**: vitest (unchanged, zero new suites — asset-only exception, constitution I, research #8). Existing suites: extension 8 (incl. `toolbar.test.ts` — click behavior, unaffected) + backend 5, all must stay green; manual checks B1–B9 + regression gate per [quickstart.md](quickstart.md)

**Target Platform**: Chrome desktop (extension, unpacked) + backend web service (auth pages); no store release (constitution III)

**Project Type**: Chrome extension + Fastify backend — presentation-only delta across 6 HTML files, 1 manifest, 1 shared stylesheet rule, 5 icon files, 1 build step

**Performance Goals**: none new — static text swap + one 4-file copy per build; no runtime cost (FR-011)

**Constraints**: exact wording "TRAI" / "Transcribe with AI" (FR-001–004); PNG icon set 16/32/48/128, sharp at 1×/2× (FR-005/006); zero identifier/storage/auth/behavior change (FR-007); specs/001–004 untouched (FR-008); testcases.md + quickstart updated in the same change (FR-009/010); no new functionality, no dark mode (FR-011)

**Scale/Scope**: 6 pages × 3 string spots + manifest name + 5 icon files + 1 stylesheet rule; single user (unchanged)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Verification (I, V)**: behavior unchanged (FR-007) → **asset-only exception** applies: no new behavioral tests, exception recorded here and to be carried into tasks.md (research #8). Verification = existing 13 suites green + builds regenerate dist + manual B1–B9 + regression gate (quickstart.md). **Compliant**.
- **Security (II, Security Constraints)**: no auth, gate, secret, or server-boundary change of any kind — backend edits are two static HTML text swaps; extension ships no new secrets. **Compliant**.
- **Scope (III)**: no store release, no new functionality, no new dependencies (research #2/#3); Complexity Tracking empty. **Compliant**.
- **Documentation (IV)**: spec/plan/quickstart present for `specs/005-*`; `.docs/testcases.md` **evaluated stale** (research #7) — `extension` row names the old brand, `build` row lacks the regenerated-assets check → MUST be updated in the same change (FR-009); quickstart created + current (FR-010). specs/001–004 untouched (FR-008). **Compliant**.
- **Post-design re-check**: design (this plan) changes only brand strings, one stylesheet property, manifest icon/name fields, and the icons copy step — all presentation-only; no new violation introduced. **Compliant**.

**Result: Pass.** No constitution amendment required.

**Constitution delta for tasks**: (a) asset-only test exception must be recorded in tasks.md; (b) `.docs/testcases.md` `extension` + `build` row edits are tasks, not follow-ups (FR-009); (c) quickstart scenarios B1–B9 are the release gate (FR-010, V).

## Project Structure

### Documentation (this feature)

```text
specs/005-trai-extension-rebrand/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/
│   └── brand.md         # Phase 1 output: name/tagline/icon + build + docs contract
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
extension/                          # Chrome MV3 (001–004 layout + this feature's changes)
├── manifest.json                   # CHANGED: name "TRAI"; icons {16,32,48,128}; action.default_icon {16,32}
├── build.mjs                       # CHANGED: copyStatic() also copies src/icons/*.png → dist/icons/
├── src/
│   ├── icons/                      # NEW: icon.svg (source) + icon16/32/48/128.png (committed, research #3)
│   └── pages/
│       ├── signin.html             # CHANGED: title "Sign in — TRAI"; brand-name "TRAI"; tagline "Transcribe with AI"
│       ├── job.html                # CHANGED: title "Transcript — TRAI"; brand-name + tagline as above
│       ├── history.html            # CHANGED: title "History — TRAI"; brand-name + tagline as above
│       └── notice.html             # CHANGED: title "Notice — TRAI"; brand-name + tagline as above
└── tests/                          # UNCHANGED — all 8 suites stay green (asset-only exception)

backend/                            # single Node service — auth pages only
└── src/auth/pages/
    ├── confirm.html                # CHANGED: title "Confirm your email — TRAI"; brand-name "TRAI"; tagline
    └── reset.html                  # CHANGED: title "Reset password — TRAI"; brand-name "TRAI"; tagline

shared/
└── theme.css                       # CHANGED: .brand-tagline drops text-transform: lowercase (research #5)

.docs/
└── testcases.md                    # CHANGED (same change, FR-009): extension row → "TRAI" + icon checks; build row → regenerated assets
```

**Unchanged (explicit)**: `extension/src/**/*.ts` (all page logic, background, shared helpers), `backend/src/**/*.ts` (routes, flow, app, auth scripts), `backend/scripts/build-auth.mjs` (copies the renamed HTML as-is), `supabase/`, `extension/tests/`, `backend/tests/`, `README.md` (repo-internal, spec assumption), specs/001–004 (FR-008), manifest `description`, version, permissions, host_permissions.

**Structure Decision**: No new top-level projects or packages — the change is 18 static strings in 7 files, one manifest icon wiring, one shared-stylesheet property, one committed icon set, and one added copy step in the existing `build.mjs`. The icon set lives in `extension/src/icons/` (source + committed PNGs together) and rides the existing dist-copy pattern (manifest/pages/theme.css already copied); the backend needs no build change because `build-auth.mjs` already copies the HTML pages it serves.

## Phases & Dependencies

> Branch `005-trai-extension-rebrand` is created from current work (004 branch, implemented) before Phase A starts — no code changes land on the 004 branch.

| Phase | Work | Depends on |
|---|---|---|
| **A — Icon assets** | Create `extension/src/icons/icon.svg` (lantern-only glyph, 003 palette — research #4); rasterize to `icon16/32/48/128.png` via `qlmanage` (research #3); commit all five | — |
| **B — Manifest + build wiring** | `manifest.json`: `name` → "TRAI", add `icons` {16,32,48,128}, `action.default_icon` {16,32}; `build.mjs` `copyStatic()` copies icons → `dist/icons/`; run build → verify `dist/icons/*.png` + renamed manifest (FR-006/FR-009) | A |
| **C — Brand text** | Six HTML pages: title + `.brand-name` → "TRAI", `.brand-tagline` → "Transcribe with AI"; `shared/theme.css`: remove `text-transform: lowercase` from `.brand-tagline`; grep gate — 0 old strings in `extension/src`, `backend/src`, `manifest.json` | B (same files touched in one pass; build after) |
| **D — Docs + verification** | `.docs/testcases.md`: `extension` row (name "TRAI" + icon criteria), `build` row (regenerated assets) — FR-009; run both suites + builds (zero drift, FR-007); manual B1–B9 + 001–004 regression gate per [quickstart.md](quickstart.md); diff check — specs/001–004 untouched (SC-005) | A + B + C |

## Test Strategy (mapped to Success Criteria)

| Artifact | Verifies |
|---|---|
| No new tests — **asset-only exception** (constitution I; research #8; recorded for tasks.md) | FR-007/FR-011 → SC-004 (no behavior exists to test; tests would assert static strings) |
| Existing extension suites (8, unchanged) + backend suites (5, unchanged) stay green | FR-007 → SC-004 (zero drift — incl. `toolbar.test.ts`, which tests click behavior, not manifest fields) |
| `npm run build` both projects → `dist/` regenerated with `name: "TRAI"` + `dist/icons/icon{16,32,48,128}.png` | FR-006/FR-009 → SC-003/SC-006 (regenerated build assets) |
| Manual checks B1–B9 ([quickstart.md](quickstart.md)) | FR-001…FR-006 → SC-001/SC-002/SC-003/SC-007 (name/tagline on six pages + Chrome entry; icon presence, sharpness 1×/2×, 16 px legibility) |
| Grep gate (contracts/brand.md §1) | SC-001/SC-002 (0 occurrences of old strings in `extension/src`, `backend/src`, `manifest.json`) |
| Manual regression of 001–004 quickstart scenarios + `.docs/testcases.md` rows | SC-004/SC-005/SC-006, FR-007/FR-008/FR-009 (no flow regression; historical dirs untouched; updated checklist passes) |

## UX Acceptance Checks (per spec user story, verified in Phase D)

- **US1 (name)** — chrome://extensions shows "TRAI" with the lantern icon; toolbar tooltip shows "TRAI"; all four extension pages and both auth pages show "TRAI" in header and title; no surface shows "Video Transcript" (B1, B3, B5, B6).
- **US2 (tagline)** — all six pages show "Transcribe with AI" (AI uppercase) under the name; "language reading room" appears nowhere (B2, B3, B4).
- **US3 (icon)** — compact lantern-only glyph (not the generic placeholder) in toolbar + management page, sharp at 16/32/48/128 px on 1× and 2× displays; asset set present in the regenerated build output (B5–B9).
- **US4 (nothing else changes)** — every existing flow behaves exactly as before; stored data and identifiers byte-identical; specs/001–004 diff empty; testcases.md + quickstart updated in the same change (regression gate).

## Non-Goals (explicit)

- No behavior, logic, or `.ts` change anywhere (FR-007) — extension page scripts, background, backend routes/flow/auth, and all 13 existing test suites untouched.
- No identifier, storage, API, or schema change — `vtToken`/`pendingVideo` keys, routes, account data, version number all unchanged.
- No new dependencies, no rasterizer in the build path (research #3) — PNGs are committed; the build only copies.
- No store release, no promotional assets, no README rewrite, no logo/wordmark design (spec Out of Scope; assumption "repo-internal docs").
- No dark mode, no new pages, no theme work beyond the one tagline-case rule (FR-011; 003's theme otherwise unchanged).
- No edits under specs/001–004 (FR-008, SC-005).
- No behavioral test files — asset-only exception (constitution I).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — constitution check passed with no violations (asset-only test exception is a permitted skip, not a violation, and is recorded above and in tasks.md).