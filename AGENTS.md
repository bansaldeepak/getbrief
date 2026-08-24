# Global Agent Workflow

Universal rules for every project on this machine.

## Full Lifecycle Workflow

```
discover → prd (🔒) → trd (🔒) → project-plan → implement → pr-review (🔒) → retro → merge (🔒)
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
- **Story-first rule**: `story.md`, `tasks/T-NNN.md`, `summary.md` must exist BEFORE implementation
- **After each task**: `qa` agent → commit → update task status + `summary.md` → commit story updates separately
- **Legacy compat**: If story has `tasks.md` or `tasks/index.md`, continue that format. New stories use individual `tasks/T-NNN.md` files (status lives in each task file).
- **PR opened**: `/sdlc pr-review` → wait for human approval
- **User tests**: Human verifies the build works
- **Before merge**: `/sdlc retro` — captures learnings, updates docs/status, commits to same PR
- **After merge**: `self-improving` agent curates memory from retro findings

## Documentation & References

- Docs updated BEFORE stories or code. **Doc sync on commit**: grep docs, skills, READMEs and update all references.
- Every file referenced in documentation must exist inside the repo. Never reference global paths.
- Web fetching: try `https://<domain>/llms.txt` first, then find exact doc pages, fallback to homepage.

## Safe Code Modifications

- Change only what was asked — ambiguous scope → ask first
- Never repo-wide auto-fix (`eslint --fix`, `prettier --write`)
- Propose before broad-blast-radius changes

## Plan Mode

Planning is structured via the lifecycle workflow. Follow the phase's skill exactly. Don't skip
phases. Exit planning only when the artifact is complete and approved.

## Memory

Memory lives **in the repo** — never in provider global config. Full format: `project-memory` skill.

Mandatory checkpoints (if nothing's notable, say so explicitly):
- **Post-planning** — decisions, scope boundaries, rejected alternatives
- **Post-implementation** — gotchas, patterns that emerged, surprises
- **Post-ship** — what worked, what didn't, user-feedback context

## Critical Thinking

**Why → What → How** (in that order).

- Never assume — ask when requirements ambiguous
- Highlight risks user may have overlooked
- Verify blast radius before changing shared code — grep all usages
- Challenge scope — push back if task grows beyond definition

## First-Principles Process

Apply in order. Most people jump to step 4 or 5.

1. **Question the requirement** — Who imposed it? Is it actually necessary? Are we solving a symptom?
2. **Delete** — What can be removed entirely? Best code is code that doesn't exist.
3. **Simplify** — Can two things become one? Can configurable become hardcoded?
4. **Accelerate** — Only after 1-3. Measure, then optimize the bottleneck.
5. **Automate** — Only after 1-4. Automating a broken process just makes it fail faster.

Never optimize before simplifying. Never automate before optimizing. Prefer deleting over adding.

## Verification Discipline

Hard-won from past bugs. Internalize these.

- **Absence ≠ proof** — A grep returning nothing proves the pattern wasn't found, not that the thing doesn't exist
- **Unfailable checks look like passing ones** — Every guard needs a negative test proving it goes red
- **Task claims are unverified** — Check every assertion about code against the actual codebase before implementing
- **Trace before attributing** — Measure localises a symptom; trace the call path before blaming a component
- **Ask fix-now-vs-defer** — Don't silently punt when testing surfaces a gap in the story's blast radius
- **Self-contained specs for handoff** — Inline code context, schema, decisions. A link is not context.
