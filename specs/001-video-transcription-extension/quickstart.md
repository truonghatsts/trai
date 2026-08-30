# Quickstart & Validation Guide: Video Transcription Extension

Phase 1 output of `/speckit.plan`. Runnable validation scenarios proving the feature works end to end. Implementation details live in the implementation phase (tasks.md); this is a run guide only. Contract details: [contracts/api.md](contracts/api.md), [contracts/ui.md](contracts/ui.md); entities: [data-model.md](data-model.md).

## Prerequisites

- Chrome desktop browser
- Node 20 + npm
- Supabase project (or `supabase start` local stack) with the `jobs` / `transcripts` migrations applied and one Auth user created
- Railway (or local equivalent) service running the backend; env: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `STT_PROVIDER` + provider key, `YTDLP_PATH`
- `yt-dlp` binary present in the worker image
- A public YouTube video **under 5 minutes** (launch-gate video, SC-001) and one **over 5 minutes**

## Setup

```bash
# 1. Backend: install and run locally
cd backend && npm install && npm run migrate && npm run dev

# 2. Extension: build and load unpacked
cd extension && npm install && npm run build
# Chrome → chrome://extensions → Developer mode → Load unpacked → extension/dist

# 3. Extension config: point env at the backend base URL and Supabase project
```

## Validation scenarios

### S1 — Core flow: transcript for a public video (US1, SC-001/007/008)

1. Open the launch-gate YouTube video (< 5 min) in Chrome, signed out.
2. Click the extension → **a new tab opens immediately** prompting sign-in; no job starts (US1-AC1).
3. Sign in → the tab shows the job moving `queued → downloading → transcribing`, ending `ready` with readable plain-text paragraphs (US1-AC2, FR-005/007).
4. **Expected**: end-to-end within 10 minutes; spoken content reproduced as coherent text.

### S2 — Over-5-minutes rejection (US1-AC3, FR-003, SC-003)

1. Open a video longer than 5 minutes; click the extension.
2. **Expected**: clear rejection message; worker logs show **no** download started; no job row created.

### S3 — Retry after failure (US1-AC4, FR-006, SC-004)

1. Request a transcript for a video whose source is temporarily unavailable (e.g., block the worker's egress once).
2. **Expected**: job ends `error` with a best-effort message (FR-013); clicking Retry starts a fresh attempt from the pipeline start; with egress restored it succeeds.

### S4 — Reopen by exact URL (US2, FR-008, SC-002)

1. After S1, reload the exact same URL and click the extension.
2. **Expected**: stored transcript opens immediately; no new job; backend shows no new job row.
3. Add a tracking param (`&foo=bar`) to the URL and click again → treated as a different URL; a new job is offered (edge case, exact matching).

### S5 — Single active job (FR-004, US2-AC2)

1. Start a job on video A; immediately request a transcript for video B.
2. **Expected**: second request rejected with a clear "one at a time" message; requesting A again shows the existing job's progress instead of duplicating.

### S6 — Job survives tab close (US4, FR-012, SC-004)

1. Start a job, close the tab immediately.
2. Wait for the video duration to pass; reopen the extension and request the same URL.
3. **Expected**: job is `ready`; transcript available; no user action required during processing.

### S7 — History: view and delete (US3, FR-011, SC-006)

1. With ≥ 1 completed transcript, open History.
2. **Expected**: each item shows source URL, status, date; view opens the transcript.
3. Delete an item → it disappears; revisiting its URL offers a new job (US3-AC2/3).
4. Delete while a job is still processing → job does not resurrect the item on completion (edge case).

### S8 — Edge cases

- **Non-video page**: click the extension → explanatory notice, no job (edge case).
- **No speech**: a silent video → job completes `ready` with empty/noted transcript (edge case).
- **No media source** (private/removed/region-locked): job fails with best-effort error + Retry (FR-013).
- **Expired session**: job page prompts sign-in before any job starts or retries (edge case).
- **Transient audio**: after any completed job, worker temp dir contains no audio files (FR-010, SC-005); Supabase Storage empty.

## Expected outcome summary

| Scenario | Gate |
|---|---|
| S1 | SC-001, SC-007, SC-008 (launch gate: one public YouTube video end to end, FR-014) |
| S2 | SC-003 |
| S3/S6 | SC-004 |
| S5 | FR-004 |
| S4 | SC-002 |
| S7 | SC-006 |
| S8 | FR-010, FR-013, edge cases |