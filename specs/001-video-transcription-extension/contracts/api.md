# Contract: Extension ↔ Backend HTTP API

Phase 1 output of `/speckit.plan`. The Chrome extension is the only client. Base URL is the backend service URL (env in the extension). Auth: `Authorization: Bearer <supabase-jwt>` on every request; missing/invalid token → `401`. All IDs are UUIDs. Status enum (FR-005): `queued | downloading | transcribing | ready | error`.

## Endpoints

### POST /api/jobs — resolve or create a job for a URL

Single entry point; implements FR-002/FR-003/FR-004/FR-008/FR-013 lookup semantics (see data-model.md § Lookup semantics).

Request:
```json
{ "source_url": "https://www.youtube.com/watch?v=...", "duration_seconds": 247 }
```
`duration_seconds`: from the page metadata when known (YouTube); `null` allowed → worker probes via `yt-dlp -J` before download.

Responses (first match wins):
| Status | Body | Meaning |
|---|---|---|
| `200` | `{ "kind": "transcript", "transcript": { "id", "source_url", "completed_at" } }` | Stored transcript exists for the exact URL (US2-AC1); no job started |
| `200` | `{ "kind": "job", "job": { "id", "status", ... } }` | Active job exists for the exact URL (US2-AC2); show its progress |
| `201` | `{ "kind": "job", "job": { "id", "status": "queued", "source_url", "duration_seconds", "created_at", "retry_count": 0 } }` | New job created (US1-AC2) |
| `400` | `{ "error": { "code": "duration_too_long" | "invalid_url" | "not_a_video_page" } }` | Duration > 300 s (FR-003, before any download) / malformed URL / non-video URL (edge: non-video page) |
| `409` | `{ "error": { "code": "active_job_exists" } }` | Another non-terminal job already running (FR-004) |
| `401` | `{ "error": { "code": "unauthorized" } }` | Not signed in (FR-001) |

### GET /api/jobs/{id} — poll job status

Extension tab polls every ~3 s (research #8) while `status` is non-terminal.

| Status | Body |
|---|---|
| `200` | `{ "job": { "id", "source_url", "status", "error_reason", "retry_count", "created_at", "transcript_id" } }` |
| `404` | `{ "error": { "code": "not_found" } }` |

### POST /api/jobs/{id}/retry — retry a failed job (FR-006)

Only valid when `status = error`. Sets `status = queued`, `error_reason = null`, `retry_count += 1` (US1-AC4).

| Status | Body |
|---|---|
| `200` | `{ "job": { ...queued... } }` |
| `409` | `{ "error": { "code": "not_retryable" } }` (job not in error state) |
| `401` | unauthorized (FR-001: sign-in required before retry) |

### GET /api/transcripts — history list (FR-011 / US3-AC1)

| Status | Body |
|---|---|
| `200` | `{ "transcripts": [ { "id", "source_url", "status", "created_at" } ] }` — newest first; `status` is the owning job's status |

### GET /api/transcripts/{id} — view a transcript (US3-AC1)

| Status | Body |
|---|---|
| `200` | `{ "transcript": { "id", "source_url", "content", "completed_at" } }` |
| `404` | `{ "error": { "code": "not_found" } }` |

### DELETE /api/transcripts/{id} — delete forever (FR-010 / US3-AC2)

Removes the transcript row and its job row; the exact URL thereafter resolves to nothing (US3-AC3).

| Status | Body |
|---|---|
| `204` | — |
| `404` | `{ "error": { "code": "not_found" } }` |

## Error envelope

Non-2xx bodies share `{ "error": { "code": "<machine-readable>", "message": "<human-readable>" } }`. `message` is shown verbatim to the user (e.g., "This video is longer than 5 minutes", "The source is not available", "Only one transcription can run at a time").

## Status visibility mapping (UI)

| status | Tab shows |
|---|---|
| queued | "Queued — waiting to start" |
| downloading | "Downloading audio…" |
| transcribing | "Transcribing…" |
| ready | plain-text transcript (FR-007) |
| error | error message + Retry button (FR-006) |

Contract reference: data model in [../data-model.md](../data-model.md), validation scenarios in [../quickstart.md](../quickstart.md).