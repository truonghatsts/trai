# Contract: TRAI Brand (name, tagline, icon)

Phase 1 output of `/speckit.plan`. The presentation contract for the rebrand across the six user-visible pages, the Chrome entry surfaces, and the regenerated build output, plus the integration rules that keep it presentation-only (FR-007/FR-008/FR-011). Design decisions: [../research.md](../research.md); entities: [../data-model.md](../data-model.md); validation scenarios: [../quickstart.md](../quickstart.md). API surface, storage, auth, and behavior: **unchanged** (FR-007).

## 1. Brand strings (FR-001/FR-002/FR-003/FR-004)

Exact replacements, applied identically in all six HTML files:

| Spot | Old | New |
|---|---|---|
| `<title>` (4 extension pages) | `Sign in — Video Transcript` / `Transcript — Video Transcript` / `History — Video Transcript` / `Notice — Video Transcript` | `Sign in — TRAI` / `Transcript — TRAI` / `History — TRAI` / `Notice — TRAI` |
| `<title>` (2 auth pages) | `Confirm your email — Video Transcript` / `Reset password — Video Transcript` | `Confirm your email — TRAI` / `Reset password — TRAI` |
| `<p class="brand-name">` (all 6) | `Video Transcript` | `TRAI` |
| `<p class="brand-tagline">` (all 6) | `language reading room` | `Transcribe with AI` |

- Files: `extension/src/pages/{signin,job,history,notice}.html`, `backend/src/auth/pages/{confirm,reset}.html`.
- No `.ts` file references brand text (research #1) — no logic change.
- Grep gate after the change: 0 occurrences of `Video Transcript` and `language reading room` in `extension/src`, `backend/src`, `extension/manifest.json` (SC-001/SC-002).

### Tagline rendering rule (shared/theme.css)

`.brand-tagline` in `shared/theme.css` loses `text-transform: lowercase` (research #5); all other properties unchanged. Authored text renders verbatim, so "AI" stays uppercase. One shared-sheet edit covers both build outputs (copied by `extension/build.mjs` and `backend/scripts/build-auth.mjs`).

## 2. Manifest + icon wiring (FR-005/FR-006)

`extension/manifest.json` deltas — only the three fields below change; everything else (version, permissions, host_permissions, background, content scripts) is untouched:

```jsonc
{
  "name": "TRAI",
  "icons": {
    "16": "icons/icon16.png",
    "32": "icons/icon32.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  },
  "action": {
    "default_icon": { "16": "icons/icon16.png", "32": "icons/icon32.png" }
  }
}
```

- `name` drives the management-page entry, the toolbar tooltip, and the toolbar context menu (FR-001 AC4).
- `icons` drives the management page (48 px) and its details view (128 px); `action.default_icon` drives the toolbar (16 px, 32 px on 2× DPI) — FR-006/SC-003.
- Icon assets: `extension/src/icons/icon.svg` (source of truth) + committed `icon16/32/48/128.png`, lantern-only glyph in 003's palette (research #4); PNG required — Chrome does not accept SVG for manifest icon fields (research #2).
- `description` unchanged (contains no brand string).

## 3. Build output (FR-006/FR-009)

`extension/build.mjs` `copyStatic()` gains: `cp('src/icons', path.join(dist, 'icons'), { recursive: true })` (or per-file copy of the four PNGs). Every build wipes `dist/` and regenerates it from committed sources — the rebuilt output must contain `dist/icons/icon{16,32,48,128}.png` and the renamed manifest (FR-009c). Backend build unchanged (`build-auth.mjs` already copies the renamed HTML pages).

## 4. Docs in the same change (FR-009/FR-010)

- `.docs/testcases.md` (constitution regression-checklist currency, research #7):
  - `extension` row: pass criterion `chrome://extensions shows "Video Transcript"` → `shows "TRAI"`; add icon criteria — `dist/icons/icon{16,32,48,128}.png` exist and the lantern icon renders in the toolbar + management page.
  - `build` row: add criterion — rebuilt dist contains the new name (manifest) and the four icon files.
  - `backend`, `signin`, `transcribe`, `transcript-actions` rows: untouched (FR-007).
- `quickstart.md` (this feature): created at plan time; manual scenarios B1–B8 cover the renamed surfaces and icon checks (FR-010).

## 5. Integration rules (FR-007/FR-008/FR-011)

- **No behavior change**: zero edits to extension page logic (`.ts`), `background/`, routes, storage, auth, migrations, or the API contract; `shared/theme.css` changes by exactly the one removed `text-transform` property.
- **No identifier change**: storage keys (`vtToken`, `pendingVideo`), API routes, and account references stay byte-identical; installation identity is name-independent.
- **No data change**: nothing stored, transmitted, or collected; transcripts/jobs/accounts/history byte-identical.
- **Historical docs untouched**: zero edits under `specs/001–004` (SC-005).
- **No new functionality**: no new pages, no dark mode, no store release, no branding beyond name/tagline/icon (FR-011; Out of Scope).

Contract reference: entities in [../data-model.md](../data-model.md), design decisions in [../research.md](../research.md), validation scenarios in [../quickstart.md](../quickstart.md).