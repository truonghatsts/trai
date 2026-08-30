# Feature Specification: Verified Transcription Auth

**Feature Branch**: `002-verified-transcription-auth`

**Created**: 2026-08-30

**Status**: Draft

**Input**: User description: "Only verified-email users may transcribe; verification enforced in both the extension experience and the backend. Email/password account creation happens inside the extension. Unverified users get guidance and a resend-confirmation action. Confirmation and password recovery happen on stable public HTTPS pages on the existing backend domain. One expired session is silently refreshed, then the user is prompted to sign in. Password reset is available. Transcription never starts automatically: the user always gives an explicit final Transcribe click after authenticating. One active job per user remains sufficient — no daily quota, no OAuth, no CAPTCHA, no account deletion. Automated auth coverage in backend and extension, plus a manual real-email confirmation/reset smoke test. Existing 001 spec describes the current extension/backend."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Create an account and verify the email inside the extension (Priority: P1)

The user clicks the extension on a public video page while not signed in. From the extension's sign-in screen they choose to create an account with an email address and password. The extension sends a confirmation email; the user opens the confirmation link on a public confirmation page and becomes verified, after which transcription is available.

**Why this priority**: Without account creation and email verification nothing else in this feature works — verification is the gate that unlocks transcription for new users.

**Independent Test**: From a fresh browser profile, click the extension, create an account with a real email address, open the confirmation email, confirm, and reach the point where the transcript tab offers a transcription. Delivers the entire account-creation value end to end.

**Acceptance Scenarios**:

1. **Given** the user is not signed in and is on a public video page, **When** they open the extension and choose to create an account with a valid email address and password, **Then** the account is created and a confirmation email is sent to that address.
2. **Given** a newly created, unverified account, **When** the user opens the confirmation link from the email on the public confirmation page, **Then** the account becomes verified and the user is able to start a transcription.
3. **Given** a verified account, **When** the user creates or retries a transcription job, **Then** the job proceeds through the existing pipeline without further verification steps.

---

### User Story 2 - Verified users only: email verification gates transcription (Priority: P1)

An unverified user tries to transcribe and is blocked with clear guidance, plus a way to resend the confirmation email. The gate holds even if the extension is bypassed — the backend refuses unverified accounts outright.

**Why this priority**: Verification is a hard precondition for paid work; it must hold in both the user-facing flow and the backend, so this story is equally critical as account creation.

**Independent Test**: Create an account without confirming the email, then attempt to start a transcription from the extension and, separately, attempt the same via a direct backend request. Both must refuse until the email is confirmed. Delivers the enforcement value.

**Acceptance Scenarios**:

1. **Given** an unverified account, **When** the user attempts to start or retry a transcription from the extension, **Then** the request is refused and the extension shows clear guidance (check the inbox and spam) with a resend-confirmation action.
2. **Given** an unverified account, **When** a transcription request for that account reaches the backend by any path, **Then** the backend refuses the job regardless of what the extension displayed.
3. **Given** an unverified account, **When** the user chooses the resend action, **Then** a fresh confirmation email is sent and the pending confirmation remains valid.

---

### User Story 3 - Recover a forgotten password (Priority: P2)

The user cannot remember their password. From the sign-in screen they request a reset; a reset link is emailed, and opening it shows a public password-recovery page on the backend's domain where they set a new password and then sign in.

**Why this priority**: A credential the user can recover from is required for the account to be trustworthy long-term; without it a forgotten password locks the user out of their transcripts permanently.

**Independent Test**: With an existing account, request a password reset, open the emailed link, set a new password, and sign in with it. Delivers recovery end to end.

**Acceptance Scenarios**:

1. **Given** the user has forgotten the password, **When** they request a reset from the sign-in screen, **Then** a reset email with a link to the public password-recovery page is sent.
2. **Given** the reset link from the email, **When** the user opens it and sets a new password, **Then** the new password takes effect and the user can sign in with it.
3. **Given** an expired or already-used reset link, **When** the user opens it, **Then** they are told the link is no longer valid and can request a fresh one.

---

### User Story 4 - Expired sessions: one silent refresh, then sign in (Priority: P2)

The user returns to the extension after their session expired. The system silently restores the session once; if that fails, the user is prompted to sign in again — never silently blocked.

**Why this priority**: Transcription work can span time (jobs run server-side, tabs close), so returning users routinely hit expired sessions. A single automatic refresh preserves the flow; prompting on failure avoids a confusing dead end.

**Independent Test**: Start a transcription, let the session expire, then return to the extension. Either the user is silently signed back in and sees their job, or they are clearly prompted to sign in. Delivers the refresh behavior.

**Acceptance Scenarios**:

1. **Given** an expired session, **When** the user returns to the extension, **Then** the system silently attempts exactly one session refresh.
2. **Given** a failed session refresh, **When** the refresh attempt fails, **Then** the user is prompted to sign in again rather than left with a broken or silently empty state.
3. **Given** a failed refresh followed by sign-in, **When** the user signs in again, **Then** no transcription job starts automatically (see User Story 5).

---

### User Story 5 - Explicit final Transcribe click after authenticating (Priority: P3)

After any authentication step — sign-in, email verification, or password recovery — the user lands back in the flow but transcription never starts on its own. The user always gives an explicit final confirmation that paid work may begin.

**Why this priority**: Starting paid transcription without an explicit user action is unacceptable; this guard is cheap but prevents surprise cost and is a stated product decision.

**Independent Test**: Complete each auth step (sign-in, verification, recovery) and confirm that in every case a further explicit action is required before any job starts. Delivers the no-auto-start guarantee.

**Acceptance Scenarios**:

1. **Given** the user has just signed in, **When** the transcript tab returns to the job view, **Then** the user must click the final Transcribe action before any job is created.
2. **Given** the user has just confirmed their email, **When** the flow continues, **Then** the same explicit final Transcribe click is required; no job starts automatically.
3. **Given** the user has just completed a password recovery, **When** they are signed in, **Then** no job starts until the user explicitly confirms transcription.

---

### User Story 6 - Prove the auth flows before release (Priority: P3)

The maintainer releases only after the authentication paths are covered by automated tests in both the backend and the extension, and after a manual smoke test with a real email address confirms account creation → confirmation → transcription and password reset work end to end.

**Why this priority**: Authentication gates paid work, so regressions here are expensive and embarrassing; the launch gate explicitly includes auth verification.

**Independent Test**: Run the automated auth suites for backend and extension, then perform the manual real-email smoke test (confirm an account, reset a password) against the deployed environment. All must pass before release.

**Acceptance Scenarios**:

1. **Given** the auth feature is implemented, **When** the automated auth tests for the backend run, **Then** they cover account creation, verification enforcement, recovery, and session refresh.
2. **Given** the auth feature is implemented, **When** the automated auth tests for the extension run, **Then** they cover the same flows from the extension's perspective.
3. **Given** a release candidate, **When** a maintainer performs the manual smoke test using a real email address, **Then** account confirmation and password recovery both succeed, and this gate passes before release.

---

### Edge Cases

- **Email already registered**: The extension shows a clear message and offers sign-in instead of a confusing duplicate-account error.
- **Invalid email format or weak password**: Inline validation explains what is wrong before any account is created.
- **Confirmation email lost or never arrives** (typo, spam filter, delivery failure): The user can resend the confirmation; guidance covers checking spam.
- **Confirmation link expired or already used**: The user is told the link is no longer valid and can request a fresh confirmation.
- **Reset link expired or already used**: The user is told the link is no longer valid and can request a fresh reset.
- **Password reset requested for an unknown address**: The user receives the same neutral response as for a known address, so the system does not reveal which addresses have accounts.
- **Confirmation opened on a different device or browser**: The confirmation page works on any modern browser over HTTPS; the user returns to the extension and is verified there.
- **User returns days later without confirming**: The account stays unverified with the same guidance; resend keeps the path open.
- **Network failure during creation, resend, or reset**: A clear error message is shown and the user can retry; no partial account state is presented as success.
- **Session refresh fails mid-view of an in-progress job**: The user is prompted to sign in; the job view they were looking at is preserved and resumes after sign-in.
- **Two account-creation attempts for the same email at once**: Only one account is created; the second attempt fails with a clear message.
- **Existing account from the single-user era**: Treated as verified when this feature ships, so the current user is not locked out (see Assumptions).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a user to create an account from inside the extension using an email address and a password.
- **FR-002**: System MUST send a confirmation email containing a link to a stable public HTTPS page on the existing backend domain; opening the link MUST mark the account's email as verified.
- **FR-003**: System MUST allow only verified-email accounts to start or retry transcription jobs; the verification gate MUST be enforced both in the extension experience and in the backend independently of any client behavior.
- **FR-004**: For an unverified account, the extension MUST show clear guidance for completing verification and MUST offer a resend-confirmation action; resending MUST deliver a fresh confirmation email.
- **FR-005**: System MUST provide a password-recovery flow: request a reset from the sign-in screen, email a link to a stable public HTTPS page on the existing backend domain, allow setting a new password, and then allow signing in with it.
- **FR-006**: When the user returns with an expired session, the system MUST attempt exactly one silent session refresh; if the refresh fails, the user MUST be prompted to sign in again rather than silently blocked.
- **FR-007**: System MUST never start a transcription job automatically after any authentication step; the user MUST explicitly confirm the transcription action each time.
- **FR-008**: The one-active-job-per-user constraint from the existing feature MUST remain in effect, and the system MUST NOT introduce a daily transcription quota.
- **FR-009**: System MUST NOT introduce OAuth sign-in, CAPTCHA, or account-deletion capabilities in this feature.
- **FR-010**: The project MUST include automated test coverage for account creation, verification enforcement, password recovery, and session refresh in both the backend and the extension, and the release process MUST include a manual smoke test with a real email address covering confirmation and password recovery.

### Key Entities *(include if feature involves data)*

- **Account**: The user's identity, extended from the existing single-user model. Attributes: email address, password (stored securely), verification status (verified / unverified). The existing user's account is treated as verified on rollout.
- **Verification request**: The transient artifact behind a confirmation email. Attributes: target account, expiry. Created on account creation, renewed on resend, consumed when the confirmation link is opened.
- **Recovery request**: The transient artifact behind a password-reset email. Attributes: target account, expiry. Created on reset request, consumed when a new password is set.
- **User, Job, Transcript**: Unchanged from the existing feature (001); jobs and transcripts remain tied to the account.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A new user can create an account, confirm the email via the public confirmation page, and complete a first transcription entirely from the extension, without external support.
- **SC-002**: 100% of transcription attempts by unverified accounts are refused in both the extension and the backend; no unverified account can create or retry a job through any path.
- **SC-003**: 100% of completed password recoveries end with the user signing in successfully using the new password.
- **SC-004**: In 100% of expired-session returns, the user is either silently signed back in after one refresh or clearly prompted to sign in; no return leaves the user silently dead-ended.
- **SC-005**: 0 transcription jobs start without an explicit final Transcribe click by the user.
- **SC-006**: The automated auth test suites for the backend and the extension pass, and the manual real-email smoke test (confirmation + password reset) passes, before release.

## Assumptions

- **Existing account migration**: Any account created under the previous single-user sign-in is treated as verified when this feature ships, so the current user is never locked out.
- **Public auth pages**: Confirmation and password-recovery pages are stable public HTTPS pages on the existing backend domain; they render in any modern browser (desktop or mobile) with no app installation required.
- **Email delivery**: A standard email service is used; delivery is assumed reliable enough for a single user, and the resend action covers missed or mistyped emails.
- **Link expiry**: Verification and recovery links expire after a reasonable window, following standard practice.
- **Scope boundaries**: No OAuth, no CAPTCHA, no account deletion, no daily quota — per explicit product decisions. The single-user model and one-active-job constraint remain.
- **Existing behavior unchanged**: All transcription requirements from the existing feature (001) continue to hold; this feature only adds authentication capabilities and the verification gate.

## Constitution Check

Constitution file (`.specify/memory/constitution.md`) is the unfilled starter template: it defines no concrete principles, constraints, or gates. No violations present. **Pass**.