# Implementation Plan: Transcript Copy Actions

**Branch**: `004-transcript-copy-actions` (created from current work — 003, implemented — before implementation) | **Date**: 2026-08-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/004-transcript-copy-actions/spec.md`

## Summary

Adds two bottom-of-transcript actions to the extension's transcript view: a **Copy** button that places the exact stored transcript text on the clipboard (raw `content` string from `GET /api/transcripts/{id}` — never the rendered text, so 003's display-only reading layout cannot leak into the copy), with a visible, auto-clearing, AT-announced success/failure outcome on every attempt; and an **Open video** link to the originating video that is shown only when the stored `source_url` exists and is a safe web URL (http/https, mirroring the backend's `parseSourceUrl` rule), opening the exact stored URL in a new tab via a native `target="_blank"` anchor while the transcript view stays open. Implementation is confined to `extension/src/pages/job.html` + `job.ts` plus one new DOM-free helper (`shared/actions.ts`, `isSafeWebUrl`) with a unit suite. Zero backend, storage, schema, or API changes (the transcript endpoint already returns `source_url`); both entry points (post-transcription and history reopen) route through the same `renderTranscript()` path, so the actions appear identically everywhere. Keyboard reach, visible focus, and live-region announcements come from native elements + 003's theme. No share/download/export/edit features.

## Technical Context

**Language/Version**: TypeScript / Node 20 (unchanged from 001/002/003)

**Primary Dependencies**: none new. `navigator.clipboard.writeText` (platform API — works in the focused extension page inside the click gesture; no manifest permission, no offscreen document — research #1); native `<a target="_blank" rel="noopener">` (no `chrome.tabs`); 003's `theme.css` for focus rings/layout; vitest (unchanged runner)

**Storage**: N/A — no schema, table, column, or API field changes (FR-008); stored transcripts stay byte-identical; clipboard and source link are transient view-time artifacts (data-model.md)

**Testing**: vitest (unchanged). New unit suite `extension/tests/actions.test.ts` for the DOM-free `isSafeWebUrl` (safety rule + mirror of backend `parseSourceUrl`); manual checks C1–C10 + accessibility per [quickstart.md](quickstart.md); backend suite run once to prove zero drift

**Target Platform**: Chrome desktop (extension, unpacked) — transcript view only

**Project Type**: Chrome extension (frontend-only delta); backend web service untouched

**Performance Goals**: none new; copy is a single `writeText` of an in-memory string; `isSafeWebUrl` is O(1) per render — very long transcripts unaffected (spec edge case)

**Constraints**: clipboard content character-for-character equals stored text (FR-002/SC-002); every copy attempt yields visible + AT-announced outcome that clears on its own (FR-003); link shown only for present + safe stored URLs (FR-005); copy independent of link (FR-006); native keyboard reach + visible focus (FR-007); zero changes to text, storage, backend, or any 001–003 flow (FR-008)

**Scale/Scope**: one view, two controls, one helper module + one test file; single user (unchanged)

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution file (`.specify/memory/constitution.md`) is the unfilled starter template: it defines no concrete principles, constraints, or gates. No gate violations are possible or present. **Pass** (pre-research and post-design re-check: unchanged).

## Project Structure

### Documentation (this feature)

```text
specs/004-transcript-copy-actions/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/
│   └── actions.md       # Phase 1 output: copy + source-link + integration contract
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
extension/                          # Chrome MV3 (001/002/003 layout + this feature's changes)
├── src/
│   ├── shared/
│   │   └── actions.ts              # NEW: DOM-free isSafeWebUrl() — http/https + hostname guard
│   └── pages/
│       ├── job.html                # CHANGED: #transcript-actions row under pre#content
│       │                           #   (Copy button, Open video link, role="status" feedback)
│       └── job.ts                  # CHANGED: keep raw content in scope; renderTranscript()
│                                   #   shows actions; loadTranscript() reads source_url;
│                                   #   Copy handler = writeText + timer-based feedback
└── tests/
    └── actions.test.ts             # NEW: unit suite for isSafeWebUrl (safe/unsafe matrix)
```

**Unchanged (explicit)**: `backend/` (all — no source, route, or test change; FR-008), `extension/manifest.json` (no clipboard permission needed — research #1), `supabase/`, all other extension pages (`history.ts/html`, `signin.*`, `notice.*`), `shared/reading-layout.ts`, `shared/session.ts`, `shared/start.ts`, `background/*`, `theme.css` (focus rings already cover the new native controls), `package.json`/lockfiles (no new dependencies), `.docs/testcases.md` (its `transcript-actions` row was added at specify time and needs no change).

**Structure Decision**: No new top-level projects and no new packages — the feature is one hidden actions row in `job.html`, wiring in `job.ts`, and one DOM-free pure helper following the 002/003 pattern (pure module + unit tests). The backend is not touched because `GET /api/transcripts/{id}` already returns `source_url` (research #3). Clipboard needs no permission because the write happens in the focused page inside the click gesture (research #1).

## Phases & Dependencies

> Branch `004-transcript-copy-actions` is created from current work (003 branch, implemented) before Phase A starts — no code changes land on the 003 branch.

| Phase | Work | Depends on |
|---|---|---|
| **A — Actions row + source link** | `job.html`: `#transcript-actions` (Copy button, `#source-link` anchor, `#copy-feedback` status) under `pre#content`; `shared/actions.ts` `isSafeWebUrl`; `job.ts`: capture raw content in module scope, `renderTranscript()` unhides actions + populates/validates the link (`hidden` when absent/unsafe); `loadTranscript()` reads `source_url` | — |
| **B — Copy + feedback** | `job.ts` Copy handler: `navigator.clipboard.writeText(currentContent)`; success/failure text into `#copy-feedback`; single auto-clear timer, reset per click | A (same files — B lands after A in one implementation pass) |
| **C — Validation** | `extension/tests/actions.test.ts` (safe/unsafe URL matrix); `npm test` in extension (no regressions) and backend (proves zero drift); manual checks C1–C10 + accessibility + regression gate per [quickstart.md](quickstart.md) | A + B |

## Test Strategy (mapped to Success Criteria)

| Artifact | Verifies |
|---|---|
| `extension/tests/actions.test.ts` (vitest, pure function) | FR-005 → SC-005 (unsafe/malformed/non-web URLs → false: `javascript:`, `data:`, `ftp:`, `mailto:`, unparseable, empty host; safe http/https with host+path → true — mirror of backend `parseSourceUrl`) |
| Existing 001/002/003 extension suites (unchanged, must stay green) | FR-008 → SC-006 (no flow regression) |
| Backend suite run (unchanged, must stay green) | FR-008 → SC-006 (zero backend drift; no backend test changes) |
| Manual checks C1–C10 ([quickstart.md](quickstart.md)) | FR-001/002/003/004/005/006 → SC-001…SC-005, incl. copy-payload character-for-character vs stored text (C1), feedback auto-clear (C2/C3), link open-in-new-tab (C4), no-link/unsafe-link states (C5/C6), empty/long/special-char/repeated-click edges (C7–C10) |
| Manual accessibility checks ([quickstart.md](quickstart.md)) | FR-007 → SC-007 (Tab reach, visible focus, Enter/Space, `role="status"` announcement) |
| Manual regression of 001/002/003 quickstart scenarios + `.docs/testcases.md` rows | SC-006 (0 regression), FR-008 (backend/storage/API untouched — git diff shows `extension/` only) |

## UX Acceptance Checks (per spec user story, verified in Phase C)

- **US1 (copy)** — a stored transcript shows the Copy button at the bottom of the view; one click puts the exact stored plain text on the clipboard; a brief visible confirmation appears and clears on its own; a denied copy shows a clear failure message (never silent); keyboard-only use reaches the button, shows focus, and hears the outcome announced.
- **US2 (source link)** — a transcript with a stored URL shows a clearly labeled link at the bottom; clicking opens the exact stored URL in a new tab while the transcript view stays open and unchanged; a transcript without a stored URL (or with an unsafe one) shows no link and Copy still works.

## Non-Goals (explicit)

- No backend, storage, schema, or API change of any kind (FR-008; SC-006) — zero edits to `backend/`, `supabase/`, or API contracts.
- No share, download, export, or transcript-edit features (spec Assumptions) — Copy to clipboard and the source link are the entire feature.
- No clipboard permission or manifest change (research #1); no offscreen document.
- No change to transcript text or its display pipeline — 003's reading layout and byte-preservation invariant stay exactly as shipped; the copy payload is the stored string, not the DOM.
- No new dependencies, no new packages (research #1/#3).
- No changes to history, sign-in, notice pages, or the backend auth pages.
- No URL rewriting, canonicalization, or tracking — the link destination is the exact stored string.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — constitution defines no gates and no violations were identified.