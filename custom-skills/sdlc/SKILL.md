---
name: sdlc
description: "Router for the software lifecycle skills — discovery, PRD, TRD, planning, implementation, code review, retrospective, decision records, memory curation, and bug handling. Invoke for any of: /sdlc, /discover, /prd, /trd, /project-plan, /implement, /pr-review, /retro, /decision-doc, /memory-review, /sdlc bug, or whenever work is starting on a feature, a plan or requirements are needed, a story's tasks are being worked through, a commit or push needs approval, a non-obvious choice needs recording, a branch is ready for review, or a story just merged."
user_invocable: true
argument-hint: "[discover|prd|trd|project-plan|pr-review|retro|decision-doc|memory-review|bug]"
model: opus
---

# /sdlc — Lifecycle Router

Routes to one lifecycle phase. **This file owns the phase graph; the phase files own their own
procedures.** No phase file restates what comes next — that lives here and only here.

## Route

Read the file for the requested phase and follow it exactly. Do not summarize it, work from this
table, or answer from memory — the table below is an index, not a substitute.

| Phase | Read | Use when |
|-------|------|----------|
| `discover` | `~/.agents/custom-skills/sdlc/discover/SKILL.md` | Problem is vague, scope ambiguous, multiple readings exist |
| `prd` | `~/.agents/custom-skills/sdlc/prd/SKILL.md` | Problem is clear, requirements need defining |
| `trd` | `~/.agents/custom-skills/sdlc/trd/SKILL.md` | Architecture, schema, or API contracts change |
| `project-plan` | `~/.agents/custom-skills/sdlc/project-plan/SKILL.md` | Approved requirements need breaking into stories and tasks |
| `implement` | `~/.agents/custom-skills/sdlc/implement/SKILL.md` | Working through a story's tasks — commit and push gates |
| `pr-review` | `~/.agents/custom-skills/sdlc/pr-review/SKILL.md` | Branch is ready for review, before a PR |
| `retro` | `~/.agents/custom-skills/sdlc/retro/SKILL.md` | User tested build, before merge |
| `decision-doc` | `~/.agents/custom-skills/sdlc/decision-doc/SKILL.md` | A non-obvious choice was made, any time |
| `memory-review` | `~/.agents/custom-skills/sdlc/memory-review/SKILL.md` | Memory needs flushing or curating, any time |
| `bug` | `~/.agents/custom-skills/sdlc/bug/SKILL.md` | A bug needs structured handling (triage + fix + close) |

Invoked with no argument: infer the phase from the lifecycle position below, name your choice, and
proceed. If two phases are equally plausible, ask rather than guess.

## Branch Check — Before Writing Anything

Every phase from `prd` onward writes files into the repo (PRD.md, TRD.md, story files, code). Before
the first write in **any** phase — `prd`, `trd`, `project-plan`, `implement` — run:

```bash
git branch --show-current
```

If it prints `main` (or the repo's default branch), branch out immediately. Don't wait for the
commit gate in `implement` to notice — by then the docs or code are already sitting on `main`.

```bash
git checkout -b feature/<slug>   # or fix|chore|hotfix — see AGENTS.md for naming
```

Derive `<slug>` from the feature/story name. If a branch already exists for this feature (you're
resuming a later phase of the same story), switch to it instead of creating a new one — check
`git branch --list '*<slug>*'` first. Creating or switching branches needs no approval — it's local
and reversible. Everything that happens *after* the switch still follows the commit/push gates owned
by `implement`.

`retro` runs on the story branch after user testing, before merge — the retro commit is part of the
same PR. It audits: confirm every commit for the story landed on the story's branch, not `main`,
and flag it as a finding if not (see `retro`'s Phase 1).

## The Graph

```
discover → prd (🔒) → trd (🔒) → project-plan → implement → pr-review (🔒) → retro → merge (🔒)
             │          │                       │      │
      gstack plan-  gstack plan-          qa agent   every commit (🔒)
      ceo-review    eng-review            per task   every push (🔒)
```

🔒 = **human approval gate.** Stop and get explicit approval. Never pass one on inferred consent.
Implement carries the most gates of any phase — one per commit and one per push, not one per story.

**Plan-review gates** run through the gstack router: `/gstack plan-ceo-review` on the PRD after `prd`
and before `trd`; `/gstack plan-eng-review` on the TRD after `trd` and before `project-plan`.

### Entry point by scope

| Scope | Start at |
|-------|----------|
| Bug | `bug` — dedicated mini-workflow with risk assessment |
| Under 30 minutes | Skip to `implement` → `qa` → `pr-review` |
| Clear-scope feature | `prd` |
| Ambiguous problem | `discover` |
| Architecture unchanged | Skip `trd` |

### Off-graph, any time

`decision-doc` when a fork in the road gets resolved. `memory-review` when memory needs curating.
Risk assessment is built into `/sdlc bug` (Phase 3) — no standalone pre-mortem needed.

## After a Phase

Announce the next phase and why, then wait if the transition crosses a 🔒 gate:

| Finished | Next |
|----------|------|
| `discover` | `prd` — or straight to `project-plan` if trivial |
| `prd` 🔒 | `/gstack plan-ceo-review`, then `trd` if architecture changes, else `project-plan` |
| `trd` 🔒 | `/gstack plan-eng-review`, then `project-plan` |
| `project-plan` | `implement` — task by task, `qa` agent, gated commits |
| `implement` | `pr-review` once every task is done and pushed 🔒 |
| `pr-review` 🔒 | PR opened, user tests the build |
| user tests | `retro` — captures learnings, updates docs/status, commits to same PR |
| `retro` | merge 🔒 — `self-improving` agent runs post-merge |

## Rules

- Always read the phase file; never improvise a phase from this table
- Never skip a phase because the work "seems small" — say so and let the user decide
- Never pass a 🔒 gate without explicit approval in the conversation
- One phase per invocation; chain by announcing the next, not by running it unasked
