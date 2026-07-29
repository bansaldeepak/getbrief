# CODE-AGENT-INSTRUCTIONS

Execution policy for any coding agent working in this repo — Claude Code, Codex, Gemini, Cursor.

For **how to write code here** (commands, conventions, doc map, hard rules), read
[`AGENTS.md`](../AGENTS.md). This file covers only **when you are allowed to commit, push and open a PR**.

## The one rule

**You never commit, push, or open a PR on your own. A human approves each one, every time.**

Silence is not approval. "Looks good" on a previous task is not approval for this one.

## The loop

```
        ┌──────────────────────────────────────────────┐
        │  pick the next task from tasks/index.md       │
        └──────────────────────┬───────────────────────┘
                               ▼
                        implement it
                               ▼
                 run typecheck · lint · tests
                               ▼
              npm run docs:sync — update what it lists
                               ▼
        ┌──────────────────────────────────────────────┐
        │  STOP. Report what changed. Ask to verify.    │  ◀── gate 1
        └──────────────────────┬───────────────────────┘
                               ▼
                    human says "commit"
                               ▼
                   commit (one task = one commit)
                               ▼
                 update tasks/index.md + summary.md
                    → commit that separately
                               ▼
                    more tasks? ──yes──▶ loop
                               │no
                               ▼
        ┌──────────────────────────────────────────────┐
        │  STOP. Story done. Ask to push.               │  ◀── gate 2
        └──────────────────────┬───────────────────────┘
                               ▼
                    human says "push"
                               ▼
                  push, then open a PR to main
```

## Gate 1 — before every commit

Stop and post this. Keep it short; the human is deciding whether to go look.

```
Task:      S-NNN-TN — <title>
Changed:   <file> — <what and why>
           <file> — <what and why>
Checks:    typecheck ✅  lint ✅  tests ✅ (N passed)  docs:sync ✅
Verify by: <exact URL and what to click>  — or —  <which file to read>
Risky:     <migrations · env vars · API shape · deletions>  — or —  none
```

**`npm run docs:sync` before you report.** It lists every mapped doc your change
touches, regenerates the generated ones, and prints the `log.md` line to append.
It never rewrites prose and never bumps `verified_at` on its own — you confirm a
doc is true, then `--verify` it by name. A tool that bumps the date for you turns
the whole check into a rubber stamp.

**Always name a verification point.** If it is browser-checkable, give the URL and the click path. If
it is not, say which file to read and what to look for — reading the diff is a valid verification.

**Call out anything that slips through a browser check**, loudly and by name:

- a Prisma migration (say what it alters, and whether it is reversible)
- a new or renamed environment variable (say which deploy surface needs updating)
- an API request or response shape change
- a deleted file, route, or exported symbol
- anything touching auth, consent, or payments

Then wait. Do not commit while waiting.

## Gate 2 — before push and PR

Push happens **once, when the whole story is done** — not per task — unless the human says otherwise.

Pushing triggers CI: it builds and pushes a container image and can deploy. So the human tests the
finished story in a browser first, then approves.

Ask like this:

```
Story S-NNN complete — N tasks, N commits.
Test:      <URLs and flows to exercise>
Watch for: <the specific regressions this story could cause>
Push runs: <which workflows will fire>
Push + open PR to main?
```

On approval: `git push -u origin <branch>`, then open a PR into `main`.

## Never, regardless of approval

- Commit to `main`, or push to `main` directly — everything goes through a PR
- `--force` push without the human saying so in that moment
- `git commit --no-verify`, unless the human asked and you say why
- `npm run db:push` for a schema change — always `db:migrate` (no migration file = broken CI deploy)
- A repo-wide `prettier --write .` or `eslint --fix`
- Change anything outside the task's stated scope. Found something else? Report it, don't fix it.

## If a check fails

Report the failure with its actual output. Do not commit, do not "fix it quickly" outside scope, do
not skip the test. A red test is information, not an obstacle.

## If the task spec is wrong

Task specs in `documentation/stories/<feature>/S-NNN/tasks/` are written before implementation and
are sometimes wrong. If reality contradicts the spec, **stop and say so** — do not quietly implement
something different. A spec that turns out to be wrong is a finding worth more than the task.
