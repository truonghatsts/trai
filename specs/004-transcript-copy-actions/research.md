# Research: Transcript Copy Actions

Phase 0 output of `/speckit.plan`. Resolves every technical unknown for the bottom-of-transcript actions feature on top of the 001/002/003 stack (Chrome MV3 extension + Fastify backend, both esbuild-bundled, vitest-tested). Format per decision: **Decision / Rationale / Alternatives considered**.

## 1. Clipboard write in an MV3 extension page: `navigator.clipboard.writeText`, no permission, no manifest change

- **Decision**: The Copy button handler in `job.html` (an extension page — `chrome-extension://` origin, a secure context) calls `await navigator.clipboard.writeText(content)` directly inside the click handler. On rejection it shows the failure message (FR-003). `manifest.json` stays unchanged — no `clipboardWrite` permission, no offscreen document.
- **Rationale**: The Clipboard API requires secure context + transient user activation (the click) — both hold for an extension page tab. Chrome's `clipboardWrite` extension permission only removes the transient-activation requirement and is needed for service-worker/offscreen-document writes; this feature copies from a focused page inside a user gesture, so it is not needed. The failure branch is mandatory anyway (FR-003: failure is never silent), so there is no silent-loss risk if a browser refuses the write. Feature 003's spec edges ("browser denies clipboard access") are covered by that visible rejection path.
- **Alternatives considered**: `clipboardWrite` manifest permission — rejected (unneeded; widens install-time permission surface). Offscreen-document write — rejected (for service workers; the job page is a tab document with focus). `document.execCommand('copy')` fallback via hidden textarea — rejected (deprecated; in an extension page with focus it adds no reach; when the API rejects (focus/permission loss) execCommand fails too, so the visible-failure branch is the honest coverage).

## 2. Copy payload: the raw stored content string, not the rendered DOM text

- **Decision**: `loadTranscript()` keeps the raw string from `GET /api/transcripts/{id}` in module scope (`currentContent`); `renderTranscript()` stores it; the Copy handler copies exactly that string. It never reads `contentEl.textContent`.
- **Rationale**: FR-002/SC-002 demand the clipboard equal the **stored** transcript character-for-character. Feature 003's reading layout inserts view-time `\n` at sentence boundaries in the DOM (`splitIntoLines`), so `contentEl.textContent` can differ from the stored text. Copying the raw response string keeps the guarantee trivial and provable; the display stays a pure presentation concern (003 FR-006 untouched). Whitespace-only/empty transcripts copy the empty string with normal feedback, per the spec edge case.
- **Alternatives considered**: Copy `contentEl.textContent` — rejected (leaks 003 layout line breaks into the clipboard, violating FR-002 for multi-sentence transcripts). Re-fetch the transcript on click — rejected (unneeded network + race with delete; the string is already in scope).

## 3. Source link: native anchor, no `chrome.tabs`, no API change

- **Decision**: A static `<a id="source-link" target="_blank" rel="noopener">` in the actions row; `job.ts` sets `href` at render time and `hidden` when the URL is absent or unsafe. `target="_blank"` opens a new tab natively in an extension page; the transcript view keeps focus and state. Backend unchanged — `GET /api/transcripts/{id}` already returns `source_url` (001 `contracts/api.md`; verified in `backend/src/api/routes/transcripts.ts`), the extension's `loadTranscript` type just starts reading the field it already receives.
- **Rationale**: Zero-JS opening via a real link also gives keyboard operability (Enter) and a visible focus ring from 003's theme for free (FR-007). `rel="noopener"` is the standard safety for `target="_blank"`.
- **Alternatives considered**: `chrome.tabs.create({ url })` in a click handler — rejected (more code; needs a `tabs`-adjacent API path for zero benefit over the native anchor). Popup/window open — rejected (spec: new browser tab, view untouched).

## 4. Unsafe-URL guard: mirror the backend's `parseSourceUrl` rule, as a small pure helper

- **Decision**: New DOM-free helper `isSafeWebUrl(raw: string): boolean` in `extension/src/shared/actions.ts`; `job.ts` shows the link only when it returns true. Rule set mirrors the backend's `parseSourceUrl` (`backend/src/api/routes/jobs.ts`): parseable by `new URL()`, protocol `http:`/`https:`, non-empty hostname.
- **Rationale**: FR-005 forbids offering a stored URL that is not a valid web link (opening it could be unsafe) — a `javascript:`/`data:`/malformed stored value must never become an `href` a click activates. The backend already validates at creation, but the view is the last line of defense for historical or hand-edited data, and the rule is cheap. Mirroring the backend's exact predicate keeps one mental model for "what is a safe web URL" across the repo (the extension check is the strict subset the view needs; the backend's extra "bare domain" rule is about *video pages*, which the view must not assume).
- **Alternatives considered**: Trust stored values blindly — rejected (violates FR-005's explicit safety wording). Reuse backend code — impossible (different package; the check is 5 lines). `href` sanitization via `URL.parse` — same outcome, no API-shape gain; `new URL` is already the repo's idiom.

## 5. Outcome feedback: `role="status"` live region + auto-clearing text, timer reset per click

- **Decision**: A `<p id="copy-feedback" role="status">` (polite live region) under the actions row. On success: "Copied — transcript text is on your clipboard."; on failure: "Copy failed — your browser blocked clipboard access. Try again." Text is set via `textContent`, cleared by a `setTimeout` (≈4 s); each click clears the previous timer before arming the next (rapid clicks always end in the newest outcome).
- **Rationale**: FR-003 + AC3/AC4 of US1: the outcome must be visible, temporary, and announced to assistive technology, not color-only. `role="status"` is the native polite-announcement mechanism (no `aria-live` plumbing); text is the content, so nothing relies on color; a single timer per click gives "clears on its own" including the switch-tabs edge (timers run regardless of focus). 003's theme already styles the page; the message inherits contrast-safe tokens.
- **Alternatives considered**: `role="alert"` — rejected (assertive interrupts the reading flow; polite status matches "brief, clearly visible confirmation"). `aria-live="polite"` on the button — rejected (status role is the standard wrapper). CSS-only animation state — rejected (invisible to AT, violates AC4).

## 6. Placement & state: actions row lives under the transcript `<pre>`, shown only in transcript view

- **Decision**: `job.html` gains `<div id="transcript-actions" hidden>` containing the Copy button, the source link, and the feedback region, placed directly below `pre#content`. `renderTranscript()` unhides it together with the content; every other page state (status polling, error box, start box, verification guidance) leaves it hidden.
- **Rationale**: FR-001: the actions sit at the bottom of the transcript view, adjacent to each other. The existing page already toggles state boxes via `hidden` (002 pattern; 003 contract rule: theme must not override `[hidden]`), so one more hidden box follows the established idiom. Because history and post-transcription entry both route through `loadTranscript` → `renderTranscript` (verified: `history.ts` opens `job.html?job=…&view=transcript`), the actions appear identically from every entry point (spec edge case), with zero changes outside `job.html`/`job.ts`.
- **Alternatives considered**: Inject the actions into `pre#content` — rejected (mixing controls into the reading surface breaks 003's calm transcript container). Always-visible actions — rejected (would show Copy for a non-transcript page state). Separate page/section — rejected (over-build; one hidden box suffices).

## 7. Empty/whitespace transcript state

- **Decision**: `renderTranscript()` shows the actions whenever the transcript view renders, including the empty case (placeholder "(No speech detected in this video.)" stays in the `<pre>`; Copy copies the raw empty/whitespace string and reports normal success). No source link is offered when `source_url` is absent or unsafe, per rule 4.
- **Rationale**: The spec edge case explicitly requires empty transcripts to copy without error and the link to be independent of copy (FR-006). The copy payload is the raw string, so "copy the empty text" is free — no special casing beyond showing the row.
- **Alternatives considered**: Hide the actions for empty transcripts — rejected (contradicts the spec edge case wording).

## Manual configuration required (not code)

- None. No env vars, no dashboard settings, no migrations, no backend deploy beyond a rebuild (zero backend source change — FR-008). Supabase/Railway/extension env stay as configured for 001/002/003.
- Branch: create `004-transcript-copy-actions` from current work (003 branch, implemented) before implementation, per the 002/003 precedent — no code changes land on the 003 branch.
- Regression impact: `.docs/testcases.md` gains the `transcript-actions` row (already recorded at specify time); existing rows unchanged (the actions never alter `#content` or prior pass criteria).