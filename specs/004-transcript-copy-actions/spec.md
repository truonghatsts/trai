# Feature Specification: Transcript Copy Actions

**Feature Branch**: `004-transcript-copy-actions`

**Created**: 2026-08-30

**Status**: Draft

**Input**: User description: "On the transcription view, add bottom-of-transcript actions: a button to copy the transcript text to the clipboard and a link to the originating video."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Copy the transcript text in one click (Priority: P1)

A learner finishes reading a transcript and wants the text in their own notes or a study app. At the bottom of the transcript view they find a Copy button; one click puts the exact transcript text on their clipboard, and a brief, clearly visible confirmation tells them it worked. If the browser refuses the copy, they see a clear failure message instead of silence.

**Why this priority**: Copying the text is the primary requested action and the main value of this feature — everything else is secondary to it.

**Independent Test**: Open any stored transcript, click the Copy button at the bottom of the view, paste into any plain-text field, and compare the pasted content character-for-character with the transcript. Delivers the copy value end to end.

**Acceptance Scenarios**:

1. **Given** a transcript displayed in the transcript view, **When** the user clicks the Copy button at the bottom of the view, **Then** the exact plain transcript text (and nothing else — no URL, title, timestamps, or formatting) is placed on the clipboard.
2. **Given** a successful copy, **When** the user looks at the button area, **Then** a temporary, clearly visible confirmation appears and then clears on its own.
3. **Given** a failed copy (e.g., the browser denies clipboard access), **When** the user clicks Copy, **Then** a temporary, clearly visible failure message appears — the failure is never silent.
4. **Given** a transcript view, **When** the user navigates with a keyboard, **Then** the Copy button is reachable, its focus is visible, and the success/failure outcome is announced to assistive technology, not conveyed by color alone.

---

### User Story 2 - Jump back to the originating video (Priority: P1)

A learner wants to rewatch the part of a video that a transcript passage came from. At the bottom of the transcript view a link to the originating video opens that exact stored video URL in a new browser tab, leaving the transcript page untouched. When the stored transcript has no source URL, no link is offered at all.

**Why this priority**: Reconnecting the transcript to its source video is the second half of the requested feature and directly serves the language-learning loop of read-then-listen.

**Independent Test**: Open a transcript that has a stored source URL, click the link at the bottom of the view, and confirm the exact stored URL opens in a new browser tab while the transcript view stays open. Delivers the source-link value.

**Acceptance Scenarios**:

1. **Given** a transcript whose stored record includes the originating video's URL, **When** the user looks at the bottom of the transcript view, **Then** a clearly labeled link to the originating video is shown.
2. **Given** that link, **When** the user clicks it, **Then** the exact stored URL opens in a new browser tab and the transcript view remains open and unchanged.
3. **Given** a transcript whose stored record has no source URL, **When** the user looks at the bottom of the transcript view, **Then** no source link is shown and the Copy button still works normally.

---

### Edge Cases

- **Transcript with no stored source URL**: The source link is hidden entirely; copying is unaffected.
- **Stored source URL that is not a valid web link** (e.g., malformed or a non-web scheme): The link is not offered (opening it could be unsafe); copying is unaffected.
- **Clipboard denied by the browser** (permissions, focus restrictions): The user gets visible failure feedback; the transcript is never silently lost.
- **Empty or whitespace-only transcript**: Copy still works (copies the empty text) with normal success feedback; no error, no crash.
- **Very long transcript**: Copy places the complete text on the clipboard, and feedback behaves the same as for short transcripts.
- **Transcript text containing HTML-like or special characters**: Copied verbatim as plain text — nothing is interpreted, formatted, or stripped.
- **Repeated clicks on Copy**: Each click performs a fresh copy with fresh feedback; rapid clicking never breaks the view or duplicates content.
- **User switches tabs/windows while success feedback is showing**: Feedback clears on its own; no stale or misleading state remains.
- **Keyboard-only use**: Both the Copy button and the source link are reachable and operable by keyboard (link via Enter), with visible focus.
- **Transcript re-opened from history after the feature ships**: The actions appear identically for transcripts opened from any entry point (after transcription completes, or later from history).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The transcript view MUST display a Copy action at the bottom of the transcript, next to the source-video link (FR-004).
- **FR-002**: Activating Copy MUST place the exact plain transcript text on the clipboard — the stored text character-for-character, with no URL, title, timestamps, headers, or formatting added.
- **FR-003**: Every Copy attempt MUST produce a temporary, clearly visible outcome — a success confirmation on success, a failure message on failure — and the outcome MUST be announced to assistive technology rather than conveyed by color alone.
- **FR-004**: When the transcript's stored record includes the originating video's URL, the transcript view MUST show a clearly labeled link to that video; when activated, the link MUST open the exact stored URL in a new browser tab, leaving the transcript view open and unchanged.
- **FR-005**: The source link MUST NOT be shown when the transcript has no stored source URL, and MUST NOT be offered when the stored URL is not a valid web link (unsafe to open).
- **FR-006**: Copy MUST work independently of the source link — copying succeeds whether or not a source URL exists.
- **FR-007**: The Copy button and the source link MUST be keyboard-reachable with clearly visible focus and operable by keyboard alone.
- **FR-008**: The feature MUST NOT change the transcript text, its storage, the backend's behavior, or any existing flow from features 001–003; it adds presentation and clipboard behavior to the existing transcript view only.

### Key Entities *(include if feature involves data)*

- **Transcript**: Unchanged from feature 001 — the stored plain text plus its metadata, including the originating video's URL (`source_url`) when one was recorded. This feature only reads it.
- **Clipboard**: The device clipboard, which receives exactly the transcript's plain text on Copy (FR-002).
- **Originating video link**: A presentation-only element derived from the transcript's stored source URL; it exists only in the transcript view and is never stored or transmitted anew.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of displayed transcripts with content show the Copy button at the bottom of the transcript view.
- **SC-002**: 100% of Copy attempts place clipboard content identical character-for-character to the stored transcript text (verified by pasting and comparing); 0 attempts add extraneous content (URL, title, timestamps).
- **SC-003**: 100% of Copy attempts produce visible feedback — success on success, failure on failure — and feedback clears on its own without user action.
- **SC-004**: 100% of transcripts with a stored source URL display the source link, and activating it opens the exact stored URL in a new tab in 100% of attempts.
- **SC-005**: 0 transcripts without a stored source URL display the source link; 0 transcripts with an invalid stored URL offer it.
- **SC-006**: 0 regressions in the existing flows — sign-in, transcribe, view transcript from history, delete from history (existing regression cases for features 001–003 still pass unchanged).
- **SC-007**: 100% of the new controls pass keyboard accessibility checks: reachable via Tab, visible focus, operable via Enter/Space, outcome announced to assistive technology.

## Assumptions

- **Copy payload**: Copy places the plain transcript text only — not the video URL, not a title, and no formatting. (Default chosen where the user did not specify the payload.)
- **Source link behavior**: The link opens the exact stored source URL in a new browser tab; the extension view never navigates away or closes. (Default chosen where the user did not specify open behavior.)
- **Feedback**: Success and failure feedback is temporary and accessible — announced to assistive technology and not color-only. A refused copy is reported rather than silently ignored. (Default chosen where the user did not specify failure handling.)
- **Missing source URL**: When no source URL is stored, the link is hidden entirely rather than shown disabled or broken. (Default chosen where the user did not specify this state.)
- **Scope**: Only the transcript view gains these actions. The history page, backend, storage, and all existing behaviors are unchanged; no share, download, export, or transcript-edit features are added.
- **Platform**: Existing Chrome desktop extension context; transcripts are opened both immediately after transcription and later from history.
- **Dependency**: Requires the existing transcript record's stored source URL (already present from feature 001) to be available with the transcript when viewed.

## Constitution Check

Constitution file (`.specify/memory/constitution.md`) is the unfilled starter template: it defines no concrete principles, constraints, or gates. No violations present. **Pass**.