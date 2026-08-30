# Quickstart & Validation Guide: Paper Lantern Theme

Phase 1 output of `/speckit.plan`. Runnable validation scenarios proving the theme + reading layout work end to end. Implementation details live in the implementation phase (tasks.md); this is a run guide only. Visual system + integration: [contracts/theme.md](contracts/theme.md); entities: [data-model.md](data-model.md). 001 and 002 quickstart scenarios remain valid — run them after this suite as the regression gate (SC-004).

## Prerequisites

- Chrome desktop browser; Node 20 + npm
- Existing 001/002 environment: backend running (Railway or local) with `/api/*`, `/auth/confirm`, `/auth/reset`; extension built and loaded unpacked; Supabase configured as in 002 (no new config for this feature — research.md § Manual configuration: **none**)
- At least one stored transcript (from 001/002 flows) including one whose stored text is a single long paragraph
- DevTools access (contrast/focus/reduced-motion checks) and a phone-width viewport option (DevTools device toolbar, 375 px)

## Setup

```bash
# 1. Backend: build serves themed pages (pretest/start build-auth)
cd backend && npm install && npm run build && npm start

# 2. Extension: build and reload unpacked
cd extension && npm install && npm run build
# Chrome → chrome://extensions → reload the unpacked extension
```

## Automated validation (SC-001, SC-002, SC-003, SC-004)

```bash
# Backend: theme reachable on both auth pages + existing gate/page suites stay green
cd backend && npm test    # expect: GET /auth/confirm, /auth/reset, /auth/theme.css → 200; 002 suites unchanged

# Extension: reading-layout invariants + existing 001/002 suites stay green
cd extension && npm test  # expect: reading-layout suite passes (byte preservation on every
                          # fixture; sentence/clause/abbreviation/quote/CJK rules); no regressions
```

## Manual visual checklist — all six surfaces (US1, US3, SC-001)

For each surface **V1 sign-in, V2 job/transcript, V3 history, V4 notice, V5 /auth/confirm, V6 /auth/reset**:

- [ ] Warm paper background, indigo text/actions, gold accents present; no dark surfaces anywhere (FR-009)
- [ ] Brand header: CSS lantern mark (no image file — inspect: no `<img>`, no SVG), "Video Transcript" name, "language reading room" tagline (FR-002)
- [ ] Tab through every control: 2–3 px indigo focus ring clearly visible at all times (FR-008 AC1)
- [ ] Body text readable on its background (AA or better; spot-check links/buttons with DevTools contrast picker) (FR-008 AC2)
- [ ] No essential info conveyed by color alone — statuses/errors are text (FR-008 AC4)
- [ ] V2 specifically: transcript area is a calm, high-contrast reading surface (US1-AC3)

## Reading-layout checks (US2, SC-002/SC-003)

- **R1 — Sentence lines**: open the single-paragraph transcript → sentences appear on separate lines (SC-003 on English content).
- **R2 — Byte preservation**: copy the displayed text, remove only the line breaks the layout added, and diff against the stored text (`GET /api/transcripts/{id}` via the API or the history view) → zero differences (FR-006/SC-002).
- **R3 — Own line breaks honored**: a transcript with its own line breaks shows them exactly; nothing merged or lost (FR-004; edge case).
- **R4 — Degrade safety**: open a CJK or punctuation-free transcript → spans stay unbroken and fully visible (FR-005; edge case); a very long single sentence splits at commas/semicolons only, or stays one line when no confident punctuation exists.
- **R5 — Whitespace**: consecutive spaces/tabs/blank lines preserved in display (edge case).

## Responsive checks (US3, SC-006)

- [ ] DevTools 375 px portrait on V5 and V6: no horizontal scroll; all controls tappable (≥44 px); confirm-email and reset-password flows complete on the themed page (FR-007 AC2/AC3)
- [ ] Extension pages in a resized narrow window: reflow gracefully, no horizontal scroll (edge case)

## Reduced-motion check (US4, SC-005)

- [ ] Enable `prefers-reduced-motion` (OS setting) → lantern glow pulse/transitions disabled; content complete without motion (FR-008 AC3)

## Regression gate (US5, SC-004, SC-007)

- [ ] Run the 001 and 002 quickstart scenarios (S1–S8, M1–M4) — every flow works exactly as before, only the visual presentation changed
- [ ] Search all surfaces: no streaks/rewards/points/badges, no dark-mode toggle, no new data-collection events; backend endpoints/rules/storage unchanged (FR-010/011/012/013)

## Expected outcome summary

| Scenario | Gate |
|---|---|
| V1–V6 visual checklist | SC-001, FR-001/FR-002/FR-008, US1/US3 |
| R1–R5 reading-layout checks | SC-002, SC-003, FR-003/004/005/006, US2 |
| Responsive checks | SC-006, FR-007, US3 |
| Reduced-motion check | SC-005, FR-008, US4 |
| Automated suites (both projects) | SC-001/002/003/004 |
| Regression gate | SC-004, SC-007, US5 |
| Qualitative: calm warm "reading room" feel, transcript surface clean | SC-008 |