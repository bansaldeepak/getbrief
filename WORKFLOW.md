# Global Agent Workflow

Universal rules for every project on this machine.

## Full Lifecycle Workflow

```
discover → prd (🔒) → trd (🔒) → project-plan → implement → pr-review (🔒) → merge (🔒) → retro
                                                   │
                                            qa agent per task
```

🔒 = **Human approval gate** — pause for explicit user approval.

**All phases run through the `sdlc` router**: `/sdlc <phase>`. The router owns the full graph —
entry points by scope, the gstack plan-review gates, and what follows each phase. Don't restate it
here or in a phase file; read it.

Off-graph: `/sdlc decision-doc` for any non-obvious choice, `/pre-mortem` before high-risk work.

## Story-Based Execution

- **Feature folder**: `documentation/stories/<feature-name>/` — groups PRD, TRD, stories, decisions
- **Story ID**: `S-NNN`. **Task ID**: `S-NNN-T1`, `S-NNN-T2`, etc.
- **One task = one commit** — atomic unit of work
- **Mandatory PRD/TRD**: Always exist in every feature folder (skip-justified for trivial work)
- **Story-first rule**: `story.md`, `tasks/index.md`, `tasks/T-NNN.md`, `summary.md` must exist BEFORE implementation
- **After each task**: `qa` agent → commit → update `tasks/index.md` + `summary.md` → commit story updates separately
- **Legacy compat**: If story has `tasks.md` (single file), continue that format. New stories use `tasks/`.
- **Before PR**: `/sdlc pr-review` → wait for human approval
- **After merge**: `/sdlc retro` → `self-improving` agent
- **Story completion**: All tasks done, `summary.md` finalized, status `completed`, tracker updated

## Project Tracker

Every project has `documentation/PROJECT-TRACKER.md`. One row per story. Updated on start/completion.

## Git Branch & Push Safety

**Never commit, push, or open a PR on your own — a human approves each one, every time.** Silence is
not approval; approval for the last commit is not approval for this one; approval to commit is not
approval to push. What to report at each gate: `/sdlc implement`.

Never commit or push to `main` — all changes via PR. Check `git branch --show-current` before every commit; if on `main`, STOP and branch first. Branch names: `feature|fix|chore|hotfix/<name>`, pushed with `git push -u origin <branch>`. No force-push without explicit consent in the moment.

## Commit Convention

```
type(scope): subject

Task: S-NNN-T<N>
```

Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`, `style`, `perf`, `ci`. Task ID in body, not subject.

## Documentation-First Workflow

Application docs updated BEFORE stories or code. Schema docs, API docs, flow docs — committed separately before implementation. Stories reference docs (don't repeat them).

**Doc sync on commit**: If a change affects how future code should be written → grep docs, skills, READMEs and update all references.

## Repo-Local References Only

Every file referenced in project documentation must exist inside the repo. Never reference global paths. Copy external files into `documentation/stories/<feature>/` before referencing.

## Web Fetching — llms.txt First

1. Fetch `https://<domain>/llms.txt` first
2. Use it to find exact doc pages needed
3. Fallback to homepage if 404

## Safe Code Modifications

- Change only what was asked — ambiguous scope → ask first
- Never repo-wide auto-fix (`eslint --fix`, `prettier --write`)
- Preserve over delete — comment out with `// TODO: remove after verification` if unsure
- Propose before broad-blast-radius changes

## Plan Mode

When in planning mode, **follow the lifecycle workflow above**. Planning is structured — not freestyling:

1. Identify which lifecycle phase applies (discover / prd / trd / project-plan)
2. Follow that phase's skill exactly
3. Don't skip phases — if PRD doesn't exist yet, create it before jumping to TRD
4. Exit planning only when the artifact (PRD, TRD, story, tasks) is complete and approved

## Memory Checkpoints (Mandatory)

Memory lives in the project repo only — root `MEMORY.md` index + `memory/` files, never in provider global config. Capture at three gates; if nothing's notable, say "No new memory at this checkpoint" so a skipped gate stays visible:

- **Post-planning** (PRD + TRD 🔒 approved) — decisions, scope boundaries, rejected alternatives, constraints
- **Post-implementation** (tasks done, qa green) — gotchas, patterns that emerged, surprises
- **Post-ship** (merged / deployed) — what worked, what didn't, perf, user-feedback context

## Critical Thinking

**Why → What → How** (in that order).

- Never assume — ask when requirements ambiguous
- Highlight risks user may have overlooked
- Verify blast radius before changing shared code — grep all usages
- Challenge scope — push back if task grows beyond definition
