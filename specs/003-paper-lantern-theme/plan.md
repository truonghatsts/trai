# Implementation Plan: Paper Lantern Theme

**Branch**: `003-paper-lantern-theme` (created from current work before implementation) | **Date**: 2026-08-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/003-paper-lantern-theme/spec.md`

## Summary

A cohesive Paper Lantern visual system — warm paper surfaces, indigo text/actions, lantern gold highlights — applied as a pure presentation layer to all four extension pages (sign-in, job/transcript, history, notice) and the two backend auth pages (confirm, reset). Identity stays "Video Transcript" with a CSS-only lantern mark (no image files) and the "language reading room" tagline. One shared plain-CSS stylesheet (`shared/theme.css`) is copied into both build outputs; six HTML files gain a brand header + stylesheet link; no page logic, routes, schema, or storage change. The transcript view additionally gains a display-only reading layout: a pure function (`splitIntoLines`) inserts line breaks at sentence/phrase boundaries in the rendered `<pre>`, honoring existing line breaks first, then common Unicode sentence punctuation, then cautious clause splitting for long spans — degrading to unbroken text when no boundary is confidently inferable. The stored transcript is never modified: the transformation is view-time only and proven byte-preserving. Light mode only; WCAG AA contrast, visible keyboard focus, reduced-motion support, touch-friendly responsive auth pages. Zero backend behavior change, zero new data, zero gamification.

## Technical Context

**Language/Version**: TypeScript / Node 20 (unchanged from 001/002) + plain CSS (no preprocessor, no framework)

**Primary Dependencies**: none new. Existing esbuild copy pipelines (`extension/build.mjs`, `backend/scripts/build-auth.mjs`) gain one CSS copy line each; system font stacks (no webfonts); existing `@fastify/static` serves `/auth/theme.css` with no route change

**Storage**: N/A — no schema, table, column, or API field changes; stored transcripts stay byte-identical (FR-006); no new data collected (FR-012)

**Testing**: vitest (unchanged runners). New unit suite for the DOM-free `splitIntoLines` pure function (preservation invariant + boundary rules); backend `auth-pages.test.ts` gains a `GET /auth/theme.css → 200 text/css` reachability check; manual visual/contrast/reduced-motion/responsive checklist per [quickstart.md](quickstart.md)

**Target Platform**: Chrome desktop (extension, unpacked); backend auth pages on any modern browser including phones (responsive required)

**Project Type**: Chrome extension + web-service backend (unchanged); theme is static CSS + markup + one pure display function — no new projects, no new packages

**Performance Goals**: none new (research #6); `splitIntoLines` is a single O(n) pass — very long transcripts stay responsive (spec edge case)

**Constraints**: light mode only (FR-009); WCAG AA text contrast on every themed surface, visible keyboard focus, reduced-motion honored, no essential info by color alone (FR-008); lantern mark CSS-only, no image files (FR-002); splitting honors existing line breaks, never guesses (FR-004/FR-005); preserved text exactly (FR-006); no backend/schema/API/data changes (FR-011/FR-012/FR-013); no gamification, no rename (FR-010)

**Scale/Scope**: 6 surfaces — 4 extension pages + 2 backend auth pages; single user + tiny public traffic (unchanged from 001/002)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution file (`.specify/memory/constitution.md`) is the unfilled starter template: it defines no concrete principles, constraints, or gates. No gate violations are possible or present. **Pass** (pre-research and post-design re-check: unchanged).

## Project Structure

### Documentation (this feature)

```text
specs/003-paper-lantern-theme/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/
│   └── theme.md         # Phase 1 output: visual system + reading-layout + integration contract
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
shared/                             # NEW: cross-project static assets
└── theme.css                       # NEW: canonical Paper Lantern stylesheet (single source of truth)

extension/                          # Chrome MV3 (001/002 layout + presentation changes)
├── build.mjs                       # CHANGED: copyStatic() also copies ../shared/theme.css → dist/src/pages/
└── src/
    ├── shared/
    │   └── reading-layout.ts       # NEW: DOM-free splitIntoLines() — display-only sentence/phrase splitting
    └── pages/
        ├── signin.html             # CHANGED: <link theme.css>, viewport meta, brand header (lantern + name + tagline)
        ├── job.html                # CHANGED: same + transcript surface container
        ├── history.html            # CHANGED: same
        ├── notice.html             # CHANGED: same
        └── job.ts                  # CHANGED: renderTranscript() calls splitIntoLines() — 1-line change
└── tests/
    └── reading-layout.test.ts      # NEW: unit suite for splitIntoLines (preservation + boundary rules)

backend/                            # single Node service (001/002 layout + presentation changes)
├── scripts/build-auth.mjs          # CHANGED: also copies ../../shared/theme.css → dist/auth/pages/
└── src/auth/pages/
    ├── confirm.html                # CHANGED: <link theme.css>, brand header
    └── reset.html                  # CHANGED: <link theme.css>, brand header
└── tests/
    └── auth-pages.test.ts          # CHANGED: + GET /auth/theme.css → 200 text/css (guards the copy step)
```

**Unchanged (explicit)**: `extension/manifest.json`, `backend/src/app.ts` (theme.css is served by the existing `@fastify/static` under `/auth/` once present in dist), all API routes, `supabase/`, `package.json`/`package-lock.json` (no new dependencies), `tsconfig*.json`, `src/pages/*.ts` except `job.ts` renderTranscript, `src/auth/pages/*.ts` (flow.ts, confirm.ts, reset.ts, client.ts).

**Structure Decision**: No new top-level projects and no new packages — the theme is a single shared CSS file at repo root, duplicated into each build output by the existing copy steps (extension pages cannot load the backend's CSS: MV3 `style-src 'self'` + `chrome-extension://` origin — research #2). All DOM-free display logic follows the 002 `flow.ts` pattern: pure module + unit tests. The backend needs zero route changes because `@fastify/static` already serves the whole `dist/auth/pages` directory.

## Phases & Dependencies

> Branch `003-paper-lantern-theme` is created from current work (002 branch) before Phase A starts — no code changes land on the 002 branch.

| Phase | Work | Depends on |
|---|---|---|
| **A — Theme foundation** | `shared/theme.css` (palette tokens, brand header, buttons/forms/cards, focus rings, reduced-motion, responsive rules); build wiring in `extension/build.mjs` + `backend/scripts/build-auth.mjs`; `<link>` + viewport meta + brand header markup in all 6 HTML pages (4 extension + 2 backend) | — |
| **B — Reading layout** | `extension/src/shared/reading-layout.ts` (`splitIntoLines`); `job.ts` renderTranscript wiring; `extension/tests/reading-layout.test.ts` | — (parallel-safe with A; touches disjoint files) |
| **C — Accessibility & responsive pass** | Backend auth pages: touch targets ≥44 px, input font-size ≥16 px, narrow-viewport reflow (no horizontal scroll); extension: `white-space: pre-wrap` transcript surface, graceful reflow; verify focus-visible, reduced-motion, no color-alone info across all 6 surfaces | A |
| **D — Validation** | `npm test` both projects; manual visual checklist V1–V6, reading-layout checks, byte-preservation procedure, responsive/reduced-motion/contrast checks, 001/002 regression suites per [quickstart.md](quickstart.md) | A + B + C |

## Test Strategy (mapped to Success Criteria)

| Artifact | Verifies |
|---|---|
| `extension/tests/reading-layout.test.ts` (vitest, pure function) | FR-003/004/005/006 → SC-002 (byte preservation: `splitIntoLines(t).split('\n').join('') === t` on every fixture), SC-003 (sentence-boundary coverage on English fixtures; unbroken degrade on CJK/no-punctuation) |
| `backend/tests/auth-pages.test.ts` addition (GET `/auth/theme.css` → 200) | FR-007 → SC-001 (theme reachable on both auth pages); guards the build-copy step via the existing `pretest` hook |
| Existing 001/002 vitest suites (unchanged, must stay green) | FR-011/013 → SC-004 (no flow regression) |
| Manual visual checklist V1–V6 + contrast/focus/reduced-motion checks ([quickstart.md](quickstart.md)) | FR-001/002/007/008 → SC-001, SC-005, SC-006, SC-008 |
| Manual byte-preservation + reading-layout checks ([quickstart.md](quickstart.md)) | FR-003/004/005/006 → SC-002, SC-003 |
| Manual regression of 001/002 quickstart scenarios | SC-004, SC-007 (0 gamification / 0 dark mode / 0 new data / 0 backend change) |

## UX Acceptance Checks (per spec user story, verified in Phase D)

- **US1** — every extension page shows: warm paper background, indigo text/actions, gold accents, brand header with CSS-drawn lantern mark + "Video Transcript" + "language reading room"; transcript area stays a clean high-contrast reading surface (no decorative clutter).
- **US2** — a single-paragraph stored transcript renders with sentence/phrase units on separate lines; stored text byte-identical before/after viewing; transcripts with their own line breaks show them honored.
- **US3** — `/auth/confirm` and `/auth/reset` render the same theme on desktop and at 375 px portrait; no horizontal scroll; all controls tappable (≥44 px); both flows complete with clear outcomes ("Email verified…" / "Password updated…").
- **US4** — Tab through every surface: focus ring clearly visible on every control; text meets AA on all surfaces; `prefers-reduced-motion` disables the lantern glow pulse; no essential info conveyed by color alone.
- **US5** — all 001/002 flows (sign-in, transcribe, reopen transcript, delete from history, confirm email, reset password) behave exactly as before; no streaks/rewards/badges, no dark mode, no new data collection, no backend behavior change.

## Non-Goals (explicit)

- No gamification of any kind — no streaks, rewards, points, badges (FR-010; SC-007).
- No dark mode — light only, even as a hidden option (FR-009; SC-007).
- No product rename — "Video Transcript" stays everywhere; lantern mark + tagline are additions (FR-002/FR-010).
- No backend behavior change — no route, rule, gate, storage, or auth-flow modification (FR-011/FR-013; SC-007): zero edits to `app.ts`, API routes, `flow.ts`, `confirm.ts`, `reset.ts`, db layer, or migrations.
- No new data collection or transmission (FR-012; SC-007).
- No timestamps, translations, vocabulary features, ownership/auth changes (FR-013).
- No semantic or language-aware parsing — the reading layout is a deterministic punctuation heuristic that degrades to unbroken text (FR-005); no `Intl.Segmenter`, no NLP, no locale data (research #4).
- No changes to stored transcripts in any path (FR-006).
- No image or font assets — lantern is CSS-only, fonts are system stacks (FR-002; assumption "no new assets").
- No new dependencies, no new packages, no CSS framework or preprocessor (research #1).

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — constitution defines no gates and no violations were identified.