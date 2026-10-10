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
