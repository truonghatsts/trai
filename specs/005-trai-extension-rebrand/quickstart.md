# Quickstart & Validation Guide: TRAI Extension Rebrand

Phase 1 output of `/speckit.plan`. Runnable validation scenarios proving the renamed name, tagline, and lantern icon are visible on every surface and that nothing else moved. Implementation details live in the implementation phase (tasks.md); this is a run guide only. Presentation contract: [contracts/brand.md](contracts/brand.md); entities: [data-model.md](data-model.md). 001–004 quickstart scenarios remain valid — run them after this suite as the regression gate (SC-006).

## Prerequisites

- Chrome desktop browser; Node 20 + npm; macOS (icon rasterization already done — committed PNGs; research.md § Manual configuration)
- Existing 001/002/003/004 environment: backend running (`/api/*`, `/auth/*`), extension built and loaded unpacked; Supabase configured as in 002 (no new config — research.md § Manual configuration)
- A 2× (Retina) display for the high-density checks, or DevTools device-scale emulation

## Setup

```bash
# 1. Extension: rebuild (regenerates dist with new name + icons) and reload unpacked
cd extension && npm install && npm run build
# Chrome → chrome://extensions → reload the unpacked extension

# 2. Backend: rebuild + restart (auth HTML pages changed; dist/auth/pages regenerated)
cd backend && npm run build   # then restart the running service
```

## Automated validation (SC-003, SC-004, SC-006)

```bash
# Both projects: existing suites must stay green — zero new tests (asset-only
# exception, constitution I; research #8). Behavior is unchanged (FR-007).
cd extension && npm test      # expect: all 9 existing suites green, unchanged
cd backend && npm test        # expect: all 5 existing suites green, unchanged
```

## Manual validation — brand surfaces (US1, US2, SC-001, SC-002)

- **B1 — Extension name everywhere**: open the four extension pages (signin, job, history, notice); each shows "TRAI" in the header (`.brand-name`) and in the browser tab title; the page `<h1>` headings are unchanged (FR-001).
- **B2 — Extension tagline**: each extension page shows "Transcribe with AI" under the name — with "AI" uppercase (the old tagline's `text-transform: lowercase` is gone; research #5) — and fits on one line with no clipping/horizontal scroll at desktop and narrow widths (FR-003; spec edge case).
- **B3 — Auth pages**: open `/auth/confirm` and `/auth/reset`; each shows "TRAI" in header + title and "Transcribe with AI" tagline (FR-002/FR-004).
- **B4 — No leftover copy**: search the six pages' visible content and DevTools DOM for the old strings — 0 occurrences of "Video Transcript" and "language reading room" (SC-001/SC-002; contracts/brand.md §1 grep gate).

## Manual validation — Chrome entry + icon (US3, SC-003, SC-007)

- **B5 — Management page**: chrome://extensions shows the extension entry named "TRAI" with the lantern icon (not the generic placeholder) at 48 px, and the details view shows it at 128 px (FR-001/FR-005).
- **B6 — Toolbar + tooltip**: the toolbar shows the compact lantern icon (not the generic placeholder); hovering shows the tooltip "TRAI" (FR-001 AC4, FR-005).
- **B7 — High-density sharpness**: on a 2× display (or DevTools 2× emulation) the toolbar icon renders sharp — no blur/pixelation; the management page icon is sharp at both view sizes (FR-006, SC-003).
- **B8 — Shipped asset set**: `extension/dist/icons/` contains `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png` after a fresh build; `dist/manifest.json` carries `name: "TRAI"`, `icons`, and `action.default_icon` (FR-006/FR-009; contracts/brand.md §2/§3).
- **B9 — 16 px legibility**: the toolbar glyph still reads as a lantern at 16 px (spec edge case; tooltip "TRAI" disambiguates if it reads as a smudge — MANUAL note).

## Regression gate (SC-004, SC-005, SC-006, FR-007/008/009)

- [ ] Run the 001/002/003/004 quickstart scenarios (S1–S8, M1–M4, V1–V6, R1–R5, C1–C10) — every existing flow (sign-in, transcribe, view from history, copy + source link, delete, reading layout, theme, email confirmation, password reset) behaves exactly as before
- [ ] `.docs/testcases.md`: updated `extension` + `build` rows pass (name "TRAI", icon at four sizes, regenerated assets); `backend`/`signin`/`transcribe`/`transcript-actions` rows unchanged and green
- [ ] Stored data untouched: transcripts/account/history byte-identical; `vtToken`/`pendingVideo` keys and API routes unchanged (US4-AC2/AC3)
- [ ] Zero edits under `specs/001–004` (git diff shows `specs/005-*`, `.docs/testcases.md`, `extension/`, `backend/src/auth/pages/`, `shared/theme.css` only; FR-008, SC-005)
- [ ] Build outputs regenerated in the same change: rebuilt `dist/` contains new name + four icons (FR-009c)

## Expected outcome summary

| Scenario | Gate |
|---|---|
| B1–B4 brand text on six pages | SC-001/002, FR-001/002/003/004, US1/US2 |
| B5–B9 icon + Chrome entry | SC-003/007, FR-001/005/006, US3 |
| Automated suites (both projects) | SC-004/006, FR-007 |
| Regression gate + testcases rows | SC-004/005/006, FR-007/008/009 |