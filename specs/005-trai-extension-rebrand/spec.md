# Feature Specification: TRAI Extension Rebrand

**Feature Branch**: `005-trai-extension-rebrand`

**Created**: 2026-08-31

**Status**: Draft

**Input**: User description: "Rename the extension/app visible brand from Video Transcript to TRAI. Replace the live tagline 'language reading room' with 'Transcribe with AI' in the extension and auth pages. Show a compact lantern-only extension icon, consistent with the existing palette, visible in the Chrome toolbar and management page. Keep identifiers, data, auth, and behavior unchanged. Update the canonical regression checklist (.docs/testcases.md) to check the title/name plus icon and regenerated build assets. Update the feature quickstart as the constitution requires. Historical specifications (001–004) remain untouched."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - The product is named TRAI everywhere the user sees it (Priority: P1)

A returning user opens Chrome and sees the extension in the toolbar, in the extensions management page, and in every extension screen (sign-in, job/transcript, history, notice). Where they used to read "Video Transcript", they now read "TRAI" — in the extension's own entry in Chrome, in each page's header, and in each page's title. The same new name appears on the web auth pages (email confirmation and password reset). Nothing about the name is left behind on any user-visible surface.

**Why this priority**: The visible name is the core of the rebrand — it is the single most noticed identifier. Without it there is no feature.

**Independent Test**: Open the extensions management page and every extension page plus both auth pages; confirm every surface shows "TRAI" and none shows "Video Transcript". Delivers the full rename value.

**Acceptance Scenarios**:

1. **Given** the rebranded extension installed, **When** the user opens the extensions management page, **Then** the extension's entry shows the name "TRAI" (not "Video Transcript").
2. **Given** the rebranded extension installed, **When** the user opens any of the four extension pages (sign-in, job/transcript, history, notice), **Then** the page header and the page title show "TRAI".
3. **Given** the rebranded backend, **When** the user opens the email-confirmation or password-reset page, **Then** the page header and title show "TRAI".
4. **Given** the rebranded extension, **When** the user hovers the toolbar icon, **Then** the tooltip shows "TRAI".

---

### User Story 2 - The tagline says "Transcribe with AI" (Priority: P1)

A returning user reads the short line under the product name on the extension pages and the auth pages. Where they used to read "language reading room", they now read "Transcribe with AI" — exactly, everywhere the tagline appears today, with no leftover copy.

**Why this priority**: The tagline is the product's one-line promise to the user; replacing it is half of the visible rebrand.

**Independent Test**: Open the four extension pages and both auth pages; confirm each shows "Transcribe with AI" and none shows "language reading room". Delivers the full tagline change.

**Acceptance Scenarios**:

1. **Given** any of the four extension pages, **When** the user reads the line under the product name, **Then** it reads "Transcribe with AI".
2. **Given** either auth page (email confirmation or password reset), **When** the user reads the line under the product name, **Then** it reads "Transcribe with AI".
3. **Given** any of the six pages, **When** the user searches the visible content for the old tagline, **Then** "language reading room" appears nowhere.

---

### User Story 3 - A compact lantern icon identifies the extension (Priority: P1)

A user scanning a crowded toolbar or the extensions management page recognizes the extension instantly by a small lantern glyph — the same lantern from the Paper Lantern theme, rendered as a compact standalone icon — instead of the generic placeholder that appears today. The icon stays sharp on high-density displays and in the management page's large views.

**Why this priority**: Without a real icon the extension still looks unfinished in the toolbar and management page; the icon is the third pillar of the rebrand.

**Independent Test**: Open the toolbar and the extensions management page on a standard and a high-density display; confirm the lantern icon (not a generic placeholder) appears and is sharp at every size Chrome shows. Delivers the full icon value.

**Acceptance Scenarios**:

1. **Given** the rebranded extension installed, **When** the user looks at the Chrome toolbar, **Then** a compact lantern-only icon (not the generic placeholder) identifies the extension, in the established lantern-gold/indigo palette of the Paper Lantern theme.
2. **Given** the rebranded extension installed, **When** the user opens the extensions management page, **Then** the extension's entry shows the same lantern icon, sharp in both its standard and its large view.
3. **Given** a high-density (2x) display, **When** the user inspects the toolbar icon, **Then** it renders sharp, not blurry or pixelated.
4. **Given** the shipped build output, **When** the icon assets are inspected, **Then** the set covers the sizes Chrome displays: 16 px (toolbar and tooltip), 32 px (high-density toolbar), 48 px (management page), and 128 px (management details).

---

### User Story 4 - The rebrand changes nothing else (Priority: P2)

A returning user performs their usual flows after the rebrand — sign in, transcribe a video, reopen a stored transcript, copy a transcript, delete from history, confirm an email, reset a password. Every flow works exactly as before. Their stored transcripts, account, and history are untouched. All identifiers (storage keys, routes, account data), auth rules, the 5-minute limit, the one-active-job rule, and every backend behavior stay exactly as they are. The four earlier feature specifications and their documents (001–004) are not edited. The canonical regression checklist and this feature's quickstart are updated in the same change, as the constitution requires, so verification stays honest.

**Why this priority**: The rebrand is explicitly a presentation-only change; the guarantee that nothing else moved protects the single-user product from silent regressions and keeps the historical record intact.

**Independent Test**: Run the existing flows end to end and confirm identical behavior, byte-identical stored transcripts, unchanged identifiers, and an empty diff over specs/001–004; confirm the regression checklist and quickstart updates ship with the change. Delivers the no-regression guarantee.

**Acceptance Scenarios**:

1. **Given** the rebranded release, **When** the user completes any existing flow (sign-in, transcribe, reopen transcript, copy actions, delete from history, email confirmation, password reset), **Then** the flow behaves exactly as before — only visible names, tagline, and icon changed.
2. **Given** the rebranded release, **When** stored data is inspected, **Then** transcripts, account state, and history are byte-identical to before; no data is added, removed, or rewritten by the rebrand.
3. **Given** the rebranded release, **When** any identifier (storage keys, API routes, account data references) is compared with the pre-rebrand release, **Then** it is unchanged.
4. **Given** the rebranded release, **When** the repository history is checked, **Then** no file under the 001–004 feature directories was modified.
5. **Given** the rebranded release, **When** the canonical regression checklist is reviewed, **Then** it checks the new name/title, the icon, and regenerated build assets, and was updated in the same change as the rebrand.
6. **Given** the rebranded release, **When** this feature's quickstart is reviewed, **Then** it exists and covers the renamed user-visible surfaces, updated in the same change (constitution quickstart currency).

---

### Edge Cases

- **Extension pages already open at update time**: A page opened before the rebrand still shows the old name/tagline until the user reopens it; the freshly opened page shows the new brand. No action needed beyond reopening.
- **Stale browser/Chrome state**: Chrome may keep showing the old name or old icon for the extension entry until the extension is reloaded; after reload the entry shows "TRAI" and the lantern icon.
- **Old auth-page links in email**: An email sent before the rebrand links to the auth pages; when opened, the pages serve the current brand (fresh from the backend). If the browser serves a cached copy, a refresh shows the new brand.
- **Small-size icon legibility**: At 16 px the lantern glyph must still read as a lantern, not as the generic placeholder or an unidentifiable smudge; the toolbar tooltip ("TRAI") disambiguates if the glyph is hard to read at a glance.
- **High-density displays**: On 2x displays the toolbar renders the icon at the equivalent of 32 px; the delivered set must keep it sharp (SC-003).
- **Management page views**: The extensions management page shows the icon at 48 px and its details view at 128 px; both must be sharp with no pixelation (SC-003).
- **Tagline fitting the layout**: "Transcribe with AI" is longer than "language reading room"; it must fit the existing header on every page at normal desktop widths and on narrow windows without wrapping awkwardly, clipping, or causing horizontal scroll.
- **All six pages incl. edge-state screens**: The notice screen and any error/empty states still carry the new name and tagline — no page is left with the old brand.
- **Stale build artifacts**: A previous build's output could still contain the old icon or name; the rebuilt output must be regenerated so the shipped set contains the new icon at all four sizes and no stale copy.
- **No new dependency on connectivity**: The rebrand adds no network dependency; auth pages keep working exactly as before whether or not the backend is reachable at view time (behavior unchanged).

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The extension's visible name MUST be "TRAI" on every user-visible surface: its entry in the extensions management page, the toolbar tooltip, and the header and title of all four extension pages (sign-in, job/transcript, history, notice).
- **FR-002**: Both backend auth pages (email confirmation and password reset) MUST show "TRAI" as the visible name in their header and title.
- **FR-003**: All four extension pages MUST show the tagline "Transcribe with AI" in place of "language reading room".
- **FR-004**: Both auth pages MUST show the tagline "Transcribe with AI" in place of "language reading room".
- **FR-005**: The extension MUST present a compact lantern-only icon — derived from the Paper Lantern theme's lantern mark (feature 003) and consistent with its palette — in the Chrome toolbar and in the extensions management page, replacing the generic placeholder.
- **FR-006**: The delivered icon set MUST cover the sizes Chrome displays — 16 px (toolbar/tooltip), 32 px (high-density toolbar), 48 px (management page), and 128 px (management details) — and MUST render sharply at all of them.
- **FR-007**: The rebrand MUST NOT change any identifier (storage keys, API routes, account data references), any stored data, any auth behavior or rule (verified-account gates, one-active-job, 5-minute limit, transient audio deletion), or any other backend or extension behavior.
- **FR-008**: Historical feature documentation (specs/001–004: specs, plans, tasks, quickstarts, contracts, checklists) MUST remain untouched — no edits in the same change or any change of this feature.
- **FR-009**: The canonical regression checklist (`.docs/testcases.md`) MUST be updated in the same change as the rebrand to check: (a) the extension entry in the management page shows the new name "TRAI"; (b) the icon is present in the regenerated build assets at all four sizes and renders in the toolbar/management page; (c) the build row reflects regenerated assets (rebuilt output contains the new name and icon).
- **FR-010**: This feature's quickstart MUST be created (and kept current) per the constitution: it MUST cover the renamed user-visible surfaces and the icon checks as manual validation scenarios, updated in the same change as the rebrand.
- **FR-011**: The rebrand MUST NOT introduce any new functionality, new data collection, dark mode, or any change outside visible name, tagline, and icon.

### Key Entities *(include if feature involves data)*

- **Brand identity**: The three visible brand elements — name ("TRAI"), tagline ("Transcribe with AI"), and the lantern icon. These are presentation-only; they have no data model, are not stored, and are not part of any identifier.
- **Icon asset set**: The lantern glyph delivered at the four Chrome-displayed sizes (16, 32, 48, 128 px). Asset source: derived from the Paper Lantern theme's approved lantern mark (feature 003), rendered as a compact lantern-only glyph in the established palette; generated into the build output, so every build regenerates it.
- **No new data entities**: This feature introduces no new stored data, tables, or records. Transcripts, jobs, accounts, and history are unchanged (FR-007).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the six user-visible pages (four extension + two auth) show "TRAI" as the name in header and title, and the management page entry and toolbar tooltip show "TRAI"; 0 occurrences of "Video Transcript" remain as visible brand anywhere (checked across all six pages and the management entry).
- **SC-002**: 100% of the six pages show the tagline "Transcribe with AI"; 0 occurrences of "language reading room" remain on any of them.
- **SC-003**: The icon set covers 16, 32, 48, and 128 px; the lantern icon (not the generic placeholder) appears in the toolbar and management page; it renders sharp (no pixelation) on both a standard-DPI and a 2x-DPI display at every displayed size.
- **SC-004**: 0 regressions across all existing flows (sign-in, transcribe, reopen stored transcript, copy actions and source link, delete from history, email confirmation, password reset): each passes its pre-rebrand acceptance scenario; stored transcripts remain byte-identical; all identifiers unchanged (FR-007).
- **SC-005**: 0 files under specs/001–004 are modified by this feature (diff over the historical feature directories is empty).
- **SC-006**: The canonical regression checklist is updated in the same change with the new name/title, icon, and regenerated-assets checks (FR-009), and the updated checklist passes when run against the rebuilt extension and backend; this feature's quickstart exists, is current, and covers the renamed surfaces (FR-010).
- **SC-007** (qualitative): The user can identify the extension instantly — by name and lantern icon — in the toolbar and in the extensions management page, with no confusion against other extensions.

## Assumptions

- **Exact wording**: The new visible name is exactly "TRAI" and the new tagline is exactly "Transcribe with AI", as agreed; no other wording, subtitle, or tagline variants are introduced.
- **Tagline placement**: The tagline appears exactly where it appears today — the brand header line under the product name on all six pages. No new surfaces gain the tagline.
- **Icon source and look**: The icon is a derivative of the Paper Lantern theme's approved lantern mark (feature 003) — a compact lantern-only glyph, no text, in the established palette (lantern gold with indigo/paper accents). The mark's design is the source of truth; no new logo or wordmark is designed.
- **Icon asset handling**: The icon set is generated as part of the build and ships in the build output, which is regenerated on every build (build outputs are not version-controlled); the four Chrome-displayed sizes are the complete required set.
- **No store release**: The extension remains an unpacked Chrome desktop install for the single known user (constitution III); Chrome Web Store listing, promotional assets, and store copy are out of scope.
- **Identifiers are name-independent**: The extension's identity for data and auth purposes (installation identity, storage keys, routes, account data) does not depend on the visible name, so the rename cannot affect it (FR-007).
- **Repo-internal docs**: Developer-facing repository documents (e.g., README) are not user-visible product brand surfaces; the constitution's checklist-currency duty applies to `.docs/testcases.md` (updated, FR-009), and repo-internal README wording is out of scope unless the plan determines it is required for accuracy.
- **Toolbar pinning**: Whether the icon is pinned in the toolbar is the user's choice in Chrome; the feature only ensures the icon renders correctly once present.
- **Light mode only**: The rebrand keeps the Paper Lantern light theme (feature 003); no dark surfaces are introduced (FR-011).

## Out of Scope

- Chrome Web Store release, listing, store copy, or promotional assets.
- Renaming any identifier: storage keys, API routes, tables/columns, file names, or the installation identity — all stay exactly as today.
- Any change to data, auth rules, backend behavior, or the 5-minute / one-active-job / verified-account rules.
- Modifying any historical feature documentation under specs/001–004.
- New branding elements beyond name, tagline, and icon: no logo redesign, no wordmark, no marketing copy, no README rewrite.
- Theme work beyond the icon: the Paper Lantern palette, typography, and layouts of feature 003 are unchanged; no dark mode.
- New functionality, new pages, new data collection, or non-Chrome platform support.

## Constitution Check

Constitution v1.1.1 (`.specify/memory/constitution.md`, ratified 2026-08-30, amended 2026-08-31) is a ratified, filled document — unlike the starter template referenced by earlier specs — so this check is substantive:

- **IV Traceable Spec → Plan → Tasks → Docs**: This feature lives in `specs/005-trai-extension-rebrand/` with spec.md now, and plan.md/tasks.md/quickstart.md to follow; docs the change makes inaccurate are updated in the same change (FR-009, FR-010). **Compliant**.
- **Quickstart currency** ("quickstart.md MUST be updated whenever user-visible behavior changes"): A rename and tagline change are user-visible; FR-010 requires the feature quickstart to be created/kept current in the same change. **Compliant**.
- **Regression checklist currency** (".docs/testcases.md MUST be updated in the same change whenever behavior, UI, build outputs, or regression coverage would make its canonical checklist stale"): This feature changes UI (name, tagline) and build outputs (icon assets), so the checklist MUST change in the same change — FR-009 names the required checks (name/title, icon, regenerated assets). **Compliant**; the testcases.md update is a requirement of this spec, not an optional follow-up.
- **Test-first / asset-only exception**: The rebrand is presentation- and asset-only with no behavior change; per the constitution, behavioral tests MAY be skipped with an explicit exception noted in the task — the plan must record that exception. **Compliant** (noted for planning).
- **III Minimal Single-User Scope**: No out-of-scope functionality is introduced (Out of Scope; FR-011). **Compliant**.
- **II Server-Side Security Boundaries / V End-to-End Release Verification**: Auth rules and release gates are untouched (FR-007); quickstart scenarios will run against the running stack at release. **Compliant**.

**Result: Pass.** No constitution amendment required.

**Constitution delta for planning**: the two doc-currency MUSTs (quickstart, regression checklist) and the asset-only test exception must be carried into plan.md/tasks.md — this spec encodes them as FR-009/FR-010 and a planning note.