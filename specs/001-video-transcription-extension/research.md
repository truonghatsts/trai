# Research: Video Transcription Extension

Phase 0 output of `/speckit.plan`. Resolves every technical unknown from the spec's Technical Context and implementation-dependency note. Format per decision: **Decision / Rationale / Alternatives considered**.

## 1. Stack: TypeScript end to end

- **Decision**: TypeScript on Node 20 for the backend worker/API; TypeScript for the Chrome MV3 extension.
- **Rationale**: One language across extension and backend; shared JSON shapes map directly to the contract; Chrome extension tooling (esbuild/vite) and Node 20 are both mainstream, well-documented choices. The spec marks implementation dependencies as swappable without affecting functional requirements.
- **Alternatives considered**: Python backend (native `yt-dlp` binding, richer ML ecosystem) — rejected: two languages for a single-user service; the `yt-dlp` CLI is invoked as a subprocess either way.

## 2. Persistence & identity: Supabase (Postgres + Auth)

- **Decision**: Supabase-hosted Postgres for `jobs` and `transcripts`; Supabase Auth (email + password) for the single known user, JWT bearer on the API.
- **Rationale**: FR-009 (retain forever), FR-012 (job state survives tab close), and FR-011 (history) all require server-side durable storage independent of the browser — a hosted DB with built-in auth removes the largest custom-auth burden for a one-user system. Matches the architecture direction previously explored in `.docs/eli5-2026-08-30_supabase-railway-architecture.html` (Supabase as the shared "board", worker on Railway).
- **Alternatives considered**: Custom Postgres + hand-rolled auth — rejected (auth is real work; FR-001 makes sign-in mandatory). Local SQLite in the extension — rejected (violates FR-012: state must survive the browser/tab, and the worker needs shared access). Supabase Realtime for status push — rejected for v1 (see #8).

## 3. Deployment: single Node worker service on Railway

- **Decision**: One deployable: a Fastify HTTP API plus an in-process job worker loop (polls `queued` jobs), running on Railway.
- **Rationale**: FR-004 caps concurrency at one active job per user — a dedicated queue broker or separate worker fleet is disproportionate. A single instance both serves the API and drains jobs; Railway runs it 24/7 so jobs complete after the tab closes (FR-012).
- **Alternatives considered**: Separate API + worker services with Redis queue — rejected (two deploys, a broker, for one concurrent job). Cloud Functions/one-shot workers — rejected (job lifecycle and retry state are simpler in a loop).

## 4. Video probing & download: `yt-dlp` CLI

- **Decision**: `yt-dlp` CLI inside the worker image, invoked as a subprocess. Duration probe via `yt-dlp -J <url>` (metadata only, no media download); audio download via `yt-dlp -f bestaudio -x`.
- **Rationale**: FR-003 requires rejecting >5 min **before any downloading begins** — the metadata probe satisfies this without media transfer. `yt-dlp` is the de-facto best-effort multi-source downloader (FR-013/FR-014) and is the launch-gate path for YouTube.
- **Alternatives considered**: YouTube Data API for duration — rejected (YouTube-only, quota, contradicts best-effort multi-source FR-013). `youtube-transcript`-style subtitle scraping — rejected (only covers subtitled videos, not "transcribes speech" per spec intent; FR-007 requires plain-text of spoken content).

## 5. Speech-to-text: hosted third-party STT (OpenAI Whisper API)

- **Decision**: Third-party hosted STT, OpenAI Whisper API (`audio/transcriptions`, plain text), configured via env var so the provider is swappable.
- **Rationale**: Spec explicitly permits "a third-party speech-to-text service". Hosted STT means no GPU/serving infrastructure for one user; Whisper API returns plain text directly, matching FR-007 (no timestamps, no formatting).
- **Alternatives considered**: Deepgram / AssemblyAI — both viable; swap is config-level (env `STT_PROVIDER`), no functional requirement changes. Self-hosted local Whisper — rejected (model serving, GPU or slow CPU inference, for a single user).

## 6. Exact-URL matching: no normalization

- **Decision**: The exact URL string from the active tab is the identity key for reopen (FR-008) and history. No normalization, no canonicalization, no param stripping.
- **Rationale**: Spec edge case is explicit: "the same video reached via a slightly different URL (e.g., added tracking parameters) is treated as a different URL". Normalizing would silently violate FR-008.
- **Alternatives considered**: Canonical video-ID extraction (YouTube `v=` param) — rejected: violates the stated edge case and is not generalizable to other public sources.

## 7. Transient audio lifecycle

- **Decision**: Downloaded audio lives only in the worker's temp directory; it is deleted in a `finally` block immediately after the transcription API call returns (success or failure). Nothing audio-related is ever written to Supabase Storage.
- **Rationale**: FR-010 mandates no retained intermediate audio; per-job temp files with guaranteed cleanup is the minimal compliant mechanism.
- **Alternatives considered**: Upload audio to object storage for reprocessing — rejected (explicitly against FR-010; retries re-download instead).

## 8. Job visibility: polling, not push

- **Decision**: The transcript tab polls `GET /api/jobs/{id}` every ~3 s and renders the returned status.
- **Rationale**: One user, one tab viewer; polling is trivial, stateless, and robust across tab close/reopen (the tab is a *viewer* of server state — FR-012). Statuses are coarse (5 states), so 3 s polling is imperceptible.
- **Alternatives considered**: Supabase Realtime subscription — rejected for v1 (channel/auth churn for a single viewer); noted as an upgrade path if latency ever matters.

## 9. Single-active-job enforcement

- **Decision**: The enqueue endpoint checks for any non-terminal job (`status NOT IN (ready, error)`) before inserting; a partial unique index on `(user_id) WHERE status NOT IN ('ready','error')` acts as a DB backstop.
- **Rationale**: FR-004 must hold even under double-click races; app-level check plus a DB constraint is the standard cheap guarantee. The spec's edge case allows "rejected with a clear message or queued" — rejection is chosen (simpler, no queue).
- **Alternatives considered**: Queueing the second request — rejected: more state for a one-user system; a clear rejection message satisfies the requirement.

## 10. Sign-in: Supabase Auth, email + password

- **Decision**: Supabase Auth email/password for the single known user; API requests carry the Supabase JWT; the backend validates the token per request and scopes rows to the authenticated user.
- **Rationale**: FR-001 mandates sign-in before any job starts or retries. Supabase Auth is bundled with the chosen persistence (decision #2); RLS row scoping gives the single-user data isolation for free.
- **Alternatives considered**: Magic link / OAuth — rejected (email dependency or third-party setup for one user). No auth — rejected outright (FR-001).