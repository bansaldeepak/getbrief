# S-018: Portable installs and concurrent project records — Summary

## What Changed

### T1 — Canonical record authority
Implemented in `9cbe632`. Complete metadata is embedded in canonical Markdown; generated views are
local and explicit. Migration previews conflicts before writes, preserves legacy progress pointers,
and supports guarded byte-exact rollback. Routine edits update only affected records.
Verification: `npm test` — 256 passed, 0 failed. Typecheck/lint N/A: this ESM repository has no such scripts.
Tests include unknown/nested metadata, historical memory type, stale writes, missing/duplicate files,
interrupted migration, body/status edits, symlink rejection, and rollback after view generation.
No real project migration has been executed.

### T2 — Scoped identities and immutable logs
Implemented in `b3cc287`. New record-mode story IDs are feature-scoped; ambiguous shorthand fails.
Task progress derives from separate task files. New log entries serialize YAML safely and use
session/agent metadata plus immutable UUIDs. `verify-records --base` checks historical mutations.
Verification: `npm test` — 261 passed, 0 failed. Two independent clone branches merge cleanly for
different features; independent same-feature creation produces a detected conflict. 100 logs at
one timestamp remain distinct. No historical project logs were rewritten.

### T3 — Portable workflow packages
Implemented in `927c903`. Local bundles contain real skill/rule/agent assets and portable provider
registrations; global packages update independently. Explicit updates preserve customization,
preflight ownership, publish provenance last, and support guarded interrupted-transaction recovery.
Legacy destructive link replacement now refuses unowned destinations. Fresh init enables records;
existing project records require explicit migration. No actual home installation was changed.
Verification: full `npm test` — 268 passed; latest affected package suite 7 passed. Tests cover
fresh-copy discovery with the original source removed, local/global isolation, customized/unowned
files, stale plans, interrupted recovery, pinned init, notices, and global-only project selection.

### T4 — Distributed contracts and review closure
Implemented in `29794a2`. Router, direct planning context, phase skills, rules, provider adapter,
agent sources and templates now carry the same record/install contract. Fresh setup requests the
user's scope choice; existing scope is reused. All modes retain ambiguity and publication controls.
The mandatory CLI rule is installed on the first init. Generated views start empty, without fake records.

Both independent reviews completed with no unresolved introduced findings after corrections.
The named reviewer deployment returned 404; default agents followed the same reviewer procedure.
Detailed evidence and finding closure: [review](review.md). Historical malformed log notes remain
readable and unchanged; new entries use valid serialized YAML and immutable identities.

## Final Local Verification

- Base: published parent `02a345763f40fb1adbacf096c911a86d88060bc5`.
- Current package/documentation candidate: `fd7e084`; runtime remains `b737777`. Subsequent changes are story/retro bookkeeping only.
- Runtime `npm test` at `b737777`: **294 passed, 0 failed**. The packed npm artifact was installed into a temporary prefix and passed source-less, local/symlink override, global/local, pinned-update and removed-MCP smoke checks. Those artifact checks were repeated successfully after renaming the package to getbrief.
- Prior BUG-001 candidate `aee2f64`: **287 passed, 0 failed**. Real-project migration dry-run passed for **47 records**; migration and byte-exact rollback also passed on a temporary copy of the actual documentation.
- `npm test` at `29794a2`: **280 passed, 0 failed**, including parent lifecycle tests and all new regressions. After `5a22552`, the affected portable suite was rerun: **13 passed**, including repeat-init output.
- `npm run check:skills`: **56 maintained files, 0 reference problems; 14 skills, 0 metadata errors**.
- `node cli.mjs verify-records --base=02a345763f40fb1adbacf096c911a86d88060bc5`: passed on this legacy-mode repo; no historical-log changes.
- `build.sh` then `check.sh` in an isolated temporary home: **30 registrations passed**.
- Combined test: initialize from machine package, commit local bundle, clone, create independent
  feature/task/log work, merge, remove original project/home, then validate discovery, records,
  lifecycle modes/review/retro controls and package reference closure.
- Typecheck/lint/npm build: N/A; no such project scripts. The shell installer and source checks
  above are the applicable build/verification workflow. Browser verification: N/A for this CLI work.

## Rollout Status

Parent `feature/autonomous-lifecycle` is pushed at `02a3457`. This follow-up is stacked on that exact
commit, implemented and tested locally. No follow-up push, PR, merge, real-project record migration,
or actual home-package migration was performed. Local fixtures do not claim user application testing.
Story remains open for those user-controlled publication/testing/merge decisions. Same-record or
same-feature allocation conflicts still need coordination; unrelated records avoid aggregate writes.

## Retro and Commit Accounting

[Retro](retro.md) and scoped curation are complete before publication. Eight factual memory updates
preserve the 18-record inventory and every index pointer. Source/rule/agent improvements are applied.
The original handoff contained 10 local commits above the parent: planning, four implementation tasks,
three interim bookkeeping commits, one final review correction, and final story/retro/memory records.

## User-test correction — BUG-001

The user's actual migration preview exposed legacy scanner drift and narrative status misclassification.
[BUG-001](../../../bugs/BUG-001.md) records the repair at `aee2f64`, independent incremental review,
287-test result, real-data fixture verification, and one existing-memory update. That handoff had
12 local commits above the parent, including this fix and its separate bookkeeping. Actual project
authority remains unchanged; push/PR/merge are still pending user choice.

## T5 — CLI-only npm onboarding

Implemented at `b737777`. The old MCP server file was already removed; stale CLI routes, config writer
and knowledge.db lookup are now removed too. `brief install` creates the home package; project setup
and updates require no source argument. Explicit local directories/symlinks remain supported.
Source resolution rejects interrupted package sources and avoids claiming a consumer repository's SHA.

Independent incremental review closed T5-INSTALL-01 (pending source transaction). Initial full suite
293 passed, then the provenance correction passed 7 targeted tests; final full suite **294 passed**.
Repacked the final source and installed its tarball via npm in a temporary prefix. The installed
modules passed no-source init/install, explicit and symlink sources, home-to-project copies, global
selection, pinned updates, unsupported-URL refusal, and removed MCP command checks. Dependency
install scripts and codegraph indexing were skipped; these tests cover workflow distribution.
Source/skill and record checks passed. No registry publication or actual-home installation occurred.

Three existing memories were reconciled; 18 remain active with all index pointers retained.
That handoff had 14 local commits above the parent, including T5 and its separate final bookkeeping.

## T6 — Reader-facing pilot guide and getbrief naming

Implemented at `fd7e084`. README now leads with requirements, npm/machine/project setup, a one-project
migration and skills-behaviour pilot, explicit updates/recovery, and separate local development steps.
User selected getbrief for npm and GitHub; executable brief and .brief storage remain unchanged.
Renamed repository to https://github.com/bansaldeepak/getbrief and updated origin; PRIVATE retained.

README/package review found no confirmed issues. Source/skill references and record checks passed;
all 16 shell example blocks parsed without executing real-project commands. Package/lock names and
bin mapping were checked. Installed getbrief-0.2.0.tgz into a temporary prefix; brief --help and the
source/global/local/pinning smoke matrix passed. Runtime code did not change; its 294-test result above
remains applicable. Two existing memories reconciled; 18 retained, no removals or broader promotion.
This branch now has 16 local commits above the published parent. User will pilot one real project
before push/merge; no npm publication, code push, merge or actual project/home migration occurred here.
