---
description: Documentation writing standards — modularity, ordering, diagrams, quality bar. Applies to markdown docs and READMEs.
paths:
  - "documentation/**"
  - "*.md"
---

# Documentation Standards

Documentation follows the same principles as code: **modular, logically ordered, concise, complete.**

## Modularity

- Split into focused chapters (50-300 lines each). One concern per file.
- README.md as entry point: 1-paragraph purpose, high-level diagram, reading order table.
- Chapter-based structure: numbered files linking prerequisites and next steps.

## Logical Ordering

- What must exist first comes first.
- Reading order = build order. Never encounter undefined concepts.

## Concise but Complete

- Every sentence earns its place. No filler.
- Diagram first, prose for context only.
- Tables over paragraphs for structured data.

## Mermaid Diagrams

Types: flowchart TD (pipelines), sequenceDiagram (multi-service), stateDiagram-v2 (lifecycles), erDiagram (data models).

- Never use custom `style` lines with `fill:` colors — invisible on dark themes.
- Use Mermaid defaults — they adapt to both themes.

## Reference Separation

- Source docs stay in `reference/`. Architecture docs interpret — never copy-paste.

## Module Documentation

Every module/provider directory has a README.md: purpose, key files, design decisions. Updated on every change.

## Quality Bar

A new team member reads top-to-bottom and gets full context without feeling lost.
