# Research: Paper Lantern Theme

Phase 0 output of `/speckit.plan`. Resolves every technical unknown for the visual-system + reading-layout feature on top of the 001/002 stack (Chrome MV3 extension + Fastify backend, both esbuild-bundled, vitest-tested). Format per decision: **Decision / Rationale / Alternatives considered**.

## 1. Styling approach: one shared plain-CSS file, no framework, no preprocessor

- **Decision**: A single canonical stylesheet at repository root — `shared/theme.css` — written in plain CSS using custom properties (`:root`) for the palette tokens. It is copied into both build outputs by the existing static-copy steps (`extension/build.mjs` `copyStatic()` and `backend/scripts/build-auth.mjs`), then linked from the six HTML pages.
- **Rationale**: The repo has zero styling tooling today (all pages are unstyled browser-default HTML). Both builds already copy static files (HTML pages, manifest) — adding one CSS copy line per build reuses the existing pipeline, needs no new packages, and keeps a single source of truth for the theme. CSS custom properties give the token system (palette, spacing, radii) without a preprocessor.
- **Alternatives considered**: Tailwind/Sass/postcss — rejected (new toolchain + build step for a ~400-line stylesheet). Per-page `<style>` blocks — rejected (theme duplicated 6×, guaranteed drift). Duplicate `theme.css` per project — rejected (two copies of the same design system diverge; the shared file is the point of the feature).

## 2. Why the stylesheet must be duplicated into two dists (and why a root `shared/` file is correct)

- **Decision**: The canonical file lives at repo root `shared/theme.css`; the extension build copies it to `dist/src/pages/theme.css` and the backend build to `dist/auth/pages/theme.css`. Each page links it relatively (`<link rel="stylesheet" href="theme.css">`).
- **Rationale**: Extension pages are `chrome-extension://` documents — they cannot load the backend's copy (different origin, and MV3 default CSP `style-src 'self'` blocks remote stylesheets). Backend pages cannot load from the extension. So the two dist copies are required; the root file keeps them in sync. The backend needs **no route change**: `@fastify/static` already serves the whole `dist/auth/pages` directory under `/auth/`, so `GET /auth/theme.css` works the moment the file exists in dist.
- **Alternatives considered**: Canonical file inside `extension/src/pages/` with the backend build referencing `../extension/...` — rejected (backend build reaching into the extension project is a worse cross-project dependency than a neutral root file). Duplicated per-project copies — rejected (drift, see #1).

## 3. Palette: warm paper + indigo + lantern gold, with WCAG AA on every text pair

- **Decision**: Light-only token set (FR-009): paper background `#FAF5EC` (warm off-white), body ink `#26221B` (warm near-black), primary/action indigo `#403B8C`, lantern gold `#E8A33D` (decorative: mark, borders, sparse highlights) with darker gold `#B7791F` permitted only for large text/UI borders. Computed contrast on paper: ink ≈ 14.6:1 (AAA), indigo ≈ 8.7:1 (AAA), white-on-indigo buttons ≈ 9.4:1 (AAA), `#B7791F` ≈ 3.35:1 (passes large-text/UI 3:1 only). **Rule: gold never carries body or small text.** Exact token table + ratios in [contracts/theme.md](contracts/theme.md); Phase D re-verifies every pair with a contrast checker (SC-005).
- **Rationale**: FR-008 demands AA or better on every themed surface; the chosen pairs clear AA with margin. Indigo is the spec's named primary; gold on warm paper cannot reach 4.5:1 without becoming brown, so gold is scoped to non-text/decorative + large-text use — this is the honest way to keep the "lantern gold" identity without failing contrast.
- **Alternatives considered**: Brighter gold `#D97706`-family for text — rejected (≈2.9:1, fails AA even for large text). Pure white surfaces everywhere — rejected (loses the warm-paper identity; transcript reading surface keeps near-white `#FFFDF8` for maximal reading contrast per US1-AC3).

## 4. Reading layout: deterministic Unicode-punctuation heuristic, not language-aware parsing

- **Decision**: A DOM-free pure function `splitIntoLines(text: string): string` (`extension/src/shared/reading-layout.ts`), applied in `job.ts` `renderTranscript()` by replacing `contentEl.textContent = content` with `contentEl.textContent = splitIntoLines(content)`. Rules, in FR-004 order:
  1. **Honor existing line breaks** — process per line; every `\n` in the input stays (never merged, never removed).
  2. **Sentence boundaries** — split after terminator sequences: `!`, `?`, `…`, `。`, `！`, `？`, and `.` (incl. repeated `...`), where the terminator is followed by optional closing-quote/bracket chars (`" ' 」』）]}`) then whitespace or end of line. Period-specific guards (no split): known abbreviations (`mr. mrs. ms. dr. prof. st. vs. e.g. i.e. etc. approx. inc. ltd. u.s. u.k.` — case-insensitive), single-capital initials (`J. Smith`), decimals (`3.14`). Uncertain → no split (degrade safe).
  3. **Clause fallback** — a line that contains no sentence boundary and exceeds `HARD_LIMIT` (200 chars) is split at confident clause punctuation (`,` `;` `:` `，` `；` `：` em dash) each followed by whitespace. Lines at or under the limit with no sentence boundary stay unbroken.
  4. **Degrade safely** — no confident boundary anywhere → the span stays one unbroken line (CJK without punctuation, unusual scripts; spec edge case).
- **Invariant (FR-006)**: the output differs from the input only by inserted `\n` characters — `splitIntoLines(t).split('\n').join('') === t`. The function never deletes, duplicates, or reorders a character, and is applied at view time only; storage and retrieval are untouched. Unit tests assert the invariant on every fixture plus each rule/edge case (SC-002/SC-003).
- **Rationale**: FR-004/FR-005 explicitly forbid guessing and language-aware semantics; a deterministic, locale-free punctuation rule set is testable, predictable, and degrades exactly as the spec demands. English-dominant transcripts get sentence lines; everything else degrades to safe no-split behavior. O(n) single pass keeps very long transcripts responsive.
- **Alternatives considered**: `Intl.Segmenter` — rejected (locale-dependent, ICU-based language-aware segmentation contradicts the spec's "not semantic/language-aware parsing" and would actively split CJK where the spec demands unbroken degrade; output varies across ICU versions, untestable determinism). `<p>`/`<div>` per sentence in the DOM — rejected (restructures the DOM and makes the byte-preservation proof harder; a single text node in the existing `<pre>` keeps the guarantee trivial). CSS-only (columns/wrapping) — impossible (CSS has no sentence awareness).

## 5. Lantern mark: pure CSS, no image files, no SVG

- **Decision**: A decorative `<span class="lantern" aria-hidden="true"></span>` styled with gradients, `border-radius`, and layered `box-shadow` (a warm-gold rounded body with a paper-colored "window", a small cap, and a soft glow; tassel via `::after`). The glow pulse animation (if used) is decorative and disabled under `prefers-reduced-motion`.
- **Rationale**: FR-002 requires "styling only (no image files)". Pure CSS matches the letter of the requirement, ships zero assets, and stays crisp at any size via CSS. `aria-hidden` + the adjacent text identity ("Video Transcript" / "language reading room") satisfy FR-008's no-color-alone rule — the mark conveys nothing essential.
- **Alternatives considered**: Inline SVG — rejected (an SVG graphic is an image in spirit if not in file form; the spec's "drawn entirely with styling" reads as CSS). Emoji lantern `🏮` — rejected (platform-dependent rendering, unprofessional on a reading product). Image file — forbidden by FR-002.

## 6. Typography: system font stacks, no webfonts

- **Decision**: System stacks only — reading surface uses an editorial serif stack (`Georgia, "Iowan Old Style", "Palatino Linotype", serif`), UI chrome uses `system-ui, -apple-system, "Segoe UI", sans-serif`. The transcript surface gets generous measure (~65ch max-width), `line-height: 1.7`, and `white-space: pre-wrap` so unbroken long spans wrap visually instead of scrolling horizontally.
- **Rationale**: "Warm editorial reading room" tone from a serif reading surface costs nothing; webfonts would be new network assets (violating the no-new-assets assumption, and extension pages have CSP + offline constraints). `pre-wrap` covers the "extremely long sentence" and narrow-window edge cases without touching text.
- **Alternatives considered**: Google Fonts (e.g., "Source Serif") — rejected (new asset + network dependency + CSP friction). Monospace transcript (001 default `<pre>`) — replaced: serif reads better for language learners; the reading layout is the point of this feature.

## 7. Accessibility mechanics (FR-008)

- **Decision**: `:focus-visible` gets a 2–3 px indigo ring + 2 px offset on every interactive element (links, buttons, inputs); `@media (prefers-reduced-motion: reduce)` disables the lantern glow pulse and all transitions; backend auth controls are ≥44×44 px tap targets with `font-size: 16px` inputs (prevents iOS zoom-on-focus); all statuses/errors are text (`role="alert"` pattern already in use); no essential state is color-only. Extension pages gain `<meta name="viewport">` so they reflow gracefully in narrow/resized windows (spec edge case) with no horizontal scroll.
- **Rationale**: The spec's accessibility acceptance scenarios are concrete (visible focus, AA contrast, reduced motion, no color-alone info); these are the standard, dependency-free mechanisms for each. CSS must not override the `[hidden]` attribute (state switching on signin/job pages relies on it) — documented in the contract as an integration rule.
- **Alternatives considered**: JS focus-trap libraries / motion libraries — rejected (no new dependencies; native CSS suffices).

## 8. Backend auth-page contract check

- **Decision**: Extend `backend/tests/auth-pages.test.ts` with `GET /auth/theme.css → 200 text/css` alongside the existing page-reachability tests.
- **Rationale**: The existing tests only assert the pages exist; the theme is a build artifact, and the `pretest` hook already runs `build-auth.mjs`, so this test cheaply guards the new copy step in CI-like paths (SC-001). No backend logic tests are needed — the feature adds zero backend behavior.
- **Alternatives considered**: Screenshot-based visual testing — rejected (no browser-testing infra in the repo; the manual visual checklist in quickstart.md is the specified gate).

## Manual configuration required (not code)

- None. This feature adds no dashboard settings, no env vars, no migrations, and no email-template changes (unlike 002). Supabase, Railway, and extension env stay exactly as configured for 001/002 (SC-004/SC-007).
- Branch: create `003-paper-lantern-theme` from current work before implementation (Phase A), per the 002 precedent.