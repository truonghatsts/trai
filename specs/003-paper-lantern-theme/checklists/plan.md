# Plan Quality Checklist: Paper Lantern Theme

**Purpose**: Validate planning artifacts (plan.md, research.md, data-model.md, contracts/theme.md, quickstart.md) against spec.md before task generation
**Created**: 2026-08-30
**Feature**: [spec.md](../spec.md) | **Validation owner**: executor | **Write scope**: `specs/003-paper-lantern-theme/**`

## Scope Fidelity

- [x] All 6 surfaces covered: 4 extension pages (sign-in, job/transcript, history, notice) + 2 backend auth pages (confirm, reset) — plan.md Phases A/C, contracts/theme.md §1
- [x] CSS-only identity: lantern mark pure CSS, no image/SVG assets; name "Video Transcript" unchanged; tagline "language reading room" — contracts/theme.md §1, research.md #5, plan.md Non-Goals
- [x] Light-only, accessible, responsive visual system — FR-009/FR-008/FR-007 → palette table, focus/reduced-motion/no-color-alone rules, 375 px responsive checks
- [x] Display-only sentence/phrase line formatting in the current transcript renderer — FR-003..FR-006 → pure `splitIntoLines` in `extension/src/shared/reading-layout.ts`, wired by `job.ts`; **no** backend/schema/API changes (integration contract §3 MUST NOT change list)
- [x] Stored text preserved byte-identical — FR-006 → invariant `splitIntoLines(t).split('\n').join('') === t`, unit-tested, R2 quickstart check

## FR → Artifact Traceability

| FR | Where planned |
|---|---|
| FR-001 (cohesive theme, 4 pages) | plan.md Phases A/C; contracts/theme.md §1; quickstart V1–V4 |
| FR-002 (identity + CSS-only lantern + tagline) | contracts/theme.md §1 Brand identity; research.md #5 |
| FR-003 (sentence/phrase lines) | research.md #4; contracts/theme.md §2; plan.md Phase B |
| FR-004 (splitting order: breaks → sentence → clause) | contracts/theme.md §2 Boundary rules 1–3 |
| FR-005 (degrade safely, no guessing) | contracts/theme.md §2 rule 4 + edge table; quickstart R4 |
| FR-006 (exact preservation) | data-model.md reading-view invariant; contracts/theme.md §2 invariant; tests |
| FR-007 (backend pages themed, responsive, touch) | plan.md Phase C; quickstart V5/V6 + responsive checks |
| FR-008 (a11y: focus, AA, reduced-motion, no color-alone) | contracts/theme.md §1 Accessibility; quickstart V-checks + reduced-motion |
| FR-009 (light only) | palette token table; Non-Goals; quickstart V1 checklist item |
| FR-010 (no gamification/rename) | Non-Goals; regression gate |
| FR-011/FR-013 (no backend behavior change) | integration contract §3 MUST NOT change; data-model.md "no new tables/fields"; plan.md Unchanged list |
| FR-012 (no new data) | data-model.md Theme section; Non-Goals |

## SC → Validation Mapping

- SC-001 → quickstart V1–V6; backend `GET /auth/theme.css` test
- SC-002 → reading-layout unit invariant tests + quickstart R2
- SC-003 → reading-layout unit boundary tests + quickstart R1/R4
- SC-004 → regression gate (001/002 suites + quickstart scenarios)
- SC-005 → quickstart focus/contrast/reduced-motion checks
- SC-006 → quickstart 375 px checks
- SC-007 → Non-Goals + regression gate
- SC-008 → quickstart qualitative item

## Edge Cases → Artifact Coverage

- [x] CJK / no punctuation → contract edge table (unbroken), quickstart R4, unit tests
- [x] Own line breaks honored → contract rule 1, quickstart R3
- [x] Extremely long sentence → clause fallback (HARD_LIMIT), pre-wrap, quickstart R4
- [x] Quotes/ellipses/abbreviations → period guards, contract edge table, unit tests
- [x] Consecutive spaces/tabs/blank lines → contract edge table, quickstart R5
- [x] Empty/whitespace transcript → contract edge table
- [x] Emoji/Unicode → contract edge table
- [x] Very long transcripts → O(n), contract edge table
- [x] Window resize → viewport meta + pre-wrap, quickstart responsive item
- [x] Reduced-motion on glow → contracts/theme.md §1, quickstart reduced-motion check

## Artifact Completeness

- [x] plan.md: concrete file paths, phases with dependencies (A–D), test strategy, UX acceptance checks, explicit non-goals, constitution check, complexity tracking
- [x] research.md: all decisions with Decision/Rationale/Alternatives; zero [NEEDS CLARIFICATION] remain
- [x] data-model.md: no-entity-change declaration + reading-view derivation with invariant
- [x] contracts/theme.md: visual system (palette + ratios), reading-layout contract, integration contract
- [x] quickstart.md: runnable validation scenarios, setup commands, expected outcomes, SC mapping
- [x] No tasks.md generated (Phase 2 deferred — user instruction); no production code modified

## Notes

- **Validation result: PASS** — every FR and SC maps to at least one planning artifact; edge cases covered; non-goals explicit; write scope respected (`specs/003-paper-lantern-theme/**` only).
- Deferred by instruction: after_plan hooks (speckit.tasks mandatory hook skipped per "do not generate tasks"; speckit.agent-context.update optional hook skipped — writes outside allowed scope).
