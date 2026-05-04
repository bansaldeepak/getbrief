---
name: documentation-standards
description: Documentation writing standards. Auto-applies when creating or editing markdown documentation, READMEs, architecture docs, or any .md files in documentation/ directories. Covers modularity, ordering, Mermaid diagrams, and quality bar.
---

# Documentation Standards

Documentation follows same principles as code: **modular, logically ordered, concise, complete.**

## Modularity — Small Focused Chapters

- Never write monolithic docs. Split into focused chapters (50-300 lines each).
- One concern per file.
- **README.md as entry point** — 1-paragraph purpose, high-level diagram, reading order table, glossary.
- **Chapter-based structure** — Numbered files (`01-setup.md`, `02-objects.md`...) linking prerequisites and next steps.

## Logical Dependency Ordering

- What must exist first comes first.
- Reading order = build order. Never encounter undefined concepts.

## Concise but Complete

- Every sentence earns its place. No filler.
- Diagram first, prose for context only. One concern per diagram. Label all edges.
- Tables over paragraphs for structured data.

## Mermaid Diagrams

**Types**: flowchart TD (pipelines/decisions), sequenceDiagram (multi-service), stateDiagram-v2 (lifecycles), erDiagram (data models).

**Styling rules**:
- Never use custom `style` lines with `fill:` colors — invisible on dark themes.
- Use Mermaid defaults — they adapt to both themes.
- Use `:::className` only for semantic distinction, not decoration.

## Reference Separation

- Source docs stay in `reference/`. Architecture docs interpret and visualize — never copy-paste.

## Quality Bar

A new team member reads top-to-bottom and gets full context without feeling lost.

## Module & Provider Documentation

Every module/provider directory has a `README.md` — purpose, key files, design decisions, related docs. Updated on every change.
