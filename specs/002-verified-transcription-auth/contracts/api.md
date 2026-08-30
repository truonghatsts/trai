# Contract: Extension ↔ Backend HTTP API (delta from 001)

Phase 1 output of `/speckit.plan`. Extends [001 contracts/api.md](../../001-video-transcription-extension/contracts/api.md) — every 001 endpoint, status, and error envelope is unchanged. This file documents only the verification-gate delta (FR-003). Auth itself (Supabase) is out of band: see [auth.md](auth.md).

Auth: unchanged — `Authorization: Bearer <supabase-jwt>` on every request; missing/invalid token → `401`.

## New error: email_not_verified

Applies to the two job-mutating endpoints only — **POST /api/jobs** and **POST /api/jobs/{id}/retry**. Transcript view/history endpoints are not gated (an unverified account has no jobs by construction; the gate is narrow per research #4).

| Status | Body | Meaning |
|---|---|---|
| `403` | `{ "error": { "code": "email_not_verified", "message": "Confirm your email to start transcription." } }` | Token valid but `auth.users.email_confirmed_at` is NULL — backend refuses regardless of any client display (FR-003, US2-AC2) |

Precedence: `401` (no/invalid token) is checked first by `authGuard`; the `403` gate runs after token validation, before any job read/write. `400`/`409` semantics from 001 unchanged (the gate does not alter duration/URL/active-job checks).

### POST /api/jobs — additional response

| Status | Body | Meaning |
|---|---|---|
| `403` | `{ "error": { "code": "email_not_verified", ... } }` | Unverified account attempts to create a job (US2-AC2) |

### POST /api/jobs/{id}/retry — additional response

| Status | Body | Meaning |
|---|---|---|
| `403` | `{ "error": { "code": "email_not_verified", ... } }` | Unverified account attempts to retry a job (US2-AC2 — retry is equally gated) |

## Extension mapping

On `403 email_not_verified` the extension shows the verification-guidance state (inbox + spam instructions) with a **Resend confirmation** action (FR-004) — flow details in [auth.md](auth.md). No job row is created on either endpoint when the gate fires (the gate runs before insert/update).

Contract reference: entities in [../data-model.md](../data-model.md), auth flows in [auth.md](auth.md), validation scenarios in [../quickstart.md](../quickstart.md).