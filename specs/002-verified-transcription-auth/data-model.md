# Data Model: Verified Transcription Auth

Phase 1 output of `/speckit.plan`. Entities from `spec.md` (§ Key Entities, FR-001..FR-010, edge cases). Storage: Supabase Postgres + Supabase Auth (GoTrue). No new application tables — identity and the two transient request artifacts are managed by GoTrue (research #1).

## Entities

### Account

The user's identity, extended from the existing single-user model (spec: "email address, password (stored securely), verification status (verified / unverified)"). Managed by Supabase Auth — `auth.users`, not a custom table.

| Field | Type | Notes |
|---|---|---|
| id | uuid (PK) | `auth.users.id`, from the Supabase JWT (unchanged) |
| email | text (unique) | uniqueness enforced by GoTrue (double-creation edge case) |
| password_hash | text | stored by GoTrue (bcrypt) — never app-visible (FR-001) |
| email_confirmed_at | timestamptz \| NULL | **verification status**: NULL = unverified; set = verified (FR-002/FR-003) |

Validation / rules:
- Created from inside the extension via `signUp` (FR-001); when email confirmation is on, `signUp` returns a bare user with **no session** — the extension must not treat the user as signed in.
- Verified ⇔ `email_confirmed_at IS NOT NULL` — single source of truth read by both the backend gate (research #4) and the extension guidance state.
- Pre-002 accounts: one-time migration sets `email_confirmed_at = now()` for existing rows (rollout assumption — current user never locked out; research #7).
- No state transitions beyond unverified → verified (one-way; no re-verification).

### Verification request

The transient artifact behind a confirmation email (spec: "target account, expiry. Created on account creation, renewed on resend, consumed when the confirmation link is opened."). **Managed by GoTrue** — no table; the token hash rides the confirmation link.

| Attribute | Value |
|---|---|
| target account | the `token_hash` in the link resolves it — no email rides the link (fragment-only, see contracts/auth.md § Public pages) |
| expiry | GoTrue default, 24 h (research #8) |
| lifecycle | created on `signUp`; renewed on `resend({ type: 'signup' })` (FR-004); consumed by `verifyOtp({ type: 'email', token_hash })` on the public confirm page |

Rules:
- Expired or already-used token → `verifyOtp` errors → confirm page shows "link no longer valid, request a fresh one" + link to extension guidance (resend keeps the path open) — edge cases "confirmation link expired or already used", "user returns days later".
- Resend never invalidates a pending confirmation (US2-AC3: "the pending confirmation remains valid").
- The token_hash in the link is the only account pointer — no enumeration surface beyond the token itself (no email rides the link).

### Recovery request

The transient artifact behind a password-reset email (spec: "target account, expiry. Created on reset request, consumed when a new password is set."). **Managed by GoTrue** — no table.

| Attribute | Value |
|---|---|
| target account | resolved by the `token_hash` in the link — no email rides the link |
| expiry | GoTrue default, 1 h (research #8) |
| lifecycle | created on `resetPasswordForEmail` (FR-005); consumed by `verifyOtp({ type: 'recovery', token_hash })` → session → `updateUser({ password })` |

Rules:
- Expired or already-used token → reset page shows "link no longer valid, request a fresh reset" (US3-AC3).
- Reset requested for an unknown address → GoTrue `/recover` returns the same neutral success as for a known address; the extension shows one identical message (edge case — no address enumeration).
- After a successful reset the user signs in with the new password (US3-AC2); no job starts (FR-007).

### User, Job, Transcript

Unchanged from 001 — see [../001-video-transcription-extension/data-model.md](../001-video-transcription-extension/data-model.md). Jobs/transcripts remain tied to `auth.users.id`; the one-active-job partial unique index and RLS policies are untouched (FR-008: constraint stays in effect, no quota added).

## Relationships

```text
Account (auth.users) 1 ──< Job 1 ──0..1 Transcript        (unchanged from 001)
        │
        ├── 1 ──0..* Verification request (GoTrue, transient)
        └── 1 ──0..* Recovery request (GoTrue, transient)
```

- Verification/recovery requests are ephemeral GoTrue artifacts; they never appear in application queries.
- Job creation/retry now depends on `Account.email_confirmed_at` (gate, not a FK — see [contracts/api.md](contracts/api.md)); transcript/history reads are unaffected.

## Rollout migration

`supabase/migrations/002_existing_user_verified.sql`:

```sql
-- One-time rollout: pre-002 accounts were created without email verification;
-- treat them as verified so the current user is never locked out (spec
-- assumptions). Run exactly once at rollout via `supabase db push`.
update auth.users set email_confirmed_at = now()
where email_confirmed_at is null;
```

Rules: safe because no sign-up existed before this feature (001 was single-user); after rollout, new signups carry their own confirmation state. Idempotent in effect (re-run only re-stamps rows that are still unverified — acceptable for the one-time case; documented as rollout-only).