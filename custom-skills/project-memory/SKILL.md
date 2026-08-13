---
name: project-memory
description: "Version-controlled project memory format. Auto-applies when something needs to be remembered, recalled, or written down for a future session. Defines where memory lives, how to read it, how to write it, and the file formats."
---

# Project Memory

Memory lives **in the repo as structured files** — version-controlled, diff-able, portable. The
knowledge graph indexes these files for fast querying, but the files are always authoritative.

## Read vs Write Paths

```
READING memory:
  .project/knowledge.db exists?
    YES → Use knowledge MCP tools (knowledge_context, knowledge_search, knowledge_status)
    NO  → Read memory/ files and MEMORY.md directly

WRITING memory:
  ALWAYS write to structured files (memory/, decisions/, context.md, retro.md)
  These files are what the knowledge graph indexes — they must exist and be properly formatted
  regardless of whether a knowledge graph is set up
```

**Why files are always the source:** If the knowledge DB breaks or needs rebuilding, the files are
what it rebuilds from. The DB is a read-optimized index, not a primary store.

## Reading Memory (Knowledge Graph Available)

When `.project/knowledge.db` exists, **always use MCP tools first** — don't fall back to reading
`memory/` files manually:

| Need | Tool | Example |
|------|------|---------|
| Context for a file I'm editing | `knowledge_context` | `knowledge_context({path: "src/auth/login.ts"})` |
| Search for a past decision | `knowledge_search` | `knowledge_search({query: "auth middleware", type: "decisions"})` |
| What's active / open TODOs | `knowledge_status` | `knowledge_status()` or `knowledge_status({feature: "payments"})` |

## Reading Memory (No Knowledge Graph)

Read `MEMORY.md` for the index, then individual `memory/` files as needed.

## Writing Memory — Always to Files

Regardless of whether a knowledge graph exists, write to properly formatted files:

### `memory/` — durable facts

One fact per file, named `<type>_<topic>.md`:

```
memory/
  feedback_<topic>.md    # user corrections and confirmed approaches
  project_<topic>.md     # ongoing work, initiatives, constraints
  reference_<topic>.md   # pointers to external resources
  user_<topic>.md        # profile, preferences, working style
```

```markdown
---
name: <memory name>
description: <one line — this is what recall matches on>
type: feedback | project | reference | user
created: <date>
updated: <date>
valid_until: <date or "permanent">
importance: <1-5>
---

<content — for feedback and project, follow with **Why:** and **How to apply:** lines>
```

Convert relative dates to absolute when writing. Link related memories inline with `[[name]]`.

### Other write targets

| Content | Write to | Indexed as |
|---------|----------|-----------|
| Architectural decisions | `documentation/decisions/<name>.md` | decisions |
| Implementation gotchas | `documentation/stories/<feature>/context.md` | memory |
| Retro findings | `documentation/stories/<feature>/S-NNN/retro.md` | retro_findings |
| Open work items | `documentation/TODOS.md` or inline `// TODO:` | todos |
| Constraints on code | TRD / architecture docs (with file anchors) | constraints |

### Temporal validity

| Type | Default validity | Rationale |
|------|-----------------|-----------|
| **feedback** | permanent | Corrections don't expire |
| **project** | 30–90 days | Sprint goals and active initiatives go stale |
| **reference** | 6 months | External URLs move |
| **user** | permanent | Role and preferences are durable |

### Importance

| Score | Meaning | Example |
|-------|---------|---------|
| **5** | Wrong action causes damage | "Never drop tables in prod" |
| **4** | Significantly changes approach | "Prefers bundled PRs for refactors" |
| **3** | Saves time if remembered | "Board ID for the GitHub project" |
| **2** | Minor preference | "Likes terse responses" |
| **1** | Ephemeral | "Currently debugging auth flow" |

Expired + importance 1–2 are automatic prune candidates. Importance 4–5 are always re-validated
before removal, never dropped silently.

## `MEMORY.md` — Lightweight Index

`MEMORY.md` is **not a data store**. It's a short index that points elsewhere.

- **With knowledge graph:** A redirect explaining how to access memory (see template below)
- **Without knowledge graph:** An index of active context + pointers to `memory/` files. Under ~40 lines.

### MEMORY.md Template (Knowledge Graph Projects)

```markdown
# Memory

This project uses a knowledge graph as its primary memory read path.

**Read**: Use `knowledge_context`, `knowledge_search`, `knowledge_status` MCP tools.
**Write**: Always write to source files below — they feed the knowledge graph.
**Rebuild**: `npm run knowledge:build`

## Source files (where to write)

- `memory/` — durable facts (feedback, project, reference, user)
- `documentation/decisions/` — architectural decisions
- `documentation/stories/*/context.md` — implementation context
- `documentation/stories/*/retro.md` — retrospective findings
- `documentation/TODOS.md` — open work items

Do NOT bloat this file with memory entries. Write to the source files above.
```

### MEMORY.md Template (No Knowledge Graph)

```markdown
# Memory

One-line project orientation.

## Active Context
- [Current feature/work pointer]

## Durable Facts
- [topic](memory/type_topic.md) — one-line description
```

## `context.md` — Feature Implementation Context

Where finished feature knowledge lands when it leaves active memory.

| Feature has… | Location |
|--------------|----------|
| An architecture folder | `documentation/architecture/<feature>/context.md` |
| Only story folders | `documentation/stories/<feature>/context.md` |

**Belongs here:** implementation decisions not captured in a TRD or decision doc, gotchas (auth
quirks, DB edge cases, API surprises), patterns that emerged during the work, and scope cuts with
their rationale.

**Does not belong:** architecture design, API contracts, schema definitions, task tracking, or
decision trade-offs — all of those have their own homes.

```markdown
# <Feature> — Implementation Context

## Key Decisions
- **[Decision]**: [Why — one sentence, and what the alternative was]

## Non-obvious Patterns
- **[Pattern]**: [When it applies, code reference if helpful]

## Gotchas
- **[Gotcha]**: [What trips people up, how to avoid it]

## What We'd Do Differently
- [item]
```

**Flush at three moments:** during `/retro` (the feature just shipped), during `/memory-review`
(feature is inactive), and at the start of `/project-plan` (check the previous feature left nothing
behind). Commit separately: `docs(context): flush <feature> implementation context`.

## Memory Checkpoints (Mandatory)

Capture at three gates. If nothing's notable, say "No new memory at this checkpoint":

- **Post-planning** (PRD + TRD approved) — decisions, scope boundaries, rejected alternatives
- **Post-implementation** (tasks done, qa green) — gotchas, patterns that emerged, surprises
- **Post-ship** (merged / deployed) — what worked, what didn't, perf, user-feedback context

## Provider Config: Pointer Only

Provider memory directories (`~/.claude/projects/<project>/memory/`, and equivalents) get a pointer
and nothing else:

```markdown
# Memory Pointer

All memory for this project lives in the repo — version-controlled and committed.

- **Index:** `MEMORY.md` at project root
- **Individual memories:** `memory/` in the project repo
- **Knowledge graph:** `.project/knowledge.db` (if set up)

Read those for full context. Do not duplicate memory content here.
```

If a host agent writes its own memory files there anyway, treat them as a **cache, not a source** —
the repo is authoritative. Fold anything valuable back into `memory/` and leave the pointer in place.

## Migration for Existing Projects

When a project has memory in a provider config but not in the repo:

1. Read everything from the provider location first
2. Create `MEMORY.md` at the project root
3. Split durable facts into `memory/<type>_<topic>.md` with proper format
4. Replace the provider content with the pointer above
5. Commit: `chore: migrate project memory to version control`

**Read everything before writing anything** — never lose context to a migration.

## Rules

- **Read from knowledge graph first** — if `.project/knowledge.db` exists, use MCP tools for reads
- **Always write to files** — `memory/`, `decisions/`, `context.md`, `retro.md` with proper format
- Files are the source of truth; the knowledge DB is a read index rebuilt from them
- Never write memory to a provider's config directory
- `MEMORY.md` is a lightweight index/redirect — not a data dump, keep under ~40 lines
- One fact per `memory/` file; `MEMORY.md` links, it does not contain
- Update `updated:` whenever a memory file changes
- Don't record what the repo already says — code structure, git history, AGENTS.md, existing docs
- Stale memory is worse than no memory: prune actively, explain every deletion
- Commit memory changes alongside the work, or as a separate `chore:` commit
