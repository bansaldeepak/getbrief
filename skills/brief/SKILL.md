---
name: brief
description: "Unified router for lifecycle (discover, PRD, TRD, plan, implement, review, retro, bug, decision, memory) and project management (setup, migrate, verify). Invoke as /brief <phase|action>."
user_invocable: true
argument-hint: "[discover|prd|trd|plan|implement|pr-review|retro|decision|memory-review|bug|setup|migrate|verify]"
model: opus
---

# /brief — Lifecycle & Project Management Router

Routes to one lifecycle phase or project management action. **This file owns the phase graph; the
phase files own their own procedures.** No phase file restates what comes next — that lives here
and only here.

## Route

Read the file for the requested phase and follow it exactly. Do not summarize it, work from this
table, or answer from memory — the table below is an index, not a substitute.

**Path resolution:** All paths in the table below are relative to this skill's base directory
(shown in the "Base directory for this skill:" system prompt when this skill loads). Prepend
that base path to resolve the file.

### Lifecycle Phases

| Phase | Read | Use when |
|-------|------|----------|
| `discover` | `discover/SKILL.md` | Problem is vague, scope ambiguous, multiple readings exist |
| `prd` | `prd/SKILL.md` | Problem is clear, requirements need defining |
| `trd` | `trd/SKILL.md` | Architecture, schema, or API contracts change |
| `project-plan` | `plan/SKILL.md` | Approved requirements need breaking into stories and tasks |
| `plan` | `plan/SKILL.md` | Alias for project-plan |
| `implement` | `implement/SKILL.md` | Working through a story's tasks — commit and push gates |
| `pr-review` | `pr-review/SKILL.md` | Branch is ready for review, before a PR |
| `retro` | `retro/SKILL.md` | User tested build, before merge |
| `decision-doc` | `decision/SKILL.md` | A non-obvious choice was made, any time |
| `decision` | `decision/SKILL.md` | Alias for decision-doc |
| `memory-review` | `memory-review/SKILL.md` | Memory needs flushing or curating, any time |
| `memory` | `memory/SKILL.md` | How project memory works — format, read/write paths, checkpoints |
| `bug` | `bug/SKILL.md` | A bug needs structured handling (triage + fix + close) |

### Project Management Actions

| Action | What it does |
|--------|-------------|
| `setup` | Run `brief init` to scaffold documentation structure in a project |
| `migrate` | One-time data conversion from legacy formats to brief format |
| `verify` | Run `brief status` + queries to confirm everything works — report gaps |
| `scaffold-module` | Scaffold a new module directory with conventional file structure |

For `setup`, `migrate`, and `verify`: follow the instructions inline below (no separate file). For `scaffold-module`: read `scaffold-module/SKILL.md` and follow it.

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
Risk assessment is built into `/brief bug` (Phase 3) — no standalone pre-mortem needed.

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

## /brief setup

Run in a project directory to scaffold the brief structure.

```bash
brief init
```

This creates:
- `documentation/` with subdirectories: stories, decisions, todo, logs, memory, context
- `documentation/tracker.yaml` — item registry
- `documentation/PROJECT-TRACKER.md` — generated markdown view
- `MEMORY.md` — memory index at project root
- `AGENTS.md` — agent instructions

**Post-setup checklist:**
1. Confirm `brief status` returns counts
2. If project has existing stories in `documentation/stories/`, run `/brief migrate`
3. Add `documentation/logs/` to `.gitignore` if appropriate
4. Commit the scaffold: `chore: initialize brief project structure`

## /brief migrate

One-time conversion of existing project data into brief's format.

**What it converts:**
1. Monolithic `TODOS.md` → individual `documentation/todo/TODO-NNN-<slug>.md` files
2. Monolithic `log.md` → individual `documentation/logs/<timestamp>.md` files
3. Existing story folders → `documentation/tracker.yaml` entries

### Instructions

**Step 1 — Assess what exists:**
```bash
ls documentation/TODOS.md documentation/log.md documentation/tracker.yaml 2>&1
brief status
```

**Step 2 — Run brief's built-in migration:**
```bash
brief migrate --dry-run
brief migrate
```

**Step 3 — Verify:**
```bash
brief status
brief story list
brief todo list
```

**Step 4 — Commit:**
```bash
git add documentation/
git commit -m "chore: migrate project data to brief format"
```

## /brief verify

Confirm brief is working in the current project.

```bash
which brief
brief status
brief story list
brief todo list
brief search "<relevant keyword>"
test -f documentation/tracker.yaml
```

**Report format:**
```
brief verify:
  ✓ CLI in PATH
  ✓ Project detected (N stories, M TODOs, K decisions)
  ✓ Stories: N active
  ✓ TODOs: N open
  ✓ Search: functional
  ✓ tracker.yaml: present
```

**If any check fails**, report the failure and suggest the fix (usually `brief init` or PATH issue).

## Rules

- Always read the phase file; never improvise a phase from this table
- Never skip a phase because the work "seems small" — say so and let the user decide
- Never pass a 🔒 gate without explicit approval in the conversation
- One phase per invocation; chain by announcing the next, not by running it unasked
- Always `--dry-run` first for destructive migrations
- Ask user before deleting legacy source files
