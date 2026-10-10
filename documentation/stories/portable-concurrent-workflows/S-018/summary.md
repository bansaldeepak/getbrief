# S-018: Portable installs and concurrent project records — Summary

## What Changed
<!-- Updated after each task is completed -->

## Decisions Made
<!-- Non-obvious choices and why -->

## Testing
<TBD at implementation>

## Follow-up
<!-- Deferred items, future improvements -->

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
