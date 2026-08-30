# Contract: Extension UI States

Phase 1 output of `/speckit.plan`. UI contract for the application — the pages and states the extension exposes to the user. Implements FR-002 (tab opens immediately), FR-005 (status display), FR-006 (retry), FR-011 (history), and the sign-in gate (FR-001).

## Pages

| Page | Route (extension tab) | Purpose |
|---|---|---|
| Sign-in | `signin.html` | Supabase Auth email/password form (FR-001). Opened by the action click when not signed in — job does not start until sign-in succeeds (US1-AC1, edge case: not signed in at click time) |
| Job | `job.html?job=<id>` | Live job progress; polls `GET /api/jobs/{id}` (contracts/api.md); on `ready` renders the transcript; on `error` shows message + Retry |
| History | `history.html` | List of transcripts: source URL, status, date; view opens Job page for a ready item, delete removes it (FR-011 / US3-AC1/2) |
| Non-video notice | `notice.html` | Shown when the action is clicked on a non-video page: explains a public video page is required (edge case) |

## Flows

### Action click (US1 / US2)

1. Content script detects the active tab is a public video page → captures **exact** `source_url` and, if known, `duration_seconds`.
2. Not signed in → open `signin.html`; after sign-in success, continue with step 3.
3. Signed in → `POST /api/jobs` (contracts/api.md) then open `job.html?job=<id>` — **tab opens immediately** (FR-002).
4. Response `kind: transcript` → open Job page in transcript view (no new job, US2-AC1); `kind: job` → progress view (US2-AC2); `201` → progress view; `400 duration_too_long` → clear rejection message, no download (FR-003 / US1-AC3).
5. Non-video page → `notice.html`.

### Job page states

| State | Rendered from |
|---|---|
| queued / downloading / transcribing | polled `status` (contracts/api.md status mapping) |
| ready | transcript `content` as plain text (FR-007) |
| error | `error_reason` + **Retry** button → `POST /api/jobs/{id}/retry` (FR-006, US1-AC4) |
| not signed in (expired/invalid session) | prompt to sign in again before any job starts or retries (edge case) |

Tab close is safe at any state: processing continues server-side and the page state is fully reconstructible from `GET /api/jobs/{id}` (FR-012 / US4).

### History page

- Rows: `source_url`, `status`, `created_at` (FR-011).
- Actions: View (ready items → Job page transcript view), Delete (→ `DELETE /api/transcripts/{id}`, row disappears; revisiting the URL offers a new job — US3-AC2/3).

Contract reference: HTTP details in [api.md](api.md), entities in [../data-model.md](../data-model.md).