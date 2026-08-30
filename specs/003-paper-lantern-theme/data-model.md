# Data Model: Paper Lantern Theme

Phase 1 output of `/speckit.plan`. Entities from `spec.md` (§ Key Entities, FR-006/FR-011/FR-012). **This feature introduces, changes, or removes no persisted data.** Storage: unchanged from 001/002 (Supabase Postgres: `jobs`, `transcripts`; Supabase Auth: `auth.users`). The theme is presentation-only; the reading layout is a view-time derivation with a preservation invariant.

## Entities

### Transcript

**Unchanged from 001** — see [../001-video-transcription-extension/data-model.md](../001-video-transcription-extension/data-model.md). The stored plain text plus its metadata; the Paper Lantern theme and the reading layout never modify it in storage, during retrieval, or in any API payload (FR-006). No new fields; the API shape in `contracts/api.md` (001) is untouched (FR-011).

### Account

**Unchanged from 002** — see [../002-verified-transcription-auth/data-model.md](../002-verified-transcription-auth/data-model.md). `auth.users.email_confirmed_at` remains the verification flag; no auth behavior changes (FR-011/FR-013).

### Transcript reading view (view-time derivation, never persisted)

The display-only transformation that presents stored text as sentence/phrase units on separate lines (FR-003). Computed in the extension's job page when the user views a transcript; **never written anywhere**.

| Attribute | Value |
|---|---|
| input | stored `transcript.content` (exactly as retrieved from `GET /api/transcripts/{id}`) |
| output | the same text with `\n` characters inserted at confident sentence/clause boundaries (research #4) |
| persistence | none — not stored, not transmitted, not cached outside the page render |
| invariant | `output.split('\n').join('') === input` — the transformation adds line breaks only; it deletes, duplicates, or reorders no character (FR-006; unit-tested, see plan.md Test Strategy) |

Rules:
- Existing line breaks in the input are honored first and never merged or removed (FR-004; spec edge case).
- No confident boundary → the span stays unbroken (FR-005; CJK-without-punctuation and unusual scripts degrade safely).
- The derivation is deterministic and locale-free (research #4) — same input always yields the same display.

### Theme (presentation layer, non-data)

The Paper Lantern visual system (palette, typography, lantern mark, spacing) lives entirely in `shared/theme.css` and page markup. It is **not data**: no settings, no persistence, no user preference, no collection. Light mode only — there is no theme toggle and no stored preference (FR-009; FR-012: nothing new collected or transmitted).

## Relationships

```text
Account (auth.users) 1 ──< Job 1 ──0..1 Transcript        (unchanged from 001/002)
Transcript --(view time, display only)--> Transcript reading view   (derived, transient, never stored)
```

- No new tables, columns, indexes, migrations, or API fields anywhere in this feature (FR-011/FR-012/FR-013; SC-007).
- The reading view has no relationship edges — it is a pure function of the stored text, computed per render.

## Rollout

None. No migration, no dashboard setting, no env var (research.md § Manual configuration). Rollout = deploy the themed build (extension re-load unpacked; backend rebuild + redeploy serves the new static pages under the existing routes).