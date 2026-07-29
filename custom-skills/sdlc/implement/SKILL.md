---
name: implement
description: "Execution policy for working through a story's tasks — the loop from an approved plan to a merged PR. Covers the per-commit and per-push approval gates, what to report at each, and what to do when a check fails or a task spec turns out to be wrong."
user_invocable: true
model: opus
---

# /sdlc implement — Execution Loop

Runs between `project-plan` and `pr-review`: one task at a time, with a human gate at every commit
and every push.

Universal git and scope rules come from `WORKFLOW.md`; destructive database operations from
`db-safety`; code shape from `coding-standards` and its backend/frontend companions. **Commands,
scripts, and deploy behaviour are project-specific — read the repo's `AGENTS.md` for those.** This
skill covers only *when you are allowed to commit, push, and open a PR*.

## The One Rule

**You never commit, push, or open a PR on your own. A human approves each one, every time.**

Silence is not approval. "Looks good" on a previous task is not approval for this one. Approval to
commit is not approval to push.

## The Loop

```
   pick the next task from tasks/index.md
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
   update tasks/index.md + summary.md → commit separately
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

`WORKFLOW.md` covers the standing prohibitions — `main`, force-push, repo-wide auto-fix, working
outside the task's scope. Two more that belong to this loop:

- **`git commit --no-verify`** — unless the human asked for it and you say why in the same message
- **Committing while a gate is open** — an unanswered gate is a no, not a timeout

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

- One task, one commit; story bookkeeping commits separately
- Every commit and every push is individually approved — silence is never approval
- Every gate-1 report names a concrete verification point
- Risky changes are named explicitly, not left for the human to notice in the diff
- A failing check stops the loop; it is never worked around
- A wrong spec stops the loop and gets reported, never silently reinterpreted
