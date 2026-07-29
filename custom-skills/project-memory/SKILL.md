---
name: project-memory
description: Version-controlled project memory format. Auto-applies on any project, and whenever something needs to be remembered, recalled, or written down for a future session. Defines where memory lives (repo MEMORY.md + memory/), the file format, temporal validity, importance scoring, and the feature context.md files that completed work is flushed into.
---

# Project Memory — Version-Controlled

Every project keeps its memory **in the repo, not in a provider's config directory**. That makes it
git-tracked, diff-able, portable between agents, and visible to collaborators.

This skill defines the **format**. The curation procedure — reviewing, promoting, pruning — belongs to
`/memory-review` and the `self-improving` agent.

## The Three Files

| File | Role | Lifespan |
|------|------|----------|
| `MEMORY.md` (repo root) | Index + **active** context only | Continuously flushed |
| `memory/*.md` | One durable fact per file | Until stale or promoted |
| `documentation/**/context.md` | Per-feature implementation context | Permanent |

**`MEMORY.md` is a scratch pad, not an archive.** Keep it under **~40 lines**. When it grows past that,
the excess is either a durable fact (→ `memory/`), finished feature context (→ `context.md`), or noise
(→ delete). A long MEMORY.md is a symptom of a skipped flush, never of a rich project.

## 1. `MEMORY.md` — the index

Holds only: a one-line project orientation, pointers to `memory/` files, and context for the
**currently active** feature. Nothing about completed work.

## 2. `memory/` — durable facts

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

## 3. `context.md` — feature implementation context

Where finished feature knowledge lands when it leaves `MEMORY.md`.

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

## Provider Config: Pointer Only

Provider memory directories (`~/.claude/projects/<project>/memory/`, and equivalents) get a pointer
and nothing else:

```markdown
# Memory Pointer

All memory for this project lives in the repo — version-controlled and committed.

- **Index:** `MEMORY.md` at project root
- **Individual memories:** `memory/` in the project repo

Read those for full context. Do not duplicate memory content here.
```

If a host agent writes its own memory files there anyway, treat them as a **cache, not a source** —
the repo is authoritative. Fold anything valuable back into `memory/` and leave the pointer in place.

## Migration for Existing Projects

When a project has memory in a provider config but not in the repo:

1. Read everything from the provider location first
2. Create `MEMORY.md` at the project root
3. Split durable facts into `memory/<type>_<topic>.md`
4. Replace the provider content with the pointer above
5. Commit: `chore: migrate project memory to version control`

**Read everything before writing anything** — never lose context to a migration.

## Rules

- All memory writes go to the repo, never to a provider's config directory
- `MEMORY.md` stays under ~40 lines — it's a map of active work, not a dump
- One fact per `memory/` file; `MEMORY.md` links, it does not contain
- Update `updated:` whenever a memory file changes
- Don't record what the repo already says — code structure, git history, AGENTS.md, existing docs
- Stale memory is worse than no memory: prune actively, explain every deletion
- Commit memory changes alongside the work, or as a separate `chore:` commit
