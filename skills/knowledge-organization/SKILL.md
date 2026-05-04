---
name: knowledge-organization
description: Hierarchical knowledge organization inspired by mempalace. Auto-applies when creating research, outreach, documentation, or any structured knowledge across projects. Ensures cross-referencing, indexing, and nothing gets lost.
---

# Knowledge Organization

Applies to any project where structured knowledge accumulates over time — research, outreach, documentation, competitive analysis, meeting notes, etc.

**Core principle:** Store everything, make it findable, cross-reference so nothing is orphaned.

## Hierarchy (adapt naming to project context)

```
Wing    = Top-level domain (e.g., research/, outreach/, documentation/)
Room    = Topic within a wing (e.g., research/legal-tech-market/, research/fintech-compliance/)
Artifact = Individual file within a room (e.g., target-companies.md, use-cases.md)
```

Every wing that contains 2+ rooms MUST have an `INDEX.md` at the wing root.

## INDEX.md Convention

Each wing's `INDEX.md` is the **single source of truth** for what exists in that wing. Format:

```markdown
# [Wing Name] Index

## Registry
| ID | Topic | Directory | Key Contents | Used By | Status |
|----|-------|-----------|-------------|---------|--------|
| R-001 | ... | [link](./dir/) | ... | [link](../other/file.md) | Active/Stale |

## Cross-References
| Source | Target | Relationship | Status |
|--------|--------|-------------|--------|
| This research | That outreach file | Feeds targeting | Linked / NOT linked |
```

### Rules

1. **Before creating new research or knowledge:** Check the relevant INDEX.md. Don't duplicate.
2. **After creating any artifact:** Add it to the index. No orphan files.
3. **Cross-reference bidirectionally:** If research feeds outreach, both the research index AND the outreach file should reference each other.
4. **ID convention:** Use wing-appropriate prefixes — `R-001` for research, `O-001` for outreach batches, `D-001` for decisions, etc.
5. **Status tracking:** Every entry has a status: `Active`, `Stale` (>90 days no update), `Archived`, `Superseded by [ID]`.

## Cross-References (Tunnels)

When knowledge in one wing relates to another wing, create bidirectional links:

- **Forward link** (in source): "Used in [outreach/prospect-list-batch2.md](../outreach/prospect-list-batch2.md)"
- **Back link** (in target): "Research cross-ref: See [research/INDEX.md](../research/INDEX.md) — [R-001]"

### When to Cross-Reference

- Research that feeds outreach or proposals
- Decisions that affect architecture or strategy
- Meeting notes that spawn action items in other wings
- Any artifact that references another artifact

## Staleness Detection

When entering a project, scan indexes for entries older than 90 days without updates. Flag them to the user:

> "R-001 (Legal Tech Targets) was last updated 2026-03-12 — 29 days ago. Want me to check if it needs a refresh?"

## When This Skill Applies

Auto-apply when:
- Creating or modifying files in `research/`, `outreach/`, `documentation/`, or similar knowledge directories
- Building prospect lists, outreach batches, or campaign materials
- The user asks to organize, index, or find existing research
- Starting a new research effort (check what already exists first)

## Anti-Patterns

- **Orphan files:** A research file that exists but isn't in any index
- **One-way references:** Outreach uses research but research doesn't know about it
- **Duplicate research:** Same company researched in two places
- **Stale indexes:** Index doesn't reflect what actually exists in the directory
- **Over-engineering:** Don't create indexes for directories with 1-2 files. The threshold is 2+ rooms or 5+ artifacts.
