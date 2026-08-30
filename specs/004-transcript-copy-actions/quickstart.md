# Quickstart & Validation Guide: Transcript Copy Actions

Phase 1 output of `/speckit.plan`. Runnable validation scenarios proving the copy action and source link work end to end. Implementation details live in the implementation phase (tasks.md); this is a run guide only. Behavior contract: [contracts/actions.md](contracts/actions.md); entities: [data-model.md](data-model.md). 001, 002, and 003 quickstart scenarios remain valid — run them after this suite as the regression gate (SC-006).

## Prerequisites

- Chrome desktop browser; Node 20 + npm
- Existing 001/002/003 environment: backend running (`/api/*`, `/auth/*`), extension built and loaded unpacked; Supabase configured as in 002 (no new config for this feature — research.md § Manual configuration: **none**; backend not even redeployed)
- At least one stored transcript **with** a stored `source_url` (from the 001/002 transcribe flow), and one without (construct via DB only, else the no-link check is MANUAL)
- A transcript whose stored text is a single long paragraph (exercises the copy-vs-display distinction, research #2)

## Setup

```bash
# 1. Extension: build and reload unpacked (only this project changed — backend untouched)
cd extension && npm install && npm run build
# Chrome → chrome://extensions → reload the unpacked extension
```

## Automated validation (SC-001, SC-002, SC-003, SC-007)

```bash
# Extension: actions-unit suite + existing 001/002/003 suites stay green
cd extension && npm test  # expect: new actions.test.ts passes (isSafeWebUrl: http/https
                          # with host pass; javascript:/data:/ftp:/mailto:/malformed/bare
                          # host → false); no regressions

# Backend: untouched — run once to prove zero drift
cd backend && npm test    # expect: all existing suites green, unchanged
```

## Manual validation — transcript view (US1, US2, SC-001…SC-005)

Open a ready transcript from history (or right after transcription); the actions row sits at the bottom, below the transcript text.

- **C1 — Copy payload**: click **Copy transcript**; paste into a plain-text field; compare **character-for-character against the stored text** (`GET /api/transcripts/{id}` response `content` — the displayed `#content` may legitimately differ by 003 reading-layout line breaks; the clipboard must equal the stored string, not the display; FR-002/SC-002).
- **C2 — Success feedback**: after a successful copy, "Copied — transcript text is on your clipboard." appears under the actions and clears on its own (≈4 s) without further user action (FR-003/SC-003).
- **C3 — Failure feedback**: with DevTools → emulate a clipboard denial (or run the page unfocused while scripting the click), confirm a visible failure message appears — failure is never silent (FR-003; spec edge case). If not reproducible in the running browser, mark MANUAL/BLOCKED per `.docs/testcases.md`.
- **C4 — Source link present**: a transcript with a stored URL shows "Open video"; clicking it opens the exact stored URL in a new browser tab while the transcript view stays open and unchanged (FR-004/SC-004).
- **C5 — No source link**: a transcript without a stored `source_url` shows no link; Copy still works normally (FR-005/FR-006/SC-005).
- **C6 — Unsafe URL never offered**: a transcript whose stored `source_url` is `javascript:…`/`data:…`/malformed (construct via DB only) shows no link (FR-005; research #4).
- **C7 — Empty transcript**: a whitespace-only transcript copies the empty text with normal success feedback — no error, no crash (spec edge case).
- **C8 — Very long transcript**: full text lands on the clipboard; feedback behaves as for short transcripts (spec edge case).
- **C9 — Special characters**: a transcript containing HTML-like or special characters pastes verbatim as plain text — nothing interpreted, formatted, or stripped (spec edge case).
- **C10 — Repeated clicks**: rapid clicking on Copy yields a fresh copy + fresh feedback each time; view never breaks, no duplicated content (spec edge case).

## Accessibility checks (US1-AC4, US2-AC3, SC-007)

- [ ] Tab reaches **Copy transcript** and **Open video**; 003 theme's visible focus ring shows on both (FR-007)
- [ ] Copy operable via Enter/Space, link via Enter (native elements)
- [ ] With a screen reader (or DevTools accessibility tree): copy success/failure is announced via the `role="status"` region — outcome not conveyed by color alone (FR-003 AC4)
- [ ] Switch tabs while feedback is showing → it still clears on its own; no stale state on return (spec edge case)

## Regression gate (SC-006, FR-008)

- [ ] Run the 001/002/003 quickstart scenarios (S1–S8, M1–M4, V1–V6, R1–R5) — every existing flow (sign-in, transcribe, view from history, delete, reading layout, theme) behaves exactly as before
- [ ] `.docs/testcases.md`: `transcript-actions` row passes; no existing row changed
- [ ] Confirm zero backend/storage/API changes shipped with this feature (git diff shows `extension/` only)

## Expected outcome summary

| Scenario | Gate |
|---|---|
| C1–C3 copy behavior | SC-001/002/003, FR-001/002/003, US1 |
| C4–C6 source link | SC-004/005, FR-004/005/006, US2 |
| C7–C10 copy edge cases | SC-002/003, FR-002/003 |
| Accessibility checks | SC-007, FR-007 |
| Automated suites (extension + backend) | SC-001/002/003/007, SC-006 |
| Regression gate | SC-006, FR-008 |