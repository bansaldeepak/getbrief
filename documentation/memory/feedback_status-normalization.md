---
name: feedback-status-normalization
description: "Status fields in markdown files can be complex (e.g. 'Accepted (Option A) — validated by spike'). Only first word is extracted and mapped to known values."
metadata:
  type: feedback
---

Status values in decision/research files often contain prose after the keyword (e.g. "Accepted (Option A) — validated by spike", "Done – merged in #42"). The `normalizeStatus()` function in `brief/lib/scan.mjs` handles this by:

1. Taking only the first word (split on whitespace, parens, commas, dashes)
2. Mapping to known values: planned, in_progress, blocked, completed, done, open, active, draft, obsolete, moot, superseded
3. Alias mapping: accepted→active, decided→active, complete→completed, pending→planned
4. Default: "active"

**Why:** `brief status` was showing raw multi-word status strings that broke table formatting and counts.

**How to apply:** When writing status values to frontmatter, use single-word canonical values. When reading, always run through `normalizeStatus()`. The same logic exists in `scripts/taiboli-migrate/generate-tracker.mjs`.
