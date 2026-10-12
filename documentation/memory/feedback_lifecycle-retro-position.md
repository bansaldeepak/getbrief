---
name: feedback-lifecycle-retro-position
description: Historical retro timing superseded on 2026-10-10; token-usage removal retained.
metadata:
  type: feedback
_brief:
  version: 1
  record_id: 2cfbbb84-1827-416c-b9e2-b2d1523c4079
  item:
    id: feedback_lifecycle-retro-position
    type: memory
    title: Historical retro timing superseded on 2026-10-10; token-usage removal
      retained.
    status: active
    link: null
    pr: null
    updated: 2026-10-10
    description: Historical retro timing superseded on 2026-10-10; token-usage
      removal retained.
---

# Historical retro timing and token-tracking removal

**Current status (2026-10-10):** The retro timing below is superseded by the user's explicitly approved [autonomous lifecycle controls](autonomous-lifecycle-controls-and-scoped-learning.md) and [retro policy](../stories/autonomous-lifecycle/RETRO-POLICY.md). The new shared brief default completes review/fixes and retro before publication, then reviews changes and verifies the resulting work. Explicit urgency can defer retro with a durable follow-up; after merge, use a fresh branch and linked PR.

**Scope of supersession:** Timing and branch handling only. The independent historical removal of token-usage collection is retained; this update does not reinstate it. The original source date was not recorded in this legacy entry. Keep the original text below as history, not current execution guidance.

## Original record (preserved)

Retro is the last step before merge, NOT a separate story. It runs after:
1. PR opened
2. pr-review done
3. User tested the build

Retro + documentation updates commit to the **same PR branch**, then human merges.

**Why:** Token usage scripts weren't being used, and retro was previously positioned incorrectly (before user tests). The correct flow ensures documentation is finalized before merge.

**How to apply:** When running `/sdlc retro`, verify the PR is open and user has tested. Commit retro artifacts to the existing PR branch. Token usage collection has been completely removed from retro, project-plan summaries, and update-tracker.

Related: [[project-next-steps-scaffold]]
