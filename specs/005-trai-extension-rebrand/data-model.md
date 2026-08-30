# Data Model: TRAI Extension Rebrand

Phase 1 output of `/speckit.plan`. Entities from `spec.md` (§ Key Entities, FR-007). **This feature introduces, changes, or removes no persisted data, no API fields, no tables, and no stored records.** Storage: unchanged from 001/002/003/004 (Supabase Postgres: `jobs`, `transcripts`; Supabase Auth: `auth.users`). The rebrand is presentation + build assets only.

## Entities

### Brand identity (presentation constants, not data)

The three visible brand elements — name, tagline, icon. They exist only as static text in six HTML files + `manifest.json` and as image files; they are **not stored, not configurable, not persisted anywhere** (research #1, #2):

| Element | Value (exact) | Where it lives |
|---|---|---|
| name | `TRAI` | `<title>` + `.brand-name` in the 4 extension pages (`signin.html`, `job.html`, `history.html`, `notice.html`) and 2 backend auth pages (`confirm.html`, `reset.html`); `extension/manifest.json` `name` (drives management-page entry + toolbar tooltip) |
| tagline | `Transcribe with AI` | `.brand-tagline` on all six pages; `shared/theme.css` `.brand-tagline` drops `text-transform: lowercase` so "AI" renders uppercase (research #5) |
| icon | lantern glyph, Paper Lantern palette (research #4) | `extension/src/icons/icon.svg` (source) + `icon16/32/48/128.png` (generated, committed); manifest `icons` + `action.default_icon`; copied into `dist/icons/` by the build |

No persistence, no migration, no user preference, no collection. Old values ("Video Transcript", "language reading room") are replaced in place; nothing is stored about the rename.

### Icon asset set (build inputs → build outputs)

| Attribute | Value |
|---|---|
| source | `extension/src/icons/icon.svg` — lantern-only glyph (no text), 003 palette: `--gold #E8A33D` body, `--gold-deep #B7791F` edge stripes/cap/tassel, `--paper-card #FFFDF8` window slats, optional `--indigo #403B8C` accent (research #4) |
| generated (committed) | `icon16.png`, `icon32.png`, `icon48.png`, `icon128.png` — rasterized once via macOS `qlmanage` (research #3) |
| build output | `extension/dist/icons/icon{16,32,48,128}.png` — copied by `build.mjs` `copyStatic()`; dist is wiped + regenerated on every build (gitignored, FR-009) |
| consumption | toolbar: `action.default_icon` 16/32 (2× DPI picks 32); management page: `icons` 48; management details: `icons` 128 (FR-006, SC-003) |
| persistence | none — build artifacts only; not user data |

## Relationships

```text
icon.svg (source of truth) ──rasterize (one-time)──> icon{16,32,48,128}.png ──copy (build)──> dist/icons/*.png
                                                                                              └──referenced by──> manifest.json icons + action.default_icon
Brand identity (static text) ──rendered by──> 6 HTML pages + manifest name (Chrome entry, tooltip)
```

- No new tables, columns, indexes, migrations, or API fields anywhere (FR-007; SC-004).
- No stored data is read, written, migrated, or rewritten by this feature — transcripts, jobs, accounts, and history stay byte-identical (spec US4-AC2).
- Identifiers (storage keys `vtToken`/`pendingVideo`, API routes, account references) are name-independent and unchanged (spec Assumptions; FR-007).

## Rollout

None in the data sense. No migration, no env var, no dashboard setting. Rollout = rebuild both projects (extension: new dist with icons + renamed pages; backend: rebuild/redeploy so `dist/auth/pages` carries the renamed HTML), reload the unpacked extension, then run the quickstart scenarios B1–B8 and the regression gate (research.md § Manual configuration; FR-009).