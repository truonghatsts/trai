# Contract: Transcript Copy Actions (view-level)

Phase 1 output of `/speckit.plan`. The bottom-of-transcript actions — Copy and the source-video link — as presented in the extension's transcript view, plus the integration rules that keep the feature a pure presentation addition (FR-008). Design decisions: [../research.md](../research.md); entities: [../data-model.md](../data-model.md); validation scenarios: [../quickstart.md](../quickstart.md). API surface: unchanged from 001 — `GET /api/transcripts/{id}` already returns `source_url`; the extension merely reads the field it already receives (FR-008).

## 1. Copy action contract (FR-001/FR-002/FR-003)

### DOM (job.html)

```html
<div id="transcript-actions" hidden>
  <button type="button" id="copy-transcript">Copy transcript</button>
  <a id="source-link" target="_blank" rel="noopener" hidden>Open video</a>
  <p id="copy-feedback" role="status"></p>
</div>
```

Placed directly below `<pre id="content">`. Visible only in transcript view (unhidden by `renderTranscript()` together with the content; all other page states keep it hidden — the existing `[hidden]` idiom, 002 pattern; 003 theme rule: no stylesheet may override `[hidden]`).

### Behavior

- **Payload (FR-002)**: the raw stored `transcript.content` string captured in `loadTranscript()` module scope (`currentContent`) — never `contentEl.textContent`, which may carry 003 reading-layout line breaks. Clipboard content must equal the stored text character-for-character: no URL, title, timestamps, or formatting appended.
- **Write (research #1)**: `navigator.clipboard.writeText(currentContent)` inside the click handler; no manifest change.
- **Outcome (FR-003)**: every attempt yields exactly one visible, temporary, AT-announced outcome in `#copy-feedback` (`role="status"`, polite):
  - success → "Copied — transcript text is on your clipboard."
  - rejection → "Copy failed — your browser blocked clipboard access. Try again."
  - Text cleared on its own after ≈4 s; each click clears the previous timer first (rapid clicks end in the newest outcome; switch-tabs edge clears on its own — timers run without focus).
- **Empty/whitespace transcript (spec edge case)**: actions render; Copy copies the raw (possibly empty) string with normal success feedback; no error path.
- **Repeated clicks (spec edge case)**: every click is a fresh write + fresh feedback; the view never breaks or duplicates content.
- **Keyboard (FR-007)**: native `<button>` — Tab-reachable, Enter/Space operable, 003 theme focus ring applies. Outcome announced via the live region, not by color.

## 2. Source-link contract (FR-004/FR-005)

- **Shown** only when the transcript's stored `source_url` is present **and** `isSafeWebUrl(source_url)` is true (`extension/src/shared/actions.ts`; rule mirrors backend `parseSourceUrl`: parseable, `http:`/`https:`, non-empty hostname — research #4).
- **Activation**: native anchor with `target="_blank"` + `rel="noopener"` — opens the exact stored URL in a new browser tab; the transcript view stays open and unchanged. Keyboard: Tab + Enter (native).
- **Hidden** when no stored URL or the URL is unsafe — Copy still works (FR-006).
- Label: "Open video" (clearly labeled; exact stored URL is the destination, never rewritten).

## 3. Integration rules (FR-006/FR-007/FR-008)

- **No backend change**: zero edits to `backend/src`, routes, storage, or migrations. `GET /api/transcripts/{id}` response (`id`, `source_url`, `content`, `completed_at`) is consumed as-is.
- **No data change**: nothing new stored, transmitted, or collected; the link is derived at render time from the stored URL (data-model.md).
- **Transcript text untouched**: display keeps 003's reading layout; storage/retrieval byte-identical (003 FR-006 preserved).
- **Entry-point independence**: both open paths — post-transcription completion and history reopen — route through `loadTranscript()`/`renderTranscript()`, so actions appear identically (spec edge case).
- **Focus visibility**: 003's `:focus-visible` ring covers the new button and link (both native elements); no new CSS needed beyond the actions-row layout.
- **Non-goals honored**: no share/download/export/transcript-edit; history page, notice page, sign-in page untouched.

Contract reference: entities in [../data-model.md](../data-model.md), design decisions in [../research.md](../research.md), validation scenarios in [../quickstart.md](../quickstart.md).