# Contract: Paper Lantern Visual System, Reading Layout & Integration

Phase 1 output of `/speckit.plan`. Three contracts in one document, mirroring the feature's three surfaces: (1) the visual system every themed page must present, (2) the display-only transcript reading layout with its preservation guarantee, (3) the integration rules that keep the feature a pure presentation layer (FR-009..FR-013). Design decisions: [../research.md](../research.md); entities: [../data-model.md](../data-model.md); validation scenarios: [../quickstart.md](../quickstart.md).

## 1. Visual system contract (FR-001/FR-002/FR-007/FR-008)

### Palette tokens (light only — FR-009)

Canonical source: `shared/theme.css` `:root` custom properties. Contrast ratios computed against their intended surface; Phase D re-verifies with a contrast checker (SC-005).

| Token | Hex | Usage | Contrast on paper (#FAF5EC) | AA |
|---|---|---|---|---|
| `--paper` | `#FAF5EC` | page background (warm off-white) | — | — |
| `--paper-card` | `#FFFDF8` | cards, transcript reading surface | — | — |
| `--ink` | `#26221B` | body text | ≈ 14.6:1 | AAA |
| `--indigo` | `#403B8C` | primary text/actions, links, buttons, focus ring | ≈ 8.7:1 | AAA |
| `--indigo-ink` (white) | `#FFFFFF` | text on indigo buttons | ≈ 9.4:1 (on `--indigo`) | AAA |
| `--gold` | `#E8A33D` | lantern mark, borders, sparse highlights — **never text** | n/a (non-text) | 3:1 UI |
| `--gold-deep` | `#B7791F` | large text (≥18.7 px bold / 24 px) and UI borders only | ≈ 3.35:1 | 3:1 only |

Rules:
- **Gold never carries body or small text** (research #3) — any gold-as-text need uses `--indigo` or `--ink`.
- Errors use `--ink`-level dark text with a text message (existing `role="alert"` pattern) — no color-alone status (FR-008 AC4).

### Brand identity (FR-002)

Every themed page — extension (signin, job, history, notice) and backend (confirm, reset) — carries the same brand header, placed above the page's own `<h1>`:

```html
<header class="brand">
  <span class="lantern" aria-hidden="true"></span>
  <div class="brand-text">
    <p class="brand-name">Video Transcript</p>
    <p class="brand-tagline">language reading room</p>
  </div>
</header>
```

- Product name "Video Transcript" is **never changed** (FR-010); the mark + tagline are additions.
- Lantern mark: pure CSS on the `span` (gradients + `border-radius` + layered `box-shadow`; tassel via `::after`), `aria-hidden`, decorative glow pulse disabled under `prefers-reduced-motion`. No image files, no SVG (FR-002; research #5).
- The page `<h1>` (e.g. "Sign in", "Transcript") remains the page's single h1; the brand is not a heading.

### Component styling

- Buttons: indigo fill (`--indigo`) with white text; `:hover`/`:active` darken one step (indigo-desat, e.g. `#36307A`); `:disabled` keeps text readable (ink at ≥70% opacity is still ≥4.5:1 on the fill — verify in Phase D).
- Links: `--indigo` underlined; focus ring visible.
- Forms/inputs: 1–2 px `--gold-deep`/`--ink`-mix border on `--paper-card`, 16 px font minimum (backend pages; prevents iOS zoom), 44 px minimum tap target for all interactive elements (FR-007 AC2).
- Cards/surfaces: `--paper-card` with a subtle warm shadow; the transcript reading surface (`pre#content`) is the calmest element on the page: `--paper-card` background, `--ink` text, serif stack, ~65ch max measure, `line-height: 1.7`, `white-space: pre-wrap` (long unbroken spans wrap — no horizontal scroll; spec edge case).
- Status/error boxes and history rows are text-first cards with the same tokens; nothing essential relies on color.

### Accessibility contract (FR-008)

- `:focus-visible`: 2–3 px `--indigo` ring, 2 px offset, on every link/button/input across all six surfaces.
- `@media (prefers-reduced-motion: reduce)`: kill the lantern glow pulse and all transitions; content is complete without any motion.
- Text contrast: AA or better on every surface (token table above); body text never on `--gold`.
- No essential information by color alone: lantern is `aria-hidden` + text identity; job statuses are text; history rows carry text labels (unchanged 001 markup).
- **Integration rule**: the theme must not override the `[hidden]` attribute (signin modes, job page state boxes toggle with it) — sections keep browser-default `[hidden]{display:none}`.

## 2. Reading-layout contract (FR-003/FR-004/FR-005/FR-006)

**Surface**: `pre#content` on `job.html`, populated by `job.ts` `renderTranscript()` via the pure function `splitIntoLines(content)` from `extension/src/shared/reading-layout.ts`. View-time only; storage/retrieval untouched.

### Signature & invariant

```ts
splitIntoLines(text: string): string
// INVARIANT: splitIntoLines(text).split('\n').join('') === text
// The output is the input with '\n' characters inserted at confident
// boundaries — never a character deleted, duplicated, or reordered (FR-006).
```

### Boundary rules (applied per line, in FR-004 order)

1. **Existing line breaks win** — the input's own `\n` (incl. blank lines) pass through verbatim; display never merges or removes them.
2. **Sentence boundaries** — split after a terminator sequence (`!`, `?`, `…`, `。`, `！`, `？`, `.` incl. repeated `...`) when it is followed by optional closing-quote/bracket chars (`" ' 」』）]}`) and then whitespace or end of line. Period guards — **no split** when:
   - the token ending at the period is a known abbreviation (case-insensitive: `mr. mrs. ms. dr. prof. st. vs. e.g. i.e. etc. approx. inc. ltd. u.s. u.k.`), or
   - a single capital letter (initials: `J. Smith`), or
   - a digit immediately precedes the period (decimals: `3.14`).
   Anything uncertain → no split (FR-005).
3. **Clause fallback** — a line with **no** sentence boundary and length > `HARD_LIMIT` (200 chars) is split at confident clause punctuation (`,` `;` `:` `，` `；` `：` em dash `—`) each followed by whitespace. Lines ≤ 200 chars without sentence punctuation stay unbroken (calm > aggressive splitting).
4. **Degrade safely** — no confident boundary anywhere in a line → the whole span stays on one line (CJK without punctuation, unusual scripts; spec edge case). Empty/whitespace-only transcript → unchanged render (empty reading surface, no error).

### Edge behavior (spec edge cases → contract behavior)

| Case | Behavior |
|---|---|
| No sentence punctuation (CJK or long run) | span unbroken, text fully visible (pre-wrap wraps visually) |
| Own line breaks | honored first, never merged/removed |
| Single extremely long sentence | clause split at confident punctuation when > HARD_LIMIT; else one line |
| Quotes/ellipses/abbreviations (`Mr. Smith said, "Yes."`) | guards prevent mid-quote/abbreviation splits; wrong boundary = no split, never mangled text |
| Consecutive spaces, tabs, blank lines | preserved exactly (only `\n` inserted) |
| Emoji / unusual Unicode | passes through unchanged |
| Very long transcripts | O(n) single pass; layout applies to whole text; responsive |
| Window resize | theme reflows; `pre-wrap` prevents horizontal scroll |

Constants `HARD_LIMIT` (200) are module-level named constants — the only tuning knobs.

## 3. Integration contract (FR-007/FR-009/FR-010/FR-011/FR-012/FR-013)

### Theme wiring

| Step | File | Change |
|---|---|---|
| Canonical stylesheet | `shared/theme.css` | NEW — all tokens + component + a11y rules |
| Extension build | `extension/build.mjs` `copyStatic()` | add `cp('../shared/theme.css', 'dist/src/pages/theme.css')` |
| Backend build | `backend/scripts/build-auth.mjs` | add `cp('../../shared/theme.css', 'dist/auth/pages/theme.css')` |
| Extension pages | `extension/src/pages/{signin,job,history,notice}.html` | add `<link rel="stylesheet" href="theme.css">`, `<meta name="viewport" content="width=device-width, initial-scale=1">`, brand header |
| Backend pages | `backend/src/auth/pages/{confirm,reset}.html` | add `<link rel="stylesheet" href="theme.css">`, brand header (viewport meta already present) |

### Reading-layout wiring

| Step | File | Change |
|---|---|---|
| Pure function | `extension/src/shared/reading-layout.ts` | NEW — `splitIntoLines` (DOM-free, unit-tested) |
| Renderer | `extension/src/pages/job.ts` `renderTranscript()` | `contentEl.textContent = splitIntoLines(content)` (1-line change; empty-text fallback message unchanged) |
| Unit suite | `extension/tests/reading-layout.test.ts` | NEW — invariant on every fixture + rules/edges (plan.md Test Strategy) |

### MUST NOT change (FR-009..FR-013)

- `backend/src/app.ts`, all API routes, `flow.ts`/`confirm.ts`/`reset.ts`/`client.ts`, db layer, migrations, `manifest.json`, `package.json`/lockfiles, tsconfigs, Supabase/dashboard config, env vars.
- `theme.css` served by the existing `@fastify/static` at `GET /auth/theme.css` — no route registration (research #2).
- No gamification, no dark mode (even hidden), no rename, no new data, no timestamps/translations/vocab, no ownership/auth change, no image/font assets (plan.md Non-Goals).

Contract reference: entities in [../data-model.md](../data-model.md), design decisions in [../research.md](../research.md), validation scenarios in [../quickstart.md](../quickstart.md).