# S-018 retrospective

**Covered implementation:** `29794a2` plus final reporting correction `5a22552`, stacked above published parent `02a3457`.
**Timing/status:** completed locally before follow-up publication; no retro deferral.

## Planned and delivered

Delivered explicit local/global packages, pinned updates, ownership/recovery, canonical per-record
metadata, feature-scoped IDs, immutable logs, executable verification and distributed guidance.
Both lifecycle and portability changes were tested together in isolated homes/projects and clones.
Actual machine/project migration and user application testing remain outside completed work.

## Learning applied

- Per-file authority needs complete atomic publication and interruption guards before either
  authority path. Migration must verify the entire record inventory, not only a count or sample.
  Added regressions and exact rollback checks; existing malformed historical logs remain untouched.
- Pinning includes provenance. Re-init must not silently refresh instructions or adopt customized
  bytes into ownership hashes. Added customization/re-init/upstream-update regression.
- Package recovery includes scaffold/rule files and private configuration permissions. Preflight
  validates every selected leaf; recovery refuses later edits and keeps journals private.
- Instruction-only log conventions were insufficient. The CLI creates unique immutable entries;
  verification rejects historical mutations and tracked view edits. Rules and all phase/agent
  consumers explicitly require the check and preserve scope/approval choices.
- A portable bundle must contain dependent rules/agents and provider adapters. The combined clone
  test removes the source project/home and checks both discovery and lifecycle controls afterward.

## Choices and curation

User source/scope are recorded in [approved choices](../../../memory/portable-installs-and-feature-scoped-concurrent-records.md).
Retained local/global choice, readable feature IDs, local generated views, unchanged historical logs,
selective mode for this story and separate publication authority. No broader preference inferred.

Self-improving procedure inventoried 18 active memories. Eight entries received factual updates or
dated historical qualifications; 18 remain active, zero removed/retired, all index pointers retained.
Updated stale dual-write/symlink-only descriptions, parent branch publication status and current
record/memory authority. Historical host-hook investigation and unverified GitHub rename remain
unverified. Planning-context now explicitly loads the record/install contract for direct PRD/TRD use.
Shared skill/rule/agent edits are within the user's approved Brief upgrade; project memories remain
in this repository. No provider-global memory files were written.

## Verification and boundaries

280 tests passed; the affected 13-test suite passed after the final reporting correction. All source/skill checks passed, repository record validation passed, and 30
isolated-home registrations passed. Both reviewer procedures re-reviewed fixes. See [review](review.md)
and [summary](summary.md). Later user changes require incremental review and affected checks/learning.
No follow-up push, PR, merge, actual home conversion or unrelated project migration has occurred.

## Incremental learning — BUG-001

User testing exposed legacy status drift and narrative metadata ambiguity absent from prior fixtures.
Fixed at `aee2f64`, reviewed with all new findings closed, and verified by 287 tests plus real-project
dry-run and copied-documentation migration/rollback. Added metadata-boundary and deferral regressions;
updated the shared contract/README and existing status-normalization memory. Curation remains 18
active memories with no removals or pointer loss. See [BUG-001](../../../bugs/BUG-001.md).
The project itself is still in legacy record mode; no actual migration or publication performed.

## Incremental learning — T5

User reaffirmed that Brief is CLI-only; the removed MCP server still had dangling CLI entry points.
Removed those remnants, added the intended home installer, and captured source precedence explicitly.
Test both source and destination transaction state when copying installed packages; package provenance
must not inherit a consumer's Git revision. Added source-selection/provenance regressions and tested
the final npm tarball in isolated prefixes/homes. Full suite 294 passed at `b737777`; review is clear.
Three existing memories updated with user choice and observed implementation; 18 remain, no removals
or broader promotion. Source contract/README/PRD/TRD reflect the CLI-only flow. No actual home changes
or publication occurred; dependency scripts/codegraph indexing were outside the package smoke test.

## Incremental learning — T6

User selected getbrief for npm/repository naming, retaining brief as the executable. Registry checking
prevented README instructions from pointing at the unrelated public brief package. Rewrote onboarding
around installation, explicit migration and observed agent behaviour; reviewed command syntax and
retested the renamed tarball. Repository rename verified with PRIVATE visibility retained. Two existing
memories reconciled; 18 retained. Real-project pilot, public release, push and merge remain pending.
