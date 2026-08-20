---
name: implement
description: "Execution policy for working through a story's tasks — the loop from an approved plan to a merged PR. Covers the per-commit and per-push approval gates, what to report at each, and what to do when a check fails or a task spec turns out to be wrong."
user_invocable: true
model: opus
---

# /sdlc implement — Execution Loop

Runs between `project-plan` and `pr-review`: one task at a time, with a human gate at every commit
and every push.

Universal git and scope rules come from `AGENTS.md`; destructive database operations from
`db-safety`; code shape from `coding-standards` and its backend/frontend companions. **Commands,
scripts, and deploy behaviour are project-specific — read the repo's `AGENTS.md` for those.** This
skill covers only *when you are allowed to commit, push, and open a PR*.

## The One Rule

**You never commit, push, or open a PR on your own. A human approves each one, every time.**

Silence is not approval. "Looks good" on a previous task is not approval for this one. Approval to
commit is not approval to push.

## Gate 0 — Branch Check, Every Time You Enter the Loop

Before picking up the first task, and again any time you resume this loop in a new session, run:

```bash
git branch --show-current
```

If it prints `main`, **stop and branch out before touching any file** — even for "just one small
task." Use the branch named in `story.md`'s **Branch** field (`git checkout -b <name>` if it doesn't
exist yet, `git checkout <name>` if it does). This is the check most likely to get skipped when a
task looks trivial — that's exactly when it matters, because a "quick" task is how work ends up
committed to `main` unnoticed.

## The Loop

```
   verify branch != main (gate 0)
                  ▼
   pick the next pending task from tasks/T-NNN.md files
                  ▼
   check project context for files being touched (see below)
                  ▼
             implement it
                  ▼
      run the project's checks (typecheck · lint · tests)
                  ▼
      sync docs the change affects
                  ▼
   ┌──────────────────────────────────────┐
   │  STOP. Report. Ask to verify.        │  ◀── gate 1
   └──────────────────┬───────────────────┘
                  ▼  human says "commit"
       commit (one task = one commit)
                  ▼
   update task status header (**Status:** → completed — a separate edit from the
   Acceptance Criteria checkboxes and Result section, verify by grepping the
   file for the literal string) + summary.md → commit separately
                  ▼
       more tasks? ──yes──▶ loop
                  │ no
                  ▼
   ┌──────────────────────────────────────┐
   │  STOP. Story done. Ask to push.      │  ◀── gate 2
   └──────────────────┬───────────────────┘
                  ▼  human says "push"
        push, then open a PR into main
```

## Project Context Check — Before Each Task

Before implementing a task, check if there are decisions, constraints, or known gotchas for the files
you're about to touch.

**Primary** — if `brief` CLI is installed (`which brief`):
```bash
brief search "<file or module name>"
brief story task update S-NNN-TN status=in_progress   # mark task started
```

**Fallback** — if CLI is not installed, read files directly:
- `PROJECT-TRACKER.md` — active decisions (DEC-NNN) that constrain this area
- `memory/` files — gotchas or constraints related to these files

Skip context check if the task spec already inlines all relevant context.

## After Each Task Commit

```bash
brief story task update S-NNN-TN status=completed
brief log "Completed: <what was done>" --story=S-NNN --tag=progress
```

## Gate 1 — Before Every Commit

Post this and stop. Keep it short — the human is deciding whether to go look, not reading a report.

```
Task:      S-NNN-TN — <title>
Changed:   <file> — <what and why>
           <file> — <what and why>
Checks:    typecheck ✅  lint ✅  tests ✅ (N passed)
Verify by: <exact URL and what to click>  — or —  <which file to read>
Risky:     <migrations · env vars · API shape · deletions>  — or —  none
```

**Always name a verification point.** If it's browser-checkable, give the URL and the click path. If
it isn't, say which file to read and what to look for — reading the diff is a valid verification.
"Tests pass" is not a verification point; it's a check, and it only proves what someone already
thought to assert.

**Call out anything a browser check would miss**, loudly and by name:

- a schema migration — say what it alters and whether it reverses
- a new or renamed environment variable — say which deploy surface needs it
- an API request or response shape change
- a deleted file, route, or exported symbol
- anything touching auth, consent, or payments

Then wait. **Do not commit while waiting.**

## Gate 2 — Before Push and PR

Push happens **once, when the whole story is done** — not per task — unless the human says otherwise.
Pushing usually triggers CI, and CI may deploy, so the human tests the finished story first.

```
Story S-NNN complete — N tasks, N commits.
Test:      <URLs and flows to exercise>
Watch for: <the specific regressions this story could cause>
Push runs: <which workflows will fire>
Push + open PR to main?
```

On approval: `git push -u origin <branch>`, then open the PR into `main`.

## Never, Regardless of Approval

`AGENTS.md` covers the standing prohibitions — `main`, force-push, repo-wide auto-fix, working
outside the task's scope. Two more that belong to this loop:

- **`git commit --no-verify`** — unless the human asked for it and you say why in the same message
- **Committing while a gate is open** — an unanswered gate is a no, not a timeout

## What Your Repo's AGENTS.md Must Add

This skill defines the gates; it cannot know what your checks mean. Each repo's `AGENTS.md` carries
that — **as a section in `AGENTS.md`, not a separate file.** `AGENTS.md` is already loaded in every
session, and these gates are global, so a second always-imported file is one more thing to drift.

Four things a gate report cannot be honest about without them:

- **The exact check commands** — what CI actually runs, which is often not what the README says
- **What each check does and doesn't prove** — a tool that reads committed state is meaningless from
  a dirty tree; a tool that stamps its own "verified" date is a rubber stamp. Say so, or the ✅ lies.
- **What push triggers** — which workflows fire, and whether any of them deploy. This is the whole
  reason gate 2 exists in that repo.
- **Verification surfaces** — the URL and click path per area, or the file to read where there's no UI

## If a Check Fails

Report the failure with its **actual output**. Do not commit, do not fix it "quickly" outside the
task's scope, do not skip or weaken the test. A red test is information, not an obstacle.

## If the Task Spec Is Wrong

Task specs are written before implementation and are sometimes wrong. If reality contradicts the
spec, **stop and say so** — do not quietly implement something different and describe it as the task.
A spec that turns out to be wrong is a finding worth more than the task it replaced.

Same for a spec that claims something about another story, or asserts that something is untested or
missing: verify before acting on it, and report what you found.

## Rules

- Verify `git branch --show-current` isn't `main` before every task, not just the first
- One task, one commit; story bookkeeping commits separately
- Every commit and every push is individually approved — silence is never approval
- Every gate-1 report names a concrete verification point
- Risky changes are named explicitly, not left for the human to notice in the diff
- A failing check stops the loop; it is never worked around
- A wrong spec stops the loop and gets reported, never silently reinterpreted
