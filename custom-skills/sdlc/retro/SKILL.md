---
name: retro
description: "Retrospective after story completion and merge. Captures learnings, updates skills/memory, and feeds improvements back into the workflow. Auto-invoked after story merge."
user_invocable: true
model: opus
---

# /sdlc retro -- Story Retrospective

Captures learnings after story completion and feeds improvements back into the system. Runs after merge, before starting new work.

**Usage**: `/sdlc retro` (reviews the most recently completed story) or `/sdlc retro S-NNN`

**Source**: Adapted from phuryn/pm-skills retro facilitation + custom auto-improvement loop.

## When Claude Should Auto-Invoke

- After a story is merged and marked as completed
- Before starting a new `/sdlc discover` or `/sdlc project-plan` cycle
- Say: "Story complete and merged. Running retro to capture learnings."

## Instructions

### Phase 1: Gather Data

Collect information about the completed story:

```bash
# What was planned vs. delivered
# Read story.md, tasks/index.md (+ individual task files as needed), summary.md
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

**Format detection:** Check whether the story uses `tasks.md` (legacy single-file) or `tasks/index.md` (current split format). Read whichever exists. For the split format, read `tasks/index.md` for the overview, then drill into individual `tasks/T-NNN.md` files as needed.

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

### Phase 4.5: Flush Context and Curate Memory

Run `/sdlc memory-review`. It flushes this feature's context to `context.md` and curates what remains —
format and locations are defined in `project-memory`, so don't duplicate them here.

Commit the flush separately: `docs(context): flush <feature> implementation context`

### Phase 5: Collect Token Usage

Capture cost data for this story. Both Claude and Codex record the git branch in
their session logs, so the branch is the accurate scope — not a date window:

```bash
~/.agents/scripts/token-usage.py --branch <story-branch> --project <repo-path>
```

1. Get the branch from `story.md` (Branch field)
2. Run `--list` first to sanity-check which sessions matched, then run the totals
3. Paste the table into `summary.md` under Token Usage
4. Add the compact line to `PROJECT-TRACKER.md` in the story's row

**Covers both hosts.** If work was done in Codex as well as Claude, both appear —
a Claude-only number on a story worked in both silently under-reports.

**When branch isn't enough:** several stories sharing one branch, or work done off
it. If the repo has `documentation/.sessions.jsonl` (written by the optional
`record-session.sh` SessionStart hook), use `--sessions-file` for exact
attribution. Falling back to `--after <date>` is approximate whenever stories
overlap in time — say so in the summary rather than presenting it as exact.

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

## Token Usage
<paste output from ~/.claude/scripts/token-usage.sh>

## System Improvements Made
- <skill/memory/rule updated and why>

## Recommendations for Next Story
- <specific advice for the next piece of work>
```

## Rules

- Auto-invoke after every story merge — don't skip
- Be honest about what didn't work — sanitized retros are useless
- Every "what didn't go well" must have a concrete learning
- Learnings must be actionable — "we should do better" is not a learning
- Wait for user approval before modifying skills/rules
- Memory updates (feedback type) can proceed automatically
- Keep retro under 100 lines
