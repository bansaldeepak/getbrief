---
name: feedback-lifecycle-retro-position
description: "Retro runs after PR + user tests, before merge — same PR branch. Token usage tracking removed from all SDLC skills."
metadata:
  type: feedback
---

Retro is the last step before merge, NOT a separate story. It runs after:
1. PR opened
2. pr-review done
3. User tested the build

Retro + documentation updates commit to the **same PR branch**, then human merges.

**Why:** Token usage scripts weren't being used, and retro was previously positioned incorrectly (before user tests). The correct flow ensures documentation is finalized before merge.

**How to apply:** When running `/sdlc retro`, verify the PR is open and user has tested. Commit retro artifacts to the existing PR branch. Token usage collection has been completely removed from retro, project-plan summaries, and update-tracker.

Related: [[project-next-steps-scaffold]]
