---
name: grep-all-callers-when-removing-a-return-field
description: Before removing a return field from a function, grep all callers to ensure nothing is left broken
metadata:
  type: feedback
created: 2026-09-01
updated: 2026-09-01
valid_until: permanent
importance: 4
---

## Rule

Before removing a return field from an exported function, grep all callers — do not remove the field without verifying no code depends on it.

**Why:** In S-012 harness.mjs, a `copied` field was added to the return object during the inline-everywhere pivot, then should have been removed during refactoring. The field survived into the final commit because it wasn't explicitly removed and nothing crashed (the caller wasn't using it yet). This was caught during pr-review and required a cleanup commit.

**How to apply:**
1. If removing or renaming a return field from an exported function, grep the project first: `grep -r "\.fieldName" --include="*.mjs"` (all call sites, all imports)
2. Verify each call site is either not using the field or has been updated to not need it
3. Then remove the field from the return statement
4. Do this verification before test-running; test-passing doesn't guarantee completeness

Reference: [[verification-discipline]] — task claims are unverified without reading actual code.
