# Data Model: Transcript Copy Actions

Phase 1 output of `/speckit.plan`. Entities from `spec.md` (§ Key Entities, FR-008). **This feature introduces, changes, or removes no persisted data and no API fields.** Storage: unchanged from 001/002/003 (Supabase Postgres: `jobs`, `transcripts`; Supabase Auth: `auth.users`). The feature is presentation + clipboard behavior in the existing transcript view only.

## Entities

### Transcript

**Unchanged from 001** — see [../001-video-transcription-extension/data-model.md](../001-video-transcription-extension/data-model.md). The stored plain text plus its metadata, including the originating video's URL. This feature only reads it (FR-008); the record, its fields, and every API payload are untouched. `source_url` is already returned by `GET /api/transcripts/{id}` (001 `contracts/api.md`) and may be absent (NULL) for transcripts recorded without a URL (spec edge case).

### Clipboard (device surface, not app data)

The system clipboard, which receives exactly the transcript's stored plain text on Copy (FR-002). Nothing is read from it, nothing else is ever written by this feature, and no copy is attempted outside the explicit button click.

| Attribute | Value |
|---|---|
| write | `navigator.clipboard.writeText(storedContent)` — exact stored string, character-for-character (research #2) |
| source | the raw `transcript.content` from `GET /api/transcripts/{id}` held in `job.ts` module scope — never the rendered DOM text (003 reading layout may add display line breaks) |
| persistence | none in app storage; clipboard content is OS-managed and ephemeral |

### Originating video link (presentation-only, never persisted)

A view-time element derived from the transcript's stored `source_url`, existing only in the transcript view:

| Attribute | Value |
|---|---|
| input | stored `source_url` (nullable) |
| shown | only when input is present AND `isSafeWebUrl(input)` (http/https, non-empty hostname — research #4) |
| output | `<a id="source-link" target="_blank" rel="noopener" href="<exact stored URL>">` |
| persistence | none — never stored, transmitted, or rewritten; the exact stored string is the destination |

## Relationships

```text
Transcript 1 ──(stored)── 0..1 source_url
Transcript --(view time, display only)--> Copy payload (raw content string)   [transient]
Transcript --(view time, display only)--> Source link (derived from source_url) [transient]
```

- No new tables, columns, indexes, migrations, or API fields anywhere (FR-008; SC-006).
- Both derivations are pure functions of the stored record, computed per render; neither has relationship edges.

## Rollout

None. No migration, no env var, no dashboard setting (research.md § Manual configuration). Rollout = rebuild + reload the extension unpacked; backend untouched (no redeploy needed for this feature — zero backend source change).