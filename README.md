# Video Transcription Extension

A Chrome desktop extension (Manifest V3) for a single known user that transcribes public online videos on demand. Clicking the extension on a public video page opens a transcript tab immediately; sign-in (Supabase Auth) gates all job creation and retry. A server-side job pipeline (`queued → downloading → transcribing → ready | error`) runs on a single Node/TypeScript service (Railway), using `yt-dlp` for duration probe + audio download and a hosted speech-to-text service (OpenAI Whisper API) for transcription. Plain-text transcripts persist in Supabase Postgres until explicitly deleted.

Feature docs (spec, plan, research, data model, contracts, quickstart): [`specs/001-video-transcription-extension/`](specs/001-video-transcription-extension/)

## Scope

- Public video URLs only; best-effort source support, launch gate = one public YouTube video end to end
- Videos over 5 minutes rejected before any download
- One active job per user
- Exact-URL matching — no normalization; tracking params make a different URL
- Transient audio deleted immediately after transcription (never stored)
- Out of scope: store release, private sources, mobile, playback controls, export/search/tags

## Repository layout

```text
extension/   Chrome MV3 extension (unpacked) — background, content script, tab pages
backend/     Node 20 + TypeScript + Fastify service: HTTP API + in-process job worker
supabase/    SQL migrations for the jobs + transcripts tables
```

## Setup

### 1. Supabase

1. Create a Supabase project (or `supabase start` for local), enable Email auth, and create one user.
2. Apply the migration — with the Supabase CLI linked: `npm run migrate` from `backend/` (runs `supabase db push`), or paste [`supabase/migrations/001_init.sql`](supabase/migrations/001_init.sql) into the dashboard SQL editor.

### 2. Backend

```bash
cd backend
cp .env.example .env   # fill SUPABASE_URL, SUPABASE_SERVICE_KEY, OPENAI_API_KEY, YTDLP_PATH
npm install
npm run migrate        # supabase CLI: push supabase/migrations to the linked project
npm run dev
```

Env vars:

| Var | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | service-role key — backend only, never in the extension |
| `STT_PROVIDER` | `openai` (default) — provider swappable via this var |
| `OPENAI_API_KEY` | Whisper API key |
| `YTDLP_PATH` | `yt-dlp` binary (default `yt-dlp`, must be on PATH in the worker image) |
| `PORT` | HTTP port (default 3000) |

`yt-dlp` must be installed in the worker environment (e.g. `apt-get install yt-dlp` on Railway).

### 3. Extension

```bash
cd extension
cp .env.example .env   # fill SUPABASE_URL, SUPABASE_ANON_KEY, BACKEND_URL
npm install
npm run build          # emits extension/dist
```

Chrome → `chrome://extensions` → Developer mode → Load unpacked → `extension/dist`. Sign in with the Supabase Auth user.

## Validation

Manual validation scenarios S1–S8 (core flow, over-5-min rejection, retry, exact-URL reopen, single active job, tab-close survival, history/delete, edge cases) are defined in [`specs/001-video-transcription-extension/quickstart.md`](specs/001-video-transcription-extension/quickstart.md).

Automated checks:

```bash
cd backend && npm run typecheck && npm test && npm run lint
cd extension && npm run typecheck && npm test && npm run lint
```

## Deployment (Railway)

Single service from `backend/`:

- Build: `npm install && npm run build`
- Start: `npm run start`
- Env: `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `STT_PROVIDER`, `OPENAI_API_KEY`, `YTDLP_PATH`
- Image must include `yt-dlp` (Nixpacks apt packages or Dockerfile)

After deploy, point the extension's `BACKEND_URL` at the Railway service URL and rebuild the extension.

`BACKEND_URL` must match a `host_permissions` pattern in [`extension/manifest.json`](extension/manifest.json) — background/tab fetches to any other host are CORS-blocked. Manifest grants the local dev URL (`http://localhost:3000/*`) and Railway's default domain (`https://*.up.railway.app/*`). A custom backend domain must be added to `host_permissions` there before the extension will reach it.