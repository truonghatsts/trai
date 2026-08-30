# Feature Specification: Video Transcription Extension

**Feature Branch**: `001-video-transcription-extension`

**Created**: 2026-08-30

**Status**: Draft

**Input**: User description: "A Chrome desktop browser extension for a single known user that transcribes public online videos on demand, shows the transcript in a new tab, and keeps it forever until the user deletes it. Private sources, mobile, store release, playback controls, export/search/tags, and a stated spend cap are out of scope."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Get a transcript for a public video (Priority: P1)

A single known user is watching a public video in the Chrome desktop browser. They click the extension on the active video page, sign in, and immediately get a new tab showing the transcript job's progress. When the transcript is ready, the tab shows the plain-text transcript.

**Why this priority**: This is the core value of the feature — turning any public video into readable text on demand. Everything else (history, retrieval) builds on this flow.

**Independent Test**: Can be fully tested by loading one public YouTube video under 5 minutes, clicking the extension, signing in, and confirming the new tab eventually shows a readable plain-text transcript. Delivers the primary user value end to end.

**Acceptance Scenarios**:

1. **Given** a public video page open in Chrome and the user not signed in, **When** the user clicks the extension, **Then** a new transcript tab opens immediately and prompts the user to sign in before any job starts.
2. **Given** the user is signed in, **When** the user clicks the extension on a public video page, **Then** a new transcript tab opens immediately showing the job moving through queued → downloading → transcribing, and ends in ready with a plain-text transcript.
3. **Given** a video longer than 5 minutes, **When** the user requests a transcript, **Then** the request is rejected with a clear message before any downloading begins.
4. **Given** a job that failed (e.g., network or source error), **When** the user retries it, **Then** a new attempt starts from the beginning of the pipeline and can succeed.

---

### User Story 2 - Reopen a stored transcript by revisiting the same URL (Priority: P2)

After a transcript has been completed, the user revisits the exact same video URL (e.g., from browser history) and clicks the extension. Instead of starting a new transcription, the stored transcript opens immediately.

**Why this priority**: The feature promises transcripts are kept forever; honoring that promise on repeat visits is the second-most-valuable behavior and prevents duplicate work.

**Independent Test**: Complete a transcript, then load the exact same video URL again and click the extension — the stored transcript must be shown with no new processing. Delivers the retention value.

**Acceptance Scenarios**:

1. **Given** a completed transcript exists for an exact video URL, **When** the user clicks the extension on that same URL, **Then** the stored transcript opens immediately with no new job started.
2. **Given** a transcript is currently processing for a URL, **When** the user clicks the extension on that same URL, **Then** the existing job's progress is shown rather than starting a duplicate job.
3. **Given** no transcript exists for the URL, **When** the user clicks the extension, **Then** a new transcription job is offered (normal flow).

---

### User Story 3 - Manage transcript history (Priority: P3)

The user opens the extension and sees a history of their transcripts: source URL, status, and date. They can view any completed transcript and delete any transcript.

**Why this priority**: Retention is promised, but without a way to see and remove stored items the feature is a one-way accumulation. Management is valuable but secondary to getting and reopening transcripts.

**Independent Test**: After completing at least one transcript, open the extension's history, list the item, view it, and delete it — confirming the item no longer appears. Delivers retention control.

**Acceptance Scenarios**:

1. **Given** one or more transcripts exist, **When** the user opens history, **Then** each item shows its source URL, status, and date, and any completed transcript can be viewed.
2. **Given** a transcript the user no longer wants, **When** the user deletes it, **Then** it is removed from history and the stored transcript plus its source URL are gone permanently.
3. **Given** a deletion, **When** the user revisits the deleted URL, **Then** no stored transcript is found and a new transcription job is offered.

---

### User Story 4 - Jobs keep running after the tab closes (Priority: P3)

The user starts a transcription and closes the transcript tab. Later they reopen the extension and find the job finished and the transcript available.

**Why this priority**: Transcription of a several-minute video may outlast the user's attention. This is a reliability expectation, not a primary workflow, so it is lower priority than the core flow.

**Independent Test**: Start a job, close the tab immediately, wait for the video's duration to pass, reopen the extension — the transcript must be ready. Delivers resilience.

**Acceptance Scenarios**:

1. **Given** a job in progress, **When** the user closes the transcript tab, **Then** processing continues and the job reaches a terminal state (ready or error) without user action.
2. **Given** a job completed while the tab was closed, **When** the user reopens the extension for that URL, **Then** the ready transcript is available.

---

### Edge Cases

- **Video longer than 5 minutes**: The request is rejected up front with a clear message; no download, no processing, no partial work.
- **Video with no available media source** (private, unlisted, region-locked, DRM, removed, or otherwise inaccessible): The job fails with a best-effort error explaining the source is not available; the user can retry or abandon.
- **Video with no detectable speech**: The job completes and shows a ready transcript that is empty or notes that no speech was found.
- **Network failure mid-download or mid-transcription**: The job moves to an error state with a retry option; nothing partial is presented as a transcript.
- **Sign-in session expired or invalid**: The user is prompted to sign in again before any job starts or is retried.
- **User clicks the extension on a non-video page**: The extension explains that a public video page is required and points the user to one.
- **Two transcription requests while one job is active**: Only one active job is allowed; a new request while one is running is either rejected with a clear message or queued, never silently duplicated.
- **User deletes a transcript while its job is still processing**: The job is cancelled or ignored once deleted; a deleted item must not resurrect on completion.
- **Exact URL matching**: The same video reached via a slightly different URL (e.g., added tracking parameters) is treated as a different URL — only the exact URL the user was on reopens a stored transcript.
- **Extension not yet signed in at click time**: The new tab opens immediately and asks for sign-in; the job does not start until sign-in succeeds.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST require the single known user to sign in before starting or retrying any transcription job.
- **FR-002**: When the user activates the extension on a page with a public video URL, the system MUST open a new transcript tab immediately.
- **FR-003**: System MUST reject a transcription request for any video whose duration exceeds 5 minutes, with a clear user message and before any downloading begins.
- **FR-004**: System MUST allow only one active transcription job per user at a time.
- **FR-005**: System MUST show the job's status as one of: queued, downloading, transcribing, ready, or error.
- **FR-006**: System MUST present a user-initiated retry for jobs that end in an error state.
- **FR-007**: System MUST produce a plain-text transcript only — no timestamps, no seeking, no formatting beyond readable paragraphs.
- **FR-008**: System MUST reopen the stored transcript when the user activates the extension on the exact same video URL of a completed transcript, without starting a new job.
- **FR-009**: System MUST retain each transcript and its source URL indefinitely (until the user explicitly deletes it).
- **FR-010**: System MUST delete transient downloaded audio immediately after transcription for a job completes, so no intermediate audio is kept.
- **FR-011**: System MUST provide a history view that lists transcripts with source URL, status, and date, and allows the user to view or delete any item.
- **FR-012**: System MUST continue processing an active job after the transcript tab is closed, and MUST persist job state so it can be reported when the user returns.
- **FR-013**: System MUST accept public video URLs only; for sources whose media is unavailable it MUST fail with a best-effort error message and a retry option.
- **FR-014**: System MUST provide best-effort support for public video sources where the media is available, with the launch gate being at least one public YouTube video transcribing end to end.

### Key Entities *(include if feature involves data)*

- **User**: The single known user of the system. Owns all jobs and transcripts; identity is established at sign-in.
- **Job**: A single transcription attempt. Attributes: source URL, status (queued / downloading / transcribing / ready / error), creation time, error reason, retry count. At most one job may be active per user.
- **Transcript**: The retained output of a completed job. Attributes: source URL, plain-text content, completion time, retention until explicitly deleted. Each transcript is tied to the exact source URL it was created from.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: For the launch-gate public YouTube video (5 minutes or less), the user can go from clicking the extension to a ready plain-text transcript in the new tab within 10 minutes.
- **SC-002**: 100% of completed transcripts reopen from their exact source URL on a later visit, with no new processing started.
- **SC-003**: 100% of videos longer than 5 minutes are rejected with a clear message before any download or processing begins.
- **SC-004**: 100% of jobs end in a terminal state — ready or a visible error state with a working retry — none are left indefinitely "in progress".
- **SC-005**: 100% of completed jobs have their transient downloaded audio deleted; no intermediate audio is retained.
- **SC-006**: No transcript or source URL is lost except by explicit user deletion, indefinitely after completion.
- **SC-007**: The transcript for the launch-gate video reproduces the video's spoken content as coherent, readable text (verified by the user on first launch).
- **SC-008**: The user can complete the full core flow (request → sign in → ready transcript) on first attempt without external help, verified on the launch-gate video.

## Assumptions

- **Single known user**: The system serves exactly one user; no multi-user accounts, permissions, or sharing are required.
- **Platform**: Chrome desktop browser only, installed as an unpacked extension. No store release, no mobile, no other browsers.
- **Sources**: Only public video URLs. Support is best-effort and depends on the media source being publicly available at processing time; sources may change, break, or block access, and this is accepted (no support guarantee).
- **Launch gate**: Success is defined by at least one public YouTube video transcribing end to end; broader source coverage is not guaranteed.
- **Retention**: Transcripts and their source URLs are kept forever unless the user deletes them; there is no stated spend cap or quota beyond that.
- **No add-on capabilities**: No playback controls, no export, no search, no tags, no editing of transcripts in v1.
- **Usage model**: The user may close the tab while a job runs; processing continues server-side. Reasonable network connectivity is assumed while a job is active.
- **Implementation dependencies** *(not requirements — referenced here only so the plan phase can evaluate them)*: transcription may be performed by a third-party speech-to-text service; downloading may rely on an external media-download tool; persistence may use a hosted database; hosting may be a cloud platform. Any of these may change without affecting the functional requirements above.
