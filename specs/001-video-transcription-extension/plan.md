# Implementation Plan: Video Transcription Extension

**Branch**: `001-video-transcription-extension` | **Date**: 2026-08-30 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `/specs/001-video-transcription-extension/spec.md`

## Summary

A Chrome desktop extension (Manifest V3) for a single known user that transcribes public online videos on demand. Clicking the extension on a public video page opens a transcript tab immediately; sign-in (Supabase Auth) gates all job creation and retry. The tab drives a server-side job pipeline — `queued → downloading → transcribing → ready | error` — executed by a single Node/TypeScript worker service (Railway) that uses `yt-dlp` for the duration probe and audio download and a hosted third-party speech-to-text service for transcription. Plain-text transcripts and their exact source URLs persist in Supabase Postgres forever until explicitly deleted (exact-URL reopen, history, delete). Transient audio is deleted immediately after each transcription completes. Videos over 5 minutes are rejected before any download begins; at most one active job exists per user.

## Technical Context

**Language/Version**: TypeScript / Node 20 (one language across extension and backend)

**Primary Dependencies**: Chrome MV3 extension APIs, Supabase (Postgres + Auth), `yt-dlp` CLI (download/duration), third-party STT service (OpenAI Whisper API), Fastify (backend HTTP)

**Storage**: Supabase Postgres — `jobs` and `transcripts` tables; Supabase Auth for the single user. No object storage: transcripts are text rows, audio is transient on the worker only.

**Testing**: vitest (unit), curl-based contract checks, quickstart manual validation scenarios

**Target Platform**: Chrome desktop browser (extension, unpacked), Node worker service on Railway (backend)

**Project Type**: Chrome extension + web-service backend (single deployable service with API + worker loop)

**Performance Goals**: Launch-gate video (≤5 min) reaches ready transcript within 10 minutes (SC-001); tab shows live status while the job moves through the pipeline (SC-008)

**Constraints**: reject >5 min before any download (FR-003); one active job per user (FR-004); exact-URL matching — no normalization, tracking params make a different URL (FR-008); transient audio deleted after every completed job (FR-010); job survives tab close (FR-012); best-effort public-source support, launch gate = one public YouTube video end to end (FR-014)

**Scale/Scope**: one user, one worker instance, one region; no multi-user, no store release, no mobile

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution file (`.specify/memory/constitution.md`) is the unfilled starter template: it defines no concrete principles, constraints, or gates. No gate violations are possible or present. **Pass** (pre-research and post-design re-check: unchanged).

## Project Structure

### Documentation (this feature)

```text
specs/001-video-transcription-extension/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
│   ├── api.md           # Extension ↔ backend HTTP contract
│   └── ui.md            # Extension tab pages / UI states contract
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
extension/                          # Chrome MV3, installed unpacked
├── manifest.json
├── src/
│   ├── background/                 # action click, tab creation, API client
│   ├── content/                    # video-page detection: exact URL + duration
│   └── pages/                      # signin.html, job.html, transcript.html, history.html
└── tests/

backend/                            # single Node service: API + worker loop
├── src/
│   ├── api/                        # Fastify routes (contracts/api.md)
│   ├── jobs/                       # pipeline: probe → download → transcribe → finalize
│   ├── db/                         # Supabase client, schema, migrations
│   └── config.ts                   # env: SUPABASE_URL/KEY, STT key, yt-dlp path
└── tests/

supabase/                           # SQL migrations for jobs + transcripts
```

**Structure Decision**: Two top-level projects — `extension/` (installable Chrome artifact) and `backend/` (the only deployable service, housing both the HTTP API and the in-process job worker loop; one active job per user makes a separate queue/worker fleet unnecessary). The interface between them is the HTTP contract in `contracts/api.md`; no shared code package is needed — the contract documents are the shared surface. Supabase holds the schema migrations alongside the service that owns them.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

None — constitution defines no gates and no violations were identified.