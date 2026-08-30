# Data Model: Video Transcription Extension

Phase 1 output of `/speckit.plan`. Entities extracted from `spec.md` (§ Key Entities, requirements FR-001..FR-014, edge cases). Storage: Supabase Postgres. All tables scoped to the single authenticated user via Supabase Auth user id + Row Level Security.

## Entities

### User

The single known user. Managed by Supabase Auth (`auth.users`); not a custom table.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | `auth.users.id`, from the Supabase JWT |
| email | text | from Supabase Auth |

Validation: identity is established at sign-in (FR-001); no app-level user rows.

### Job

A single transcription attempt (spec: "A single transcription attempt. Attributes: source URL, status, creation time, error reason, retry count.").

| Field | Type | Rules |
|---|---|---|
| id | uuid (PK) | generated |
| user_id | uuid (FK → auth.users) | NOT NULL; RLS-scoped |
| source_url | text | NOT NULL; stored **exactly** as captured from the active tab (research #6); no normalization |
| status | enum | `queued` / `downloading` / `transcribing` / `ready` / `error` (FR-005) |
| duration_seconds | int | NOT NULL; from page metadata or `yt-dlp -J` probe; `> 300` → request rejected (FR-003) |
| created_at | timestamptz | NOT NULL; creation time (history date, FR-011) |
| error_reason | text | NULL unless `status = error` (FR-013 best-effort message) |
| retry_count | int | NOT NULL default 0; incremented per retry (FR-006) |
| transcript_id | uuid (FK → transcripts) | NULL until `ready` |

Validation / constraints:
- One active job per user: partial unique index `(user_id) WHERE status NOT IN ('ready','error')` (FR-004, research #9).
- `source_url` must look like a public video URL (scheme + host); exact-match semantics forbid any further normalization.
- `duration_seconds > 300` never reaches this table — rejected at enqueue before insert.

State transitions (FR-005, FR-006, FR-012):

```text
queued ──► downloading ──► transcribing ──► ready
   ▲                          │
   │                          ▼
   └───────── retry ──────── error        (retry: error → queued, new attempt from pipeline start)
```

- `error` is terminal until the user retries; retry resets to `queued` with `retry_count += 1` and `error_reason = NULL` (US1-AC4).
- A job whose transcript is deleted while processing must not resurrect: delete of a `ready` job also removes its transcript; a `queued/downloading/transcribing` job is cancelled to `error` (`error_reason = 'deleted'`) and the eventual worker completion is ignored because the row is terminal (US3-AC3 / edge case "deletes while processing").

### Transcript

The retained output of a completed job (spec: "Attributes: source URL, plain-text content, completion time, retention until explicitly deleted.").

| Field | Type | Rules |
|---|---|---|
| id | uuid (PK) | generated |
| user_id | uuid (FK → auth.users) | NOT NULL; RLS-scoped |
| job_id | uuid (FK → jobs, UNIQUE) | NOT NULL; one transcript per job |
| source_url | text | NOT NULL; denormalized copy of `job.source_url` for reopen lookup |
| content | text | NOT NULL; plain text only (FR-007), may be empty when no speech detected (edge case: "no detectable speech") |
| completed_at | timestamptz | NOT NULL; completion time (history date) |

Validation / constraints:
- `content` plain text, no timestamps/formatting (FR-007).
- Retention: indefinite (FR-009); no TTL, no archival. Only explicit delete removes a row.
- Delete (FR-010/US3-AC2): removes the transcript row **and** its job row — after deletion the exact URL resolves to nothing, so a revisit offers a new job (US3-AC3).

## Lookup semantics (FR-008 / US2)

Single entry point `POST /api/jobs` resolves, in order:

1. Transcript with `source_url = exact URL` → return `{kind: transcript}` — no new job (US2-AC1).
2. Active job (non-terminal) with `source_url = exact URL` → return `{kind: job}` progress — no duplicate (US2-AC2).
3. Otherwise validate (duration ≤ 300 s, one-active-job rule) and create → `{kind: job}` (US2-AC3 / US1).

## Relationships

```text
User 1 ──< Job 1 ──0..1 Transcript
        owns        produces
```

- `jobs.user_id`, `transcripts.user_id` → `auth.users.id`
- `jobs.transcript_id` → `transcripts.id`; `transcripts.job_id` → `jobs.id` (bidirectional 1:1 link, both sides kept for cheap lookups)
- Deletion rules: delete transcript ⇒ delete its job; delete job (ready) ⇒ delete its transcript. No cascade-orphans: a job row is never deleted while a transcript exists (history must keep showing `ready` with date until the user deletes the item — FR-011).