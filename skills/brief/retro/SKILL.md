---
name: retro
description: "Retrospective before merge. Captures learnings, updates skills/memory, runs self-improving agent, and feeds improvements back into the workflow. Retro complete = all done before merge."
user_invocable: true
model: opus
---

# /brief retro -- Story Retrospective

Captures learnings after story completion and feeds improvements back into the system.
Retro is the **last step before merge** — not a separate story. It runs after the PR is opened,
pr-review is done, and the user has tested the build. The retro output (retro.md, tracker
updates, TODOs) is committed to the same PR branch before the human merges.

**Usage**: `/brief retro` (reviews the most recently completed story) or `/brief retro S-NNN`

## When Claude Should Auto-Invoke

- After user has tested the build and confirmed it works
- PR is already open — retro commit goes into the same PR before merge
- Say: "User confirmed build works. Running retro to capture learnings before merge."

## Instructions

### Phase 1: Gather Data

Collect information about the completed story:

```bash
# What was planned vs. delivered
# Read story.md, individual tasks/T-NNN.md files, summary.md
# Read PRD.md and TRD.md (always present in feature folder)
# Check git log for the branch
# Check any decision docs created during implementation
```

**Branch audit.** Confirm every commit attributed to this story actually landed on the story's
branch, not `main`:

```bash
git log main --oneline --grep "S-NNN" -i          # any story commits reachable from main directly?
git log <story-branch> --oneline | grep -c "S-NNN"  # commits found on the actual branch
```

If any story commit is reachable from `main` outside the merge commit itself, that's a process
violation — someone skipped the branch check in `prd`/`trd`/`project-plan`/`implement`. Record it as
a "what didn't go well" with a concrete learning in Phase 3 (usually: the branch check got skipped
because the task "looked small").

**Format detection:** Check whether the story uses `tasks.md` (legacy single-file), `tasks/index.md` (legacy split format), or individual `tasks/T-NNN.md` files (current format). For legacy formats, read whichever exists. For current format, read individual task files — status lives in each file's frontmatter.

Compare:
- **Planned scope** (from PRD/story) vs. **Actual scope** (from commits/summary)
- **Estimated tasks** vs. **Actual tasks** (were tasks added/removed/split?)
- **Assumptions made** vs. **Reality encountered**

### Phase 2: Retrospective Analysis

#### What Went Well
- Patterns that worked smoothly
- Estimates that were accurate
- Tools/approaches that saved time
- Quality of PRD/TRD/story (did it prevent scope creep?)

#### What Didn't Go Well
- Surprises during implementation
- Gaps in requirements (discovered too late)
- Architecture decisions that needed revision
- Time spent on rework

#### What We Learned
- New patterns discovered
- Gotchas for future reference
- Better ways to approach similar problems

### Phase 3: Classify Learnings

For each learning, classify:

| Learning | Type | Action | Target |
|----------|------|--------|--------|
| <learning> | Skill gap / Process gap / Knowledge gap | Update skill / Update memory / Create rule / No action | <specific file to update> |

### Phase 4: Auto-Improve the System

Based on learnings, automatically:

1. **Update skills** — If a skill's guidance was wrong or incomplete, propose the edit
2. **Save to memory** — If a learning is project-specific and useful across sessions
3. **Create rules** — If a pattern should be enforced for specific file paths
4. **Update docs** — If documentation was missing or misleading

For each proposed change, explain what and why.

**Wait for user approval before modifying skills or rules.**

Memory updates (non-destructive) can proceed automatically.

### Phase 5: Update Project Tracker

If `brief` CLI is installed:

```bash
brief story update S-NNN status=completed pr="<PR URL>"

# Create TODOs from learnings that need future action:
brief todo create "<action item>" --priority=P2 --story=S-NNN

# Create decisions from architectural choices made during implementation:
brief decision create "<what was decided>" --story=S-NNN

# Log the retro completion:
brief log "Retro completed for S-NNN" --tag=retro --story=S-NNN
```

**Fallback** — edit tracker.yaml directly: set `status: completed` and `pr: <URL>` on the story entry.

### Phase 6: Retro Summary

Save to the story folder as `retro.md`:

```markdown
# S-NNN Retrospective

**Date**: <today>
**Story**: <title>
**Duration**: <start date> → <end date>

## Scope Accuracy
- **Planned tasks**: N
- **Actual tasks**: M
- **Scope change**: <added X, removed Y, split Z>

## What Went Well
- <item>

## What Didn't Go Well
- <item>

## Learnings
| # | Learning | Action Taken |
|---|---------|-------------|
| 1 | <learning> | <what we updated> |

## System Improvements Made
- <skill/memory/rule updated and why>

## Recommendations for Next Story
- <specific advice for the next piece of work>
```

### Phase 7: Self-Improving — Memory Curation (Final Step)

Run `/brief memory-review`. This flushes the feature's context to `context.md` and invokes the
`self-improving` agent to review, promote, and prune memory entries.

Commit the curation separately: `docs(context): flush <feature> implementation context`

**Retro is complete when this phase finishes.** No further steps remain before merge.

## Rules

- Auto-invoke after user confirms build works — don't skip
- Be honest about what didn't work — sanitized retros are useless
- Every "what didn't go well" must have a concrete learning
- Learnings must be actionable — "we should do better" is not a learning
- Wait for user approval before modifying skills/rules
- Memory updates (feedback type) can proceed automatically
- Keep retro under 100 lines
