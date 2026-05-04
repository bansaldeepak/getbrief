---
name: project-memory
description: Version-controlled project memory. Auto-applies on any project. Moves memory from Codex's ephemeral project config into the repo itself so it persists across sessions, is git-tracked, and visible to collaborators.
---

# Project Memory — Version-Controlled

Every project should have its memory **in the repo, not in Codex's config directory.** This makes memory git-tracked, diff-able, portable, and visible.

## Setup

When entering a project for the first time (or a project without this pattern), set up:

### 1. Project Root: `MEMORY.md`

The main memory index at the project root. Contains:
- Project overview (what, who, purpose)
- Key facts about the project and people involved
- Links to individual memory files in `memory/`
- Active feedback, rules, and references
- Working relationship notes (if applicable)

**This is the file Codex loads on every session.** Keep it under 200 lines — it's a map, not a dump.

### 2. Memory Directory: `memory/`

Individual memory files, one per topic. Naming convention:

```
memory/
  feedback_<topic>.md        # User corrections and confirmed approaches
  project_<topic>.md         # Ongoing work, initiatives, strategy context
  reference_<topic>.md       # Pointers to external resources
  user_<topic>.md            # User profile, preferences, working style
```

Each file has frontmatter:

```markdown
---
name: <memory name>
description: <one-line description>
type: feedback | project | reference | user
created: <date>
updated: <date>
valid_until: <date or "permanent"> # When this memory expires or needs review
importance: <1-5>                  # 5 = critical decision, 1 = nice-to-know
---

<content>
```

### Temporal Validity

Memories decay. Use `valid_until` to flag when a memory needs review:

| Type | Default validity | Examples |
|------|-----------------|----------|
| **feedback** | permanent | User corrections don't expire |
| **project** | 30-90 days | Sprint goals, active initiatives |
| **reference** | 6 months | External URLs may move or change |
| **user** | permanent | Role and preferences are durable |

During `/memory-review`, expired memories (past `valid_until`) get flagged for re-validation or pruning.

### Importance Scoring

Used by the self-improving agent to prioritize what stays and what gets pruned:

| Score | Meaning | Example |
|-------|---------|---------|
| **5** | Critical decision — wrong action causes damage | "Never drop tables in prod" |
| **4** | Key context — significantly changes approach | "User prefers bundled PRs for refactors" |
| **3** | Useful pattern — saves time if remembered | "Board ID for GitHub Projects: ..." |
| **2** | Minor preference — nice but not critical | "User likes terse responses" |
| **1** | Ephemeral — likely only useful short-term | "Currently debugging auth flow" |

During pruning, importance 1-2 memories past their `valid_until` are auto-candidates for removal. Importance 4-5 memories are always re-validated before removal.

### 3. Codex Project Config: Pointer Only

The Codex project-level memory file (`~/.Codex/projects/<project>/memory/MEMORY.md`) should contain ONLY a pointer:

```markdown
# Memory Pointer

All memory for this project lives in the repo — version-controlled and committed.

- **Index:** `MEMORY.md` at project root
- **Individual memories:** `memory/` directory in the project repo

Read those files for full context. Do not duplicate memory content here.
```

## Migration for Existing Projects

When entering a project that has memory in Codex's config but NOT in the repo:

1. Read the existing memory from `~/.Codex/projects/<project>/memory/MEMORY.md`
2. Create `MEMORY.md` at the project root with the content
3. Split individual memories into `memory/<type>_<topic>.md` files
4. Replace Codex config memory with the pointer (as above)
5. Commit the new files: `chore: migrate project memory to version control`

**Never lose context during migration.** Read everything first, write the new structure, then replace the pointer.

## Rules

1. **All memory writes go to the repo**, not to Codex's config directory
2. **Commit memory changes** alongside related work or as a separate `chore:` commit
3. **MEMORY.md is the index** — individual memories are files it links to. Don't dump everything into MEMORY.md.
4. **Keep MEMORY.md under 200 lines** — if it's growing, split content into individual files
5. **Update timestamps** — when modifying a memory file, update the `updated:` frontmatter field
6. **Prune actively** — remove memories that are no longer relevant. Stale memory is worse than no memory.
7. **Don't duplicate what's in code** — if it's in AGENTS.md, git history, or docs, don't also put it in memory

## When This Skill Applies

Auto-apply when:
- Entering any project for the first time
- The user asks to remember something
- The user asks about prior context or previous sessions
- Memory needs to be created, updated, or reviewed
- Starting a `/memory-review` or `/retro`

## Integration with Knowledge Organization

Memory and the knowledge-organization skill are complementary:
- **Memory** = cross-session context about the project, user, and working relationship
- **Knowledge organization** = structured research, outreach, and domain knowledge within the project
- Memory files go in `memory/`. Research and knowledge go in their respective wings (`research/`, `outreach/`, etc.)
- Don't put research findings in memory. Don't put session feedback in research indexes.
