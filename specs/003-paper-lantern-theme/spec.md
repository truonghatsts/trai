# Feature Specification: Paper Lantern Theme

**Feature Branch**: `003-paper-lantern-theme`

**Created**: 2026-08-30

**Status**: Draft

**Input**: User description: "Apply a cohesive, eye-catching Paper Lantern visual theme to all extension pages (sign-in, job/transcript, history, notice) and backend confirm/reset auth pages. Audience: language learners. Theme: warm editorial reading room—warm paper, indigo, lantern gold; familiar 'Video Transcript' identity with CSS-only lantern mark and 'language reading room' tagline; no image assets. Text-heavy transcript view remains a clean, high-contrast reading surface inside the editorial shell. Ship light mode only. No streaks, rewards, gamification, dark mode, product rename, backend behavior changes, or new data collection. Accessibility: usable keyboard focus, readable contrast, reduced-motion behavior, responsive/touch-friendly auth views. Transcript requirement: when viewing transcripts, present logical sentence/phrase units on separate lines to support reading. Original transcript remains unchanged in storage and during retrieval. Display splits must preserve text exactly, first honoring existing line breaks and common Unicode sentence punctuation, then cautiously breaking long spans at clause punctuation. This is a reading heuristic—not semantic/language-aware parsing—and must degrade safely for languages/punctuation where boundaries cannot be confidently inferred. Do not create timestamps, translations, vocabulary features, or change ownership/auth."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - A welcoming, coherent reading room across the extension (Priority: P1)

A language learner opens the extension for the first time. Instead of a bare utility screen, they land on a warm, coherent page: soft paper-toned surfaces, indigo accents, lantern-gold highlights, the familiar "Video Transcript" name with a small lantern mark, and a "language reading room" tagline. The same look and feel carries through sign-in, the job/transcript view, history, and the notice screen, so every step feels like one calm place to read and learn.

**Why this priority**: The visual identity is the feature's core deliverable — it is what makes the product feel intentional and pleasant for its audience. Without it there is no feature.

**Independent Test**: Open every extension page (sign-in, job/transcript, history, notice) and visually confirm a consistent paper-lantern treatment, the unchanged "Video Transcript" identity with CSS-only lantern mark, and the "language reading room" tagline. Delivers the full theme value.

**Acceptance Scenarios**:

1. **Given** the extension is installed, **When** the user opens any of the four extension pages (sign-in, job/transcript, history, notice), **Then** each page presents the Paper Lantern theme — warm paper surfaces, indigo text/accents, lantern gold highlights — with consistent styling across all pages.
2. **Given** any extension page, **When** the user looks for the product identity, **Then** the familiar name "Video Transcript" is shown with a lantern mark drawn entirely with styling (no image files) and the tagline "language reading room".
3. **Given** the theme applied, **When** the user views the transcript, **Then** the transcript area remains a clean, high-contrast reading surface (readable text on a calm background) rather than a busy or decorative one.

---

### User Story 2 - Transcripts read as sentence-by-sentence lines (Priority: P1)

A learner opens a transcript and sees the text arranged as logical sentence or phrase units — each on its own line — so the eye can follow the language comfortably. The stored transcript text is never altered: every character, space, and line break that was saved is still there, and the same text is what any other part of the system retrieves.

**Why this priority**: Line-broken text is the primary reading aid for language learners and the only functional change in this feature; the rest of the transcript pipeline must stay untouched.

**Independent Test**: Open a transcript whose stored text is a single long paragraph; the view presents its sentences/phrases on separate lines; then confirm the stored text is byte-identical to what was saved before viewing. Delivers the reading-layout value with the preservation guarantee.

**Acceptance Scenarios**:

1. **Given** a stored transcript, **When** the user views it, **Then** the text is presented with logical sentence/phrase units on separate lines instead of one unbroken block.
2. **Given** a stored transcript, **When** the user views it and then retrieves the stored text again, **Then** the stored text is exactly unchanged — no characters, spaces, or line breaks added, removed, or reordered by the viewing layout.
3. **Given** a transcript containing its own line breaks, **When** the user views it, **Then** the existing line breaks are honored first, and no break causes text to be lost or duplicated.

---

### User Story 3 - Themed auth pages on the web, usable on any screen (Priority: P2)

A learner confirms their email or resets a password from a phone or a small window. The confirmation and password-recovery pages on the backend carry the same warm Paper Lantern look as the extension, adapt to small screens and touch input, and get the job done without friction.

**Why this priority**: Auth pages are the user's first and last impression for account flows; theming them keeps the identity coherent across the web and extension, and responsive touch-friendly layouts prevent real users on phones from being stuck.

**Independent Test**: Open the email-confirmation and password-reset pages in a desktop browser and a narrow mobile-sized viewport; the pages render with the theme, remain usable with touch, and both flows complete. Delivers themed, responsive auth.

**Acceptance Scenarios**:

1. **Given** the confirmation and reset pages on the backend, **When** the user opens them in a browser, **Then** they use the same Paper Lantern theme (warm paper, indigo, lantern gold) as the extension.
2. **Given** a narrow screen (e.g., a phone in portrait), **When** the user opens either auth page, **Then** the layout reflows to fit without horizontal scrolling and all controls remain reachable and tappable.
3. **Given** either auth page, **When** the user completes the flow (confirm email or set new password), **Then** the outcome is shown clearly on the themed page, with no functional regression to the existing flow.

---

### User Story 4 - Theme stays out of the way of accessibility (Priority: P2)

A learner who uses a keyboard to navigate, relies on high contrast, or prefers reduced motion can still use every themed page comfortably. Keyboard focus is visible, text meets readable contrast on the paper-toned background, decorative motion is minimized or removed under reduced-motion preference, and no essential information is conveyed by color alone.

**Why this priority**: The audience is people practicing a language; reading comfort and usable controls are the whole point, and a theme that hurts them would be self-defeating.

**Independent Test**: Tab through every themed page, check focus visibility and text contrast, enable reduced-motion preference, and confirm no essential content depends on animation or color alone. Delivers accessible theming.

**Acceptance Scenarios**:

1. **Given** any themed page, **When** the user navigates with the keyboard, **Then** the currently focused control is clearly visible at all times.
2. **Given** any themed page, **When** text is checked against its background, **Then** body text meets a readable contrast ratio (WCAG AA level or better) on every themed surface.
3. **Given** a user with reduced-motion preference enabled, **When** they open a themed page with decorative animation, **Then** the motion is reduced or removed and no essential information is lost.
4. **Given** any themed page, **When** the user needs information conveyed by color, **Then** the same information is also available without color (labels, icons, or text).

---

### User Story 5 - The theme changes nothing else (Priority: P2)

A returning user finds the familiar product: same name, same flows, same transcript behavior. Nothing is gamified, no dark mode appears, no new data is collected, and the backend behaves exactly as before. The theme is a coat of paint — a beautiful one — over an unchanged house.

**Why this priority**: Explicitly excluded changes (streaks, rewards, gamification, dark mode, rename, backend behavior, data collection) are product decisions that protect the existing simple, single-user experience; the spec must prove they stay out.

**Independent Test**: Perform the existing flows (sign-in, transcribe, reopen stored transcript, delete from history, confirm email, reset password) and confirm every one behaves as before with only visual changes, and that no gamification, dark mode, or new data collection appears anywhere. Delivers the no-regression guarantee.

**Acceptance Scenarios**:

1. **Given** the themed release, **When** the user completes any existing flow from features 001 and 002, **Then** the flow works exactly as before — only the visual presentation changed.
2. **Given** any themed page, **When** the user looks for gamification elements, **Then** no streaks, rewards, points, badges, or other game-like features exist on any page.
3. **Given** the themed release, **When** the system operates, **Then** no dark mode is offered and no new user data is collected or transmitted beyond what the existing features already collect.
4. **Given** the themed release, **When** the backend processes a request, **Then** its behavior is unchanged: same endpoints, same rules, same storage.

---

### Edge Cases

- **Transcript with no sentence punctuation** (e.g., CJK or other languages without clear end-of-sentence markers, or a long run of text): The layout leaves the span on its own line rather than guessing; text is still fully visible and unaltered.
- **Transcript containing its own line breaks**: Existing line breaks win — the display never merges or removes them.
- **A single extremely long sentence**: The display breaks it cautiously at clause punctuation (commas, semicolons, colons) only when such punctuation is confidently present; otherwise it stays as one line.
- **Punctuation inside quotes, ellipses, or abbreviations** (e.g., "Mr. Smith said, 'Yes.'"): The heuristic avoids treating every period as a sentence end; a wrong or uncertain boundary simply means no break at that spot — never mangled text.
- **Consecutive spaces, tabs, or blank lines**: Preserved exactly in display and storage; the reading layout adds or removes no whitespace.
- **Empty or whitespace-only transcript**: Renders as an empty reading surface with no errors; nothing to split.
- **Transcript with emoji or unusual Unicode**: Passes through unchanged; splitting ignores characters it cannot safely interpret.
- **Very long transcripts**: The reading layout applies consistently to the whole text; performance stays responsive.
- **User resizes the window between extension pages**: Each page reflows within the theme; nothing breaks, no horizontal scroll on the extension's normal desktop widths.
- **Reduced-motion preference on a page with decorative lantern glow or fade**: The effect is disabled or reduced; content is complete without it.

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: All extension pages (sign-in, job/transcript, history, notice) MUST present a cohesive Paper Lantern theme using a warm paper-toned palette with indigo and lantern gold accents.
- **FR-002**: The product identity MUST remain the familiar name "Video Transcript", accompanied by a lantern mark rendered with styling only (no image files) and the tagline "language reading room".
- **FR-003**: The transcript view MUST present logical sentence/phrase units on separate lines to support reading.
- **FR-004**: The line-splitting heuristic MUST, in order: honor existing line breaks in the stored text; split at common Unicode sentence-ending punctuation; and only then cautiously split remaining long spans at clause punctuation where boundaries can be confidently inferred.
- **FR-005**: The heuristic MUST degrade safely — when no boundary can be confidently inferred (languages or punctuation without clear markers), the span MUST remain unbroken rather than be guessed at.
- **FR-006**: The reading layout MUST preserve the stored transcript exactly: no characters, spaces, or line breaks added, removed, or reordered, in storage, during retrieval, or in the displayed text.
- **FR-007**: The backend confirmation and password-recovery pages MUST use the same Paper Lantern theme and MUST remain fully functional and responsive on narrow screens with touch-friendly controls.
- **FR-008**: Themed pages MUST be keyboard-navigable with clearly visible focus, MUST meet readable text contrast (WCAG AA or better) on all themed surfaces, MUST honor reduced-motion preference for decorative motion, and MUST NOT convey essential information by color alone.
- **FR-009**: The feature MUST ship light mode only; no dark mode.
- **FR-010**: The feature MUST NOT introduce streaks, rewards, points, badges, or any gamification, and MUST NOT rename the product.
- **FR-011**: The feature MUST NOT change backend behavior — endpoints, rules, storage, and auth flows stay as defined in features 001 and 002.
- **FR-012**: The feature MUST NOT collect, store, or transmit any new user data.
- **FR-013**: The feature MUST NOT introduce timestamps, translations, vocabulary features, or change transcript ownership or auth behavior.

### Key Entities *(include if feature involves data)*

- **Transcript**: Unchanged from feature 001 — the stored plain text plus its metadata. The theme and reading layout never modify it; all display splitting is derived at view time.
- **Transcript reading view**: A display-only transformation of the stored transcript (sentence/phrase line breaks). It is computed when the user views the transcript, is never persisted, and is guaranteed to render the stored text exactly.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the four extension pages and the two backend auth pages present the Paper Lantern theme consistently (verified by a visual checklist across all six surfaces).
- **SC-002**: 100% of viewed transcripts display their text with zero character differences from the stored text — a direct comparison of stored versus displayed content (ignoring only the layout's own line breaks) yields no additions, removals, or reordering.
- **SC-003**: For transcripts with clear English-style sentence punctuation, at least 90% of the content is presented as sentence/phrase units on separate lines (measured over a sample of stored transcripts), while transcripts without confident boundaries remain unbroken rather than mis-split.
- **SC-004**: 0 regressions across the existing 001/002 flows: sign-in, transcribe, reopen stored transcript, delete from history, email confirmation, and password reset all pass their previous acceptance scenarios after theming.
- **SC-005**: 100% of themed pages pass the accessibility checks: visible keyboard focus, WCAG AA text contrast on every themed surface, reduced-motion honored, and no information conveyed by color alone.
- **SC-006**: Both backend auth pages render and complete their flows without horizontal scrolling at a narrow mobile viewport width.
- **SC-007**: 0 gamification elements, 0 dark-mode surfaces, 0 new data-collection events, and 0 backend behavior changes introduced anywhere by this feature.
- **SC-008** (qualitative): The audience of language learners perceives the result as a calm, warm, coherent "reading room" — the themed product feels intentional and pleasant, and the transcript reading surface is experienced as clean and comfortable.

## Assumptions

- **Palette direction**: "Warm paper, indigo, lantern gold" means light paper-toned backgrounds (warm off-white), indigo as the primary text/action color, and lantern gold for the lantern mark and sparse highlights. Exact shades are a design decision left to implementation within WCAG AA contrast bounds (FR-008).
- **Audience and tone**: The primary audience is language learners; the theme prioritizes calm, readable warmth over decoration, which is why the transcript surface stays high-contrast and uncluttered (US1, SC-008).
- **Platform**: The extension targets the existing Chrome desktop environment; responsive behavior is required for the backend auth pages (open in any modern browser, including phones), while extension pages simply reflow gracefully at desktop widths.
- **Identity continuity**: "Video Transcript" remains the product name everywhere; the lantern mark and tagline are additions, not replacements.
- **Heuristic scope**: Line splitting is a reading heuristic for display only — explicitly not semantic or language-aware parsing. Content without confidently inferable boundaries is left unbroken (FR-005). English-dominant transcripts are the primary case; others degrade safely.
- **No new assets**: The lantern mark and all decorative elements are achievable with styling alone; no image files are added (FR-002).
- **Dependencies**: Everything visual builds on the existing extension and backend pages from features 001 and 002; their structure and flows are reused as-is.

## Constitution Check

Constitution file (`.specify/memory/constitution.md`) is the unfilled starter template: it defines no concrete principles, constraints, or gates. No violations present. **Pass**.