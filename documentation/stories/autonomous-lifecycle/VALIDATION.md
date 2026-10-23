# Autonomous Lifecycle — Validation

Date: 2026-10-10. Review scope starts at `5ea7a12`, excluding the unrelated earlier branch work.

## Policy review

An independent reviewer examined the router, execution modes, planning context, memory/curation,
review/retro timing, provider mappings, and standalone bug flow. Confirmed introduced findings
were corrected: unavailable required checks cannot become N/A, known unanswered requirements
cannot be deferred into implementation, and standalone bugs retain their own tracking evidence.
Re-review found no unresolved introduced policy issues.

Two pre-existing issues were presented to the user, who explicitly chose to fix both: plan no
longer creates the same story twice, and the task-status example uses `done`.

## Independent behavioral evaluation

A separate agent read the relevant revised skills and raw case inputs without receiving the audit's
expected answers. Six reasoning-only cases were evaluated before the final wording corrections:

| Starting request/state | Observed action | Result |
|---|---|---|
| Auto story with ambiguous rounding behavior | Investigated and requested clarification; dependent implementation paused | Pass |
| Review containing new minor, existing debt, and unknown-origin findings | Required new-minor correction; offered existing-debt choice; investigated unknown origin | Pass |
| Reporting-only `accountKey` preference while planning authentication | Preserved feature scope; did not silently generalize naming | Pass |
| Schema changes approved but migration execution unapproved | Kept execution approval separate | Pass |
| Deferred retro after PR already merged | Required fresh follow-up branch; retained broader promotion gate | Pass |
| Explicitly approved naming rule relevant to TRD | Applied it without repeating the settled decision | Pass |

The evaluator identified ambiguous wording about unresolved TRD questions and unavailable checks;
both were corrected and checked in policy review. These traces support the named decisions only.
The full [scenario catalog](SCENARIOS.md) remains proposed: all-mode resume behavior and live host
execution were not comprehensively tested. No remote push, database mutation, or browser flow was
performed for behavioral evaluation.

## Installer review and executable verification

Independent review found five introduced installer issues, all fixed and re-reviewed: surrounding
custom text preservation, visible generator diagnostics, DB-safety availability, ancestor-type
preflight, and manifest ownership. Isolated fixtures exercise each concern, plus dangling links,
directory refusal, edited generated files, idempotence, and active-reference failures.

- Full Node suite: 248 tests passed, including 12 installer/reference cases.
- Active-source references: 55 files, zero problems.
- Skill YAML metadata: 14 skills, zero errors using the existing project YAML dependency.
- Bundled skill-creator validator could not run because PyYAML is unavailable; it is not reported
  as passed. The project validator is the explicit fallback.
- The project defines no separate typecheck/lint scripts. Node tests, source validation, and
  whitespace checks are the applicable checks for this change; no required check was waived.
- Global rollout is separately verified with the installer's source/target manifest. Generator
  warnings disclose Codex's approximation of unsupported per-tool/maxTurns controls.

Source candidate `7382850` contains the reviewed implementation. Installation completed successfully:
all 30 registrations passed `check.sh`, and each provider file retained its complete pre-install
custom content. Displaced registrations are backed up; existing project overrides were preserved.
Only documentation/memory/tracking changed afterward and receives incremental factual review.

Review found the local source ready. Publication and merge remain subject to the user's explicit
approval; this work does not claim live cross-provider model compliance.
