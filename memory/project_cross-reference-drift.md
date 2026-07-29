---
name: cross-reference-drift
description: The dominant failure mode in this config system is stale cross-references, not duplication — and nothing currently checks for them
type: project
created: 2026-07-29
updated: 2026-07-29
valid_until: 2026-10-29
importance: 5
---

The 2026-07-29 audit was commissioned on the premise that `custom-skills/` was **bloated**. It was
not — 2,744 lines across 19 skills, average 144. The real defects were duplication (one skill
restating another) and, more damaging, **references to things that no longer exist**.

Six such bugs were found in one pass: a `CLAUDE.md` section two skills pointed at that was never
written, a skill path that was never right, an analytics override path naming the wrong directory
*and* the wrong skill name, `/gstack-plan-*` command names that are not invocable, and one file's
size limit stated as 30, 150 and 200 in four places.

**Why:** every one passed unnoticed for months. Nothing reads a skill and checks that what it points
at exists. `check.sh` verifies provider config sync, not content references — so a rename anywhere
silently orphans every mention of the old name.

**Proved by this very refactor:** deleting `hono-react-router-prisma-stack` broke four references in
taiboli-app that had been correct that morning. Fixed in Panya-Labs/taiboli-app#149, but only
because the audit went looking. A same-day rename with no checker is exactly the case that escapes.

**How to apply:** treat a rename or deletion in `~/.agents` as a repo-wide grep across every consuming
project, not just this one. The standing candidate for next work is a reference validator in
`check.sh` — resolve every skill name and path mentioned in a `SKILL.md` and fail on a miss.

Related: [[standards-split]] for what the audit changed, [[agent-config-loading]] for why
single-ownership beats restating.
