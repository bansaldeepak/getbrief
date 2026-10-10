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
| `retro` | `retro/SKILL.md` | Before publication by default; deferred or incremental learning |
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

## The Graph

```text
discover → prd (approval) → trd (approval when architecture changes) → project-plan
  → implement (selected mode) → pr-review + fixes → retro + curation
  → review retro changes + final checks → push/PR (approval) → user tests → merge (approval)
```

This router owns phase order. Implement owns mode/commit/publication authority; review owns finding
closure; retro owns learning. During an authorized story, automatically continue through the local
execution/review/retro/check loop. Do not require a new invocation at each handoff. Honor explicit
user scope/approval and stop at unresolved questions or outstanding human gates.

Retro defaults before publication. An explicit urgency choice may defer it with a durable owner,
revision, reason, and completion trigger. Later changes require incremental review, affected checks,
and new learnings only; after merge use a fresh branch and linked follow-up. Successful user testing
without changes permits direct user merge.

Plan-review gates use the available gstack router: plan-ceo-review for PRD and plan-eng-review for TRD.
If unavailable, report that limitation and perform the relevant review directly; never invent a pass.
An explicit user instruction to apply approved requirements authorizes that scoped work; do not
repeat approvals already provided. Capture technical decisions and story/task artifacts before edits.

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

| Finished | Next |
|----------|------|
| discover | PRD, or user-authorized trivial planning |
| PRD | User approval; plan review, then TRD if architecture changes, otherwise justified technical note |
| TRD | User approval for architecture; engineering review, then project-plan |
| project-plan | Confirm unresolved scope/choices, select mode, execute tasks |
| implement | Automatically pr-review before any push or PR |
| pr-review | Resolve all new findings; retro by default, or recorded explicit deferral |
| retro | Review its changes and run relevant final checks; no repeat retro without new learning |
| final checks | Implement publication gate: present evidence and ask to push/open or update PR |
| publication | User verifies build; changes return to incremental review/checks and learning |
| successful user test | Merge approval; no additional retro when unchanged |

## /brief setup

Run in a project directory to scaffold the brief structure.

### Step 1 — Run the CLI

```bash
brief init
```

This creates:
- `documentation/` with subdirectories: stories, decisions, todo, logs, memory, context
- `documentation/tracker.yaml` — item registry
- `documentation/PROJECT-TRACKER.md` — generated markdown view
- `MEMORY.md` — memory index at project root
- `AGENTS.md` — agent instructions with harness marker
- `.claude/rules/` — rule templates matched by detected stack

### Step 2 — Fill rule template markers

After `brief init` copies rule templates, scan installed rules for empty `<!-- brief:auto -->` sections
and fill them with project-specific content.

```bash
grep -rl "brief:auto" .claude/rules/ 2>/dev/null
```

For each file with markers:

1. **Read the file** — identify empty `<!-- brief:auto section="..." -->` blocks (contain only example comments)
2. **Read the project** — scan relevant source files, configs, and conventions to determine what belongs in each section
3. **Fill the section** — write concise, accurate content between the markers. Rules should be terse (bullet points, not paragraphs). Only state conventions that actually exist in the project — don't invent aspirational rules.
4. **Show the user** — print the filled content for each file and ask for confirmation before writing

**Section fill guidance by template:**

| Template | How to fill |
|----------|-------------|
| `techstack.md` | `stack`: list runtime + frameworks detected. `runtime`: config files, env handling. `aliases`: read tsconfig/import maps. `structure`: scan top-level dirs for patterns. |
| `coding-style.md` | `naming`: grep for naming conventions in existing code. `patterns`: identify common patterns (error handling, async, etc). `imports`: check import style. `testing`: identify test runner and conventions. |
| `backend-standards.md` | `architecture-layers`: scan for routing/service/repo layers. `api-design`: check route patterns. `error-handling`: check error middleware. `database-access`: check ORM usage. |
| `frontend-standards.md` | `component-architecture`: scan component directory structure. `state-management`: check for stores/context/hooks. `data-fetching`: check loader/query patterns. `styling`: check CSS approach. |
| `deployment.md` | Read CI configs, Dockerfiles, wrangler.toml, vercel.json. Fill deploy commands, env var handling, infrastructure details. |
| `git-workflow.md` | Read existing branch names, commit messages, CI checks. Fill branch naming, PR conventions, release process. |
| Other templates | Read the relevant source files and fill each section with observed conventions. |

**Skip a section** if there's nothing meaningful to fill — leave the example comment in place. Don't fill
sections with generic boilerplate.

### Step 3 — Post-setup checklist

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
- Preserve required artifacts and explicit approvals; justify inapplicable phases and honor user-authorized scope
- Never pass a 🔒 gate without explicit approval in the conversation
- Continue authorized local story handoffs automatically; do not cross unanswered approval gates
- Always `--dry-run` first for destructive migrations
- Ask user before deleting legacy source files
