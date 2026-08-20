---
name: project-next-steps-scaffold
description: "Design direction for .agents repo — structured index system, knowledge graph CLI, project scaffolding, self-improving retro. Prerequisite: fix file structure before DB indexes it."
type: project
created: 2026-08-13
updated: 2026-08-19
valid_until: 2026-10-15
importance: 5
---

## Design Direction (agreed 2026-08-19)

### Core Insight

The problem is scattered data without a structured index system. Fix the structure first,
then SQLite/knowledge graph indexes it. A DB over chaos indexes chaos.

### Canonical Project Structure

Everything numbered. Everything in its own file. One lean tracker indexes ALL types.

```
documentation/
  PROJECT-TRACKER.md     ← generated, active items ONLY (model reads this)
  tracker.yaml           ← full source of truth, all items all statuses
  todos/TODO-001.md      ← individual files with detail
  decisions/DEC-001.md
  research/RES-001.md
  audits/AUD-001.md
  stories/<feature>/S-NNN/
    story.md, tasks/T-001.md, summary.md, retro.md, context.md
```

### tracker.yaml — Single Source

Flat list with status field. No active/completed sections (just filter by status).

```yaml
- id: S-042
  type: story
  title: Session content pipeline
  status: in_progress
  branch: feature/session-content
  current_task: S-042-T3
  story: documentation/stories/session-content/S-042/story.md
  link: "https://github.com/org/repo/issues/92"  # external PM (GitHub, Linear, etc.)
  pr: null

- id: TODO-021
  type: todo
  title: Synthetic IDs block image display
  status: open
  priority: P1
  story: S-042                    # links to which story will resolve it (if known)
  link: "https://linear.app/team/TOD-21"  # optional external tracker

- id: S-041
  type: story
  title: Auth middleware rewrite
  status: completed
  completed: 2026-08-10
  pr: "#87"                       # PR link — always recorded on close
  story: documentation/stories/auth-rewrite/S-041/story.md
  retro: "TODO-045, DEC-012"

- id: DEC-011
  type: decision
  title: Forward-only mastery ratchet
  status: active
  created: 2026-07-15
  story: S-042                    # which story produced this decision
  pr: "#78"                       # PR where it was implemented
```

**Closing any item MUST record `pr:`** — the PR link connects "what we decided/found"
to "what we actually shipped." Without it, completed items are claims without evidence.

**`link:`** — optional, points to external PM (GitHub Issues, Linear, Jira, etc.).
Tool-agnostic; any URL works.

### What goes in tracker (and what doesn't)

**IN tracker:** actionable items with lifecycle endpoints — TODOs, decisions, research, audits, stories.
**NOT in tracker:** memory. Memory lives in `MEMORY.md` + `memory/` files, managed by self-improving agent.
Memory that becomes actionable gets PROMOTED to a TODO or decision — that's when it enters the tracker.

### Item Lifecycles

```
TODO     → done (fixed inline) | promoted to Story (planned work)
           Multiple TODOs can merge into one Story.

DECISION → stays (record, not actionable). Can be superseded by new DEC.

RESEARCH → accepted → spawns Story for implementation
           OR rejected/obsolete → closed with reason.

AUDIT    → findings → spawn TODOs or Stories for remediation
           OR clean → closed.

STORY    → completed → merged → retro → documented.
```

Nothing accumulates forever. Every item either gets BUILT (→ story → PR → code)
or gets EXPLICITLY CLOSED with a reason. Stale items are a system failure.

### Who reads what

| Reader | Reads | Why |
|--------|-------|-----|
| Model/Agent | `PROJECT-TRACKER.md` (generated, active only) | Lean, optimized for context |
| Scripts/DB | `tracker.yaml` | Structured, no regex parsing |
| Model (on demand) | `tracker.yaml` directly | When history needed, grep by type/status |
| Humans | Either | Markdown prettier, YAML is truth |

### PROJECT-TRACKER.md

- Contains ONLY active/pending items (keeps it lean)
- Completed items live only in tracker.yaml
- Regenerated after any tracker.yaml change
- Generation: filter status != completed → render markdown table

### Knowledge Graph CLI — Global Commands

The `knowledge-graph` CLI (`mcp-servers/knowledge/`) becomes the universal project interface:

```bash
knowledge-graph update S-042-T3 in_progress    # status transitions
knowledge-graph update S-042-T3 done
knowledge-graph update TODO-021 done
knowledge-graph create todo "Fix auth race" --priority P1
knowledge-graph create decision "Use YAML for tracker"
knowledge-graph status                          # what's active
knowledge-graph search "auth"                   # find across types
```

Works in any project with `.project/knowledge.db`. Auto-detects from cwd.
No project-specific npm scripts needed.

### Task Status Updates (in implement skill)

Every task MUST be marked:
- `in_progress` on start
- `done` on completion

Via: `knowledge-graph update S-NNN-TN in_progress|done`

This is part of the implement loop — before working on a task, mark it in progress.
After commit, mark it done. Skills enforce this.

### Retro as Self-Improving System

Retro is the LAST TASK in a story (same branch, same PR). Not post-merge.

Flow: all tasks done → raise PR → test hosted → pr-review → retro (final task) → merge

**Structured outputs (not prose dumps):**

1. **CLOSE** — mark existing TODOs/items as done/moot
2. **CREATE** — new TODO-NNN.md, DEC-NNN.md (proper ID, file, tracker entry)
3. **ANCHOR** — @constraint tags in code where traps found
4. **UPDATE** — skill/rule improvements (with approval gate)
5. **PRUNE** — mark stale memory/constraints as obsolete

**Self-improving loop:**

```
Story N retro → finds trap X → creates TODO-045, anchors to function Y
Story N+1 planning → touches function Y → knowledge_context surfaces TODO-045
Story N+1 retro → confirms TODO-045 useful → promotes to constraint
                → OR marks moot → prunes it
```

Each pass either adds knowledge where needed or removes what's stale.
System gets smarter with every story, not just heavier.

### Token counting

Dropped from retro. If needed: separate deterministic hook (session → story → append).

### Passive vs Active Memory

- **Active**: open TODOs, in-progress stories, constraints on code being touched
- **Passive**: completed features (context.md stays, surfaced only on explicit query)
- Knowledge graph surfaces active by default, passive on explicit query

### ID Systems

- TODO-001, TODO-002, ... (open work items, traps, gaps)
- DEC-001, DEC-002, ... (architectural decisions)
- RES-001, RES-002, ... (research/investigation)
- AUD-001, AUD-002, ... (audits/reviews)
- S-NNN (stories) + S-NNN-TN (tasks)

### Update Flow

```
tracker.yaml (flat, status field)
    │
    ├── knowledge-graph update → modifies yaml + DB
    ├── retro → adds new items via knowledge-graph create
    └── after any change → regenerate PROJECT-TRACKER.md (active only)
```

Regeneration: hook (post-commit if tracker.yaml changed) or part of
"commit story updates separately" step.

### Migration (existing projects)

`knowledge-graph migrate` converts existing formats to canonical structure:

| Existing | Migration |
|----------|-----------|
| `TODOS.md` (flat list) | → individual `todos/TODO-001.md` + tracker.yaml entries |
| `decisions/DEC-*.md` | → ensure ID in frontmatter + tracker.yaml entry |
| `PROJECT-TRACKER.md` (manual table) | → parsed into tracker.yaml (stories, statuses) |
| Story folders (S-NNN/) | → story + task entries in tracker.yaml |
| Loose audit/research files | → prompt for ID assignment (AUD-001, RES-001) |

After migration: old files either deleted or kept as generated views.
`knowledge-graph migrate --dry-run` shows what it would do.

For new projects: `knowledge-graph init` scaffolds from scratch.

### Implementation Order

1. Define canonical structure in templates/ (this repo)
2. Add `update`, `create`, `migrate`, `init` commands to knowledge-graph CLI
3. Update skills (sdlc implement, retro, project-plan) to use CLI commands
4. Move watchers from taiboli-app to mcp-servers/knowledge/
5. project-init skill scaffolds everything + asks PM preference
6. Validate on taiboli-app

### References

- [[concepts/agent-docs-system/ROADMAP.md]] — Phases 8.7, 9, D18, D19, D21
- [[concepts/knowledge-anchoring/PROBLEM.md]] — anchors join knowledge to code
- [[concepts/knowledge-anchoring/POC-RESULTS.md]] — POC passed, 6 items, zero false positives
