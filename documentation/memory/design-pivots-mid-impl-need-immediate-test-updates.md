---
name: design-pivots-mid-impl-need-immediate-test-updates
description: When design pivots mid-implementation, update tests immediately in
  the same change, not deferred
metadata:
  type: feedback
created: 2026-09-01
updated: 2026-09-01
valid_until: permanent
importance: 4
_brief:
  version: 1
  record_id: 4923a072-09ff-4739-879d-aaf769f20188
  item:
    id: design-pivots-mid-impl-need-immediate-test-updates
    type: memory
    title: When design pivots mid-implementation, update tests immediately in the
      same change, not deferred
    status: active
    link: null
    pr: null
---

## Rule

When a design changes mid-implementation, update tests in the same commit — do not defer.

**Why:** In S-012, HARNESS injection approach changed 3x (copy → @-import → inline-everywhere). Each pivot required rework of both `harness.mjs` and the test matrix. Deferring test updates meant carrying technical debt into later commits, creating confusion about what the current design is. The pivot caught during final review instead of mid-implementation.

**How to apply:** After pivoting:
1. Re-read the TRD to understand what changed
2. Update the test matrix to match new design (before updating implementation code)
3. Run tests — they should fail predictably (old impl, new tests)
4. Update implementation to pass new tests
5. Commit the design pivot + tests + impl together

This ensures tests are always the source of truth for current design, not legacy tests masked by older implementation.
