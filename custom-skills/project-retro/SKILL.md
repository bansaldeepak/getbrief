---
name: project-retro
description: "/project-retro -- Retrospective after story completion and merge. Captures learnings, updates skills/memory, and feeds improvements back into the workflow. Auto-invoked after story merge."
user_invocable: true
model: opus
---

# /project-retro -- Story Retrospective

Captures learnings after story completion and feeds improvements back into the system. Runs after merge, before starting new work.

**Usage**: `/project-retro` (reviews the most recently completed story) or `/project-retro S-NNN`

**Source**: Adapted from phuryn/pm-skills retro facilitation + custom auto-improvement loop.

## When Claude Should Auto-Invoke

- After a story is merged and marked as completed
- Before starting a new `/discover` or `/project-plan` cycle
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

### Phase 4.5: Flush Feature Context

Flush feature-specific context to the permanent `context.md` file (see CLAUDE.md "Feature Context Files"):

1. **Find the right location**:
   - Feature has `documentation/architecture/<feature>/` → write there
   - Otherwise → `documentation/stories/<feature>/context.md`
2. **Write/update `context.md`** with key decisions, gotchas, emergent patterns (compressed, signal-only)
3. **Remove flushed content from MEMORY.md** — only keep cross-cutting patterns and active-feature context
4. **Keep MEMORY.md under ~30 lines** after flush
5. **Commit context.md** separately: `docs(context): flush <feature> implementation context`

### Phase 5: Collect Token Usage

Run the token usage extraction script to capture cost data for this story:

```bash
# Determine the project's Claude config directory.
# Claude encodes the project's absolute path with '/' replaced by '-',
# e.g. /home/you/dev/my-app -> ~/.claude/projects/-home-you-dev-my-app
~/.claude/scripts/token-usage.sh <project-claude-dir> --after <story-start-date>
```

1. Get the story start date from `story.md` (Created field)
2. Run the script with `--after` filter to scope to this story's timeframe
3. Paste the output into `summary.md` under the Token Usage section
4. Add the compact line to `PROJECT-TRACKER.md` in the story's row

**Note:** If multiple stories overlapped in the same time window, usage is approximate — attribute based on branch activity from `git log`.

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

### Phase 7: Trigger Memory Review

After retro, invoke the `self-improving` agent to:
- Review recent memory additions
- Prune stale entries
- Promote valuable patterns to rules

## Rules

- Auto-invoke after every story merge — don't skip
- Be honest about what didn't work — sanitized retros are useless
- Every "what didn't go well" must have a concrete learning
- Learnings must be actionable — "we should do better" is not a learning
- Wait for user approval before modifying skills/rules
- Memory updates (feedback type) can proceed automatically
- Keep retro under 100 lines
